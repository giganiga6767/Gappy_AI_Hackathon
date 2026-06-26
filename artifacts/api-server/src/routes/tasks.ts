import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { resolveGeminiApiKey } from "../lib/utils";

const router = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const { category, status } = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (category) conditions.push(eq(tasksTable.category, category));
  if (status) conditions.push(eq(tasksTable.status, status));

  const rows = await db.select().from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);
  res.json(rows);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const { title, description, dueDate, category, priority, tags, linkedCourseId, linkedProjectId } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: "title, category required" });
    return;
  }
  const [row] = await db.insert(tasksTable).values({
    title,
    category,
    ...(description && { description }),
    ...(dueDate && { dueDate }),
    priority: priority ?? "MEDIUM",
    tags: tags ?? [],
    ...(linkedCourseId && { linkedCourseId }),
    ...(linkedProjectId && { linkedProjectId }),
  }).returning();
  res.status(201).json(row);
});

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.taskId)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const { title, description, dueDate, status, category, priority, tags } = req.body;
  const [row] = await db.update(tasksTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate }),
      ...(status && { status }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(tags !== undefined && { tags }),
    })
    .where(eq(tasksTable.id, req.params.taskId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  await db.delete(tasksTable).where(eq(tasksTable.id, req.params.taskId));
  res.status(204).end();
});

router.post("/tasks/:taskId/copilot", async (req, res): Promise<void> => {
  const { taskId } = req.params;
  const { apiKey } = req.body;

  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const geminiApiKey = resolveGeminiApiKey(apiKey);
    if (!geminiApiKey) {
      res.status(400).json({ error: "Gemini API key is required." });
      return;
    }

    let courseInfo = "";
    if (task.linkedCourseId) {
      const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, task.linkedCourseId)).limit(1);
      if (course) {
        courseInfo = `Course: ${course.subjectCode} - ${course.name}`;
      }
    }

    const prompt = `You are an Academic Proactive Copilot — a study strategist and research assistant embedded in a student productivity system.
Analyze the following task and generate a tailored study strategy and recommended learning resources:

Task Title: ${task.title}
Task Description: ${task.description || "N/A"}
Category: ${task.category}
Priority: ${task.priority}
Due Date: ${task.dueDate || "N/A"}
${courseInfo}

Your output must consist of 2 main things:
1. studyPlan: A step-by-step, highly actionable study plan written in concise markdown. Use Pedagogical frameworks like Spaced Repetition (for exams), Outline-First/Draft-Review (for assignments), or Agile milestones (for projects). Keep it specific to the course topics mentioned.
2. recommendedMaterials: A list of 2-4 high-quality recommended learning resources (YouTube videos, textbook/open-access links, online tools). For each, specify:
   - title: Name of resource
   - type: "VIDEO" | "NOTE" | "LINK"
   - url: A valid placeholder or standard URL (e.g. YouTube Search link, OpenStax, Google Scholar search link)
   - reason: Why this resource is relevant to the task

Respond ONLY with a valid JSON object matching this schema (do NOT wrap in markdown block, do not write any additional text):
{
  "studyPlan": "...",
  "recommendedMaterials": [
    { "title": "...", "type": "VIDEO" | "NOTE" | "LINK", "url": "...", "reason": "..." }
  ]
}`;

    const rawResponse = await callGemini(prompt, geminiApiKey);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not parse JSON from LLM: ${rawResponse}`);
    }
    const result = JSON.parse(jsonMatch[0]);

    const [updatedTask] = await db.update(tasksTable)
      .set({
        studyPlan: result.studyPlan,
        studyMaterials: JSON.stringify(result.recommendedMaterials),
        updatedAt: new Date(),
      })
      .where(eq(tasksTable.id, taskId))
      .returning();

    res.json(updatedTask);
  } catch (err: any) {
    console.error("Task Copilot error:", err);
    res.status(500).json({ error: "Failed to generate study plan", details: err.message });
  }
});

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: Error | null = null;

  for (const model of models) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const parts = [{ text: prompt }];

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(180000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${model}): ${response.status} - ${errorText}`);
        }

        const data = await response.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error(`Empty response from Gemini API (${model})`);
        }
        return text.trim();
      } catch (err: any) {
        lastError = err;
        attempts++;
        if (err.name === "TimeoutError" || (err.message && (err.message.includes("503") || err.message.includes("429") || err.message.includes("timeout")))) {
          console.warn(`Gemini model ${model} temporary error or timeout (attempt ${attempts}/${maxAttempts}): ${err.message}. Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        } else {
          break;
        }
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

export default router;
