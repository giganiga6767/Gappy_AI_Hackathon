import { lemmaClient } from "../datastores/studentDatastore";
import { callGemini, parseGeminiJson } from "../lib/gemini";
import { getDbClient, tagsContain } from "../lib/nexusDb";

export interface StudyPlanItem {
  date: string;
  subject: string;
  topic: string;
  task: string;
  rationale: string;
}

interface ExamRow {
  id: string;
  title: string;
  start_time: number;
  course_id: string | null;
}

interface CourseRow {
  id: string;
  subject_code: string;
  name: string;
  short_name: string;
  min_attendance_pct: number;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface GradeRow {
  course_id: string;
  label: string;
  obtained_marks: number;
  max_marks: number;
}

async function gatherContext() {
  const client = getDbClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const examsResult = await client.execute({
    sql: `SELECT id, title, start_time, course_id FROM events
          WHERE type = 'EXAM' AND is_cancelled = 0
          AND start_time >= ? AND start_time <= ?
          ORDER BY start_time ASC`,
    args: [now.getTime(), in30Days.getTime()],
  });

  const coursesResult = await client.execute("SELECT id, subject_code, name, short_name, min_attendance_pct FROM courses");
  const tasksResult = await client.execute(
    `SELECT id, title, status, priority, due_date FROM tasks
     WHERE status IN ('TODO', 'IN_PROGRESS')`
  );
  const gradesResult = await client.execute(
    "SELECT course_id, label, obtained_marks, max_marks FROM grades"
  );
  const attendanceResult = await client.execute(
    "SELECT course_id, status FROM attendance"
  );

  const courses = coursesResult.rows as unknown as CourseRow[];
  const exams = examsResult.rows as unknown as ExamRow[];

  const courseStats = courses.map((course) => {
    const records = (attendanceResult.rows as unknown as Array<{ course_id: string; status: string }>).filter(
      (r) => r.course_id === course.id
    );
    const attended = records.filter((r) => r.status === "ATTENDED").length;
    const missed = records.filter((r) => r.status === "MISSED" || r.status === "ABSENT").length;
    const total = attended + missed;
    const attendancePct = total === 0 ? 100 : Math.round((attended / total) * 1000) / 10;
    const grades = (gradesResult.rows as unknown as GradeRow[]).filter((g) => g.course_id === course.id);
    return {
      id: course.id,
      subjectCode: course.subject_code,
      name: course.name,
      shortName: course.short_name,
      attendancePct,
      minAttendancePct: course.min_attendance_pct,
      grades,
    };
  });

  return {
    today: todayStr,
    exams: exams.map((e) => ({
      title: e.title,
      date: new Date(Number(e.start_time)).toISOString().split("T")[0],
      courseId: e.course_id,
    })),
    courses: courseStats,
    openTasks: (tasksResult.rows as unknown as TaskRow[]).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
    })),
  };
}

async function callStudyPlannerGemini(context: object): Promise<StudyPlanItem[]> {
  const prompt = `You are an academic planner. Given the student's exam schedule, current grades, and open tasks, generate a day-by-day study plan from today until the nearest exam. For each day assign 1–2 subjects to revise, identify the weak topic based on grade gaps, and suggest one specific task to complete. Output ONLY a valid JSON array of objects with fields: date (YYYY-MM-DD), subject (string), topic (string), task (string), rationale (string). No preamble, no markdown, no backticks.

Context:
${JSON.stringify(context, null, 2)}`;

  let assistantMsgText = "";

  try {
    const conversation = await lemmaClient.agents.run("studyplanneragent", prompt);
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
    const parsed = parseGeminiJson<StudyPlanItem[]>(assistantMsgText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[StudyPlannerAgent] JSON parse failed:", err);
    return [];
  }
}

function matchCourseId(subject: string, courses: CourseRow[]): string | null {
  const lower = subject.toLowerCase();
  const match = courses.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase()) ||
      c.subject_code.toLowerCase() === lower ||
      c.short_name.toLowerCase() === lower ||
      lower.includes(c.short_name.toLowerCase())
  );
  return match?.id ?? null;
}

function computePriority(planDate: string, exams: ExamRow[]): string {
  const planTime = new Date(planDate + "T12:00:00").getTime();
  let minDays = Infinity;
  for (const exam of exams) {
    const examTime = Number(exam.start_time);
    const days = Math.ceil((examTime - planTime) / (24 * 60 * 60 * 1000));
    if (days >= 0) minDays = Math.min(minDays, days);
  }
  if (minDays <= 3) return "CRITICAL";
  if (minDays <= 7) return "HIGH";
  return "MEDIUM";
}

export async function previewStudyPlan(): Promise<StudyPlanItem[]> {
  const context = await gatherContext();
  return callStudyPlannerGemini(context);
}

export async function applyStudyPlan(): Promise<{ tasksCreated: number; plan: StudyPlanItem[] }> {
  const client = getDbClient();
  const context = await gatherContext();
  const plan = await callStudyPlannerGemini(context);

  const coursesResult = await client.execute("SELECT id, subject_code, name, short_name FROM courses");
  const courses = coursesResult.rows as unknown as CourseRow[];

  const examsResult = await client.execute({
    sql: `SELECT id, title, start_time, course_id FROM events
          WHERE type = 'EXAM' AND is_cancelled = 0 AND start_time >= ? ORDER BY start_time ASC`,
    args: [Date.now()],
  });
  const exams = examsResult.rows as unknown as ExamRow[];

  const existingTasks = await client.execute(
    `SELECT id, tags, status FROM tasks WHERE status = 'TODO'`
  );
  for (const row of existingTasks.rows) {
    const r = row as unknown as { id: string; tags: unknown; status: string };
    if (tagsContain(r.tags, "ai-study-plan")) {
      await client.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [r.id] });
    }
  }

  let tasksCreated = 0;
  for (const item of plan) {
    if (!item.date || !item.task) continue;
    const courseId = matchCourseId(item.subject || "", courses);
    const priority = computePriority(item.date, exams);
    const tags = JSON.stringify(["ai-study-plan"]);

    await client.execute({
      sql: `INSERT INTO tasks (id, title, due_date, category, priority, status, tags, linked_course_id, created_at, updated_at)
            VALUES (?, ?, ?, 'ACADEMICS', ?, 'TODO', ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        item.task,
        item.date,
        priority,
        tags,
        courseId,
        Date.now(),
        Date.now(),
      ],
    });
    tasksCreated++;
  }

  return { tasksCreated, plan };
}

export function getUniqueSubjectTopics(plan: StudyPlanItem[]): Array<{ subject: string; topic: string; courseId: string | null }> {
  const seen = new Set<string>();
  const pairs: Array<{ subject: string; topic: string; courseId: string | null }> = [];
  for (const item of plan) {
    const key = `${item.subject}::${item.topic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ subject: item.subject, topic: item.topic, courseId: null });
  }
  return pairs;
}

export async function enrichSubjectTopicsWithCourseIds(
  pairs: Array<{ subject: string; topic: string; courseId: string | null }>
): Promise<Array<{ subject: string; topic: string; courseId: string }>> {
  const client = getDbClient();
  const coursesResult = await client.execute("SELECT id, subject_code, name, short_name FROM courses");
  const courses = coursesResult.rows as unknown as CourseRow[];
  const enriched: Array<{ subject: string; topic: string; courseId: string }> = [];
  for (const pair of pairs) {
    const courseId = matchCourseId(pair.subject, courses);
    if (courseId) enriched.push({ ...pair, courseId });
  }
  return enriched;
}
