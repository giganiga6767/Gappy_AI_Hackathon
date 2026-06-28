import * as cron from "node-cron";
import * as fs from "fs-extra";
import * as path from "path";
import { lemmaClient } from "../datastores/studentDatastore";
import { callGemini } from "../lib/gemini";
import { getDbClient } from "../lib/nexusDb";

function getNexusRoot(): string {
  return process.env.NEXUSDESK_ROOT || path.resolve(process.cwd());
}

async function gatherDigestContext() {
  const client = getDbClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const coursesResult = await client.execute(
    "SELECT id, subject_code, name, min_attendance_pct FROM courses"
  );
  const attendanceResult = await client.execute("SELECT course_id, status FROM attendance");
  const tasksResult = await client.execute({
    sql: `SELECT id, title, priority, status, due_date FROM tasks
          WHERE due_date IS NOT NULL AND due_date >= ? AND due_date <= ?
          AND status != 'DONE'`,
    args: [todayStr, in7Days],
  });
  const gradesResult = await client.execute(
    "SELECT course_id, obtained_marks, max_marks FROM grades"
  );
  const overdueResult = await client.execute({
    sql: `SELECT id, title, priority, due_date FROM tasks
          WHERE due_date < ? AND status != 'DONE'
          ORDER BY due_date ASC LIMIT 3`,
    args: [todayStr],
  });

  const atRiskCourses: Array<{ subjectCode: string; name: string; effectivePct: number }> = [];
  for (const row of coursesResult.rows) {
    const course = row as unknown as { id: string; subject_code: string; name: string; min_attendance_pct: number };
    const records = (attendanceResult.rows as unknown as Array<{ course_id: string; status: string }>).filter(
      (r) => r.course_id === course.id
    );
    const attended = records.filter((r) => r.status === "ATTENDED").length;
    const missed = records.filter((r) => r.status === "MISSED" || r.status === "ABSENT").length;
    const total = attended + missed;
    const effectivePct = total === 0 ? 100 : Math.round((attended / total) * 1000) / 10;
    if (effectivePct < course.min_attendance_pct) {
      atRiskCourses.push({
        subjectCode: course.subject_code,
        name: course.name,
        effectivePct,
      });
    }
  }

  const tasksByPriority: Record<string, Array<{ title: string; dueDate: string | null }>> = {
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    CRITICAL: [],
  };
  for (const row of tasksResult.rows) {
    const t = row as unknown as { title: string; priority: string; due_date: string | null };
    const bucket = tasksByPriority[t.priority] || tasksByPriority.MEDIUM;
    bucket.push({ title: t.title, dueDate: t.due_date });
  }

  const gradeGaps: Array<{ subjectCode: string; name: string; currentPct: number; seeNeeded: number }> = [];
  for (const row of coursesResult.rows) {
    const course = row as unknown as { id: string; subject_code: string; name: string };
    const grades = (gradesResult.rows as unknown as Array<{ course_id: string; obtained_marks: number; max_marks: number }>).filter(
      (g) => g.course_id === course.id
    );
    const totalObtained = grades.reduce((s, g) => s + g.obtained_marks, 0);
    const totalMax = grades.reduce((s, g) => s + g.max_marks, 0);
    const currentPct = totalMax === 0 ? 0 : Math.round((totalObtained / totalMax) * 1000) / 10;
    const seeNeeded = Math.max(0, Math.round((40 - currentPct * 0.4) * 10) / 10);
    gradeGaps.push({ subjectCode: course.subject_code, name: course.name, currentPct, seeNeeded });
  }

  return {
    atRiskCourses,
    tasksByPriority,
    gradeGaps,
    overdueTasks: (overdueResult.rows as unknown as Array<{ title: string; due_date: string | null }>).map((t) => ({
      title: t.title,
      dueDate: t.due_date,
    })),
  };
}

async function generateDigestMarkdown(context: object): Promise<string> {
  const prompt = `You are an academic advisor. Generate a concise weekly digest for a student in clean markdown. Sections: 1) Attendance Alerts (list AT_RISK courses), 2) This Week's Priority Tasks (grouped HIGH/MEDIUM/LOW), 3) Grade Gaps (what score is needed per course to pass), 4) Top 3 Focus Recommendations. Be direct, no fluff. Output only markdown, no preamble.

Context:
${JSON.stringify(context, null, 2)}`;

  let assistantMsgText = "";
  try {
    const conversation = await lemmaClient.agents.run("weeklydigestagent", prompt);
    let attempts = 0;
    while (attempts < 15 && !assistantMsgText) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const messages = await lemmaClient.conversations.messages.list((conversation as { id: string }).id);
      const assistantMsg = messages.items.find((m) => m.role === "assistant" && m.text);
      if (assistantMsg?.text) assistantMsgText = assistantMsg.text;
      attempts++;
    }
  } catch {
    // Fall back to direct Gemini
  }

  if (!assistantMsgText) {
    assistantMsgText = await callGemini(prompt);
  }

  return assistantMsgText.replace(/```markdown|```/g, "").trim();
}

export async function runWeeklyDigest(): Promise<{ artifactId: string; date: string }> {
  const context = await gatherDigestContext();
  const markdown = await generateDigestMarkdown(context);
  const dateStr = new Date().toISOString().split("T")[0];
  const title = `Weekly Digest — ${dateStr}`;
  const client = getDbClient();
  const artifactId = crypto.randomUUID();
  const tags = JSON.stringify(["weekly-digest"]);

  await client.execute({
    sql: `INSERT INTO artifacts (id, title, type, content, tags, created_at, updated_at)
          VALUES (?, ?, 'REPORT', ?, ?, ?, ?)`,
    args: [artifactId, title, markdown, tags, Date.now(), Date.now()],
  });

  const notesDir = path.join(getNexusRoot(), "recordings", "notes");
  await fs.ensureDir(notesDir);
  const filePath = path.join(notesDir, `weekly_digest_${dateStr}.md`);
  await fs.writeFile(filePath, markdown, "utf-8");

  console.log(`[WeeklyDigestWorkflow] Saved digest artifact ${artifactId} to ${filePath}`);
  return { artifactId, date: dateStr };
}

export function startWeeklyDigestWorkflow(): void {
  cron.schedule("0 20 * * 0", async () => {
    try {
      await runWeeklyDigest();
    } catch (err) {
      console.error("[WeeklyDigestWorkflow] Cron execution failed:", err);
    }
  });
  console.log("[WeeklyDigestWorkflow] Scheduled: runs every Sunday at 8:00 PM");
}
