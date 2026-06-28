import { lemmaClient } from "../datastores/studentDatastore";
import { callGemini, parseGeminiJson } from "../lib/gemini";
import { ensureColumn, getDbClient } from "../lib/nexusDb";

export interface ResourceRecommendation {
  title: string;
  url: string;
  type: "LINK" | "VIDEO" | "PDF";
  description: string;
  topic: string;
}

export interface ResourceResult {
  added: number;
  resources: Array<ResourceRecommendation & { id?: string; courseId: string }>;
}

interface CourseRow {
  id: string;
  subject_code: string;
  name: string;
  faculty_name: string | null;
}

async function gatherCourseContext(courseId: string, topic?: string) {
  const client = getDbClient();
  const courseResult = await client.execute({
    sql: "SELECT id, subject_code, name, faculty_name FROM courses WHERE id = ?",
    args: [courseId],
  });
  const course = courseResult.rows[0] as unknown as CourseRow | undefined;
  if (!course) throw new Error("Course not found");

  const artifactsResult = await client.execute({
    sql: "SELECT title FROM artifacts WHERE linked_course_id = ?",
    args: [courseId],
  });

  return {
    courseId: course.id,
    courseName: course.name,
    subjectCode: course.subject_code,
    facultyName: course.faculty_name,
    artifactTitles: (artifactsResult.rows as unknown as Array<{ title: string }>).map((a) => a.title),
    topic: topic || "general course revision",
  };
}

async function callResourceGemini(context: {
  subjectCode: string;
  courseName: string;
  topic: string;
  facultyName: string | null;
  artifactTitles: string[];
}): Promise<ResourceRecommendation[]> {
  const prompt = `You are an academic resource curator. For a student studying ${context.subjectCode} — ${context.courseName}, topic: ${context.topic}, recommend 4 high-quality learning resources. Mix: 1 YouTube video, 1 documentation or textbook link, 1 practice problem set or quiz, 1 summarized explanation source. Return ONLY a valid JSON array with fields: title (string), url (string), type (LINK|VIDEO|PDF), description (string, max 15 words), topic (string). No preamble, no markdown, no backticks.

Faculty: ${context.facultyName || "N/A"}
Existing materials: ${context.artifactTitles.join(", ") || "None"}`;

  let assistantMsgText = "";
  try {
    const conversation = await lemmaClient.agents.run("resourcerecommenderagent", prompt);
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
    const parsed = parseGeminiJson<ResourceRecommendation[]>(assistantMsgText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[ResourceRecommenderAgent] JSON parse failed:", err);
    return [];
  }
}

export async function previewResources(
  courseId: string,
  topic?: string
): Promise<ResourceRecommendation[]> {
  const context = await gatherCourseContext(courseId, topic);
  return callResourceGemini(context);
}

export async function applyResources(
  courseId: string,
  topic?: string
): Promise<ResourceResult> {
  await ensureColumn("resources", "description", "TEXT");
  await ensureColumn("resources", "source", "TEXT");

  const context = await gatherCourseContext(courseId, topic);
  const recommendations = await callResourceGemini(context);
  const client = getDbClient();
  const inserted: ResourceResult["resources"] = [];
  let added = 0;

  for (const rec of recommendations) {
    if (!rec.url || !rec.title) continue;

    const existing = await client.execute({
      sql: "SELECT id FROM resources WHERE course_id = ? AND url = ?",
      args: [courseId, rec.url],
    });
    if (existing.rows.length > 0) continue;

    const id = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO resources (id, title, url, type, course_id, description, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ai', ?)`,
      args: [
        id,
        rec.title,
        rec.url,
        rec.type || "LINK",
        courseId,
        rec.description || "",
        Date.now(),
      ],
    });
    inserted.push({ ...rec, id, courseId });
    added++;
  }

  return { added, resources: inserted };
}
