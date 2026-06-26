import { lemmaClient } from "../datastores/studentDatastore";
import { callGemini, parseGeminiJson } from "../lib/gemini";
import { ensureColumn, getDbClient } from "../lib/nexusDb";

export interface TriageChange {
  id: string;
  title: string;
  oldPriority: string;
  newPriority: string;
  newStatus: string;
  rationale: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  linked_course_id: string | null;
}

interface CourseRow {
  id: string;
  subject_code: string;
  name: string;
  min_attendance_pct: number;
}

interface TriageProposal {
  id: string;
  newPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  newStatus: "TODO" | "IN_PROGRESS" | "BLOCKED";
  rationale: string;
}

async function gatherTriageContext() {
  const client = getDbClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const tasksResult = await client.execute(
    `SELECT id, title, status, priority, due_date, linked_course_id FROM tasks
     WHERE status IN ('TODO', 'BLOCKED')`
  );
  const coursesResult = await client.execute(
    "SELECT id, subject_code, name, min_attendance_pct FROM courses"
  );
  const attendanceResult = await client.execute("SELECT course_id, status FROM attendance");
  const examsResult = await client.execute({
    sql: `SELECT id, title, start_time, course_id FROM events
          WHERE type = 'EXAM' AND is_cancelled = 0 AND start_time >= ?
          ORDER BY start_time ASC LIMIT 3`,
    args: [Date.now()],
  });

  const courses = coursesResult.rows as unknown as CourseRow[];
  const atRiskCourses = courses
    .map((course) => {
      const records = (attendanceResult.rows as unknown as Array<{ course_id: string; status: string }>).filter(
        (r) => r.course_id === course.id
      );
      const attended = records.filter((r) => r.status === "ATTENDED").length;
      const missed = records.filter((r) => r.status === "MISSED" || r.status === "ABSENT").length;
      const total = attended + missed;
      const pct = total === 0 ? 100 : (attended / total) * 100;
      return { ...course, effectivePct: pct, isAtRisk: pct < course.min_attendance_pct };
    })
    .filter((c) => c.isAtRisk);

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const tasks = (tasksResult.rows as unknown as TaskRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    courseName: t.linked_course_id ? courseMap.get(t.linked_course_id)?.name ?? null : null,
    isOverdue: t.due_date ? t.due_date < todayStr && t.status === "TODO" : false,
  }));

  return {
    tasks,
    upcomingExams: (examsResult.rows as unknown as Array<{ title: string; start_time: number }>).map((e) => ({
      title: e.title,
      date: new Date(Number(e.start_time)).toISOString().split("T")[0],
    })),
    atRiskCourses: atRiskCourses.map((c) => ({
      subjectCode: c.subject_code,
      name: c.name,
      effectivePct: Math.round(c.effectivePct * 10) / 10,
    })),
  };
}

async function callTriageGemini(context: object): Promise<TriageProposal[]> {
  const prompt = `You are a student productivity assistant. Given these tasks, upcoming exams, and attendance risks, re-prioritize each task. For overdue tasks still marked TODO change status to BLOCKED. Return ONLY a valid JSON array, one object per task, with fields: id (string), newPriority (LOW|MEDIUM|HIGH|CRITICAL), newStatus (TODO|IN_PROGRESS|BLOCKED), rationale (string, max 20 words). No preamble, no markdown, no backticks.

Context:
${JSON.stringify(context, null, 2)}`;

  let assistantMsgText = "";
  try {
    const conversation = await lemmaClient.agents.run("BacklogTriageAgent", prompt);
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

  try {
    const parsed = parseGeminiJson<TriageProposal[]>(assistantMsgText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[BacklogTriageAgent] JSON parse failed:", err);
    return [];
  }
}

async function buildChanges(proposals: TriageProposal[]): Promise<TriageChange[]> {
  const client = getDbClient();
  const changes: TriageChange[] = [];

  for (const proposal of proposals) {
    const result = await client.execute({
      sql: "SELECT id, title, priority, status FROM tasks WHERE id = ?",
      args: [proposal.id],
    });
    const task = result.rows[0] as unknown as { id: string; title: string; priority: string; status: string } | undefined;
    if (!task) continue;

    changes.push({
      id: task.id,
      title: task.title,
      oldPriority: task.priority,
      newPriority: proposal.newPriority,
      newStatus: proposal.newStatus,
      rationale: proposal.rationale,
    });
  }

  return changes;
}

export async function previewTriage(): Promise<TriageChange[]> {
  const context = await gatherTriageContext();
  const proposals = await callTriageGemini(context);
  return buildChanges(proposals);
}

export async function applyTriage(): Promise<{ updated: number; changes: TriageChange[] }> {
  await ensureColumn("tasks", "triageNote", "TEXT");

  const context = await gatherTriageContext();
  const proposals = await callTriageGemini(context);
  const changes = await buildChanges(proposals);
  const client = getDbClient();

  for (const change of changes) {
    const proposal = proposals.find((p) => p.id === change.id);
    if (!proposal) continue;
    await client.execute({
      sql: `UPDATE tasks SET priority = ?, status = ?, triageNote = ?, updated_at = ? WHERE id = ?`,
      args: [proposal.newPriority, proposal.newStatus, proposal.rationale, Date.now(), change.id],
    });
  }

  return { updated: changes.length, changes };
}
