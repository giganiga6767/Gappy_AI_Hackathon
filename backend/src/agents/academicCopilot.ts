import { z } from "zod";
import { StudentTask, CopilotResult } from "../types";
import { studentDatastore, lemmaClient } from "../datastores/studentDatastore";

const copilotSchema = z.object({
  study_plan: z.string(),
  recommended_materials: z.array(z.string()),
});

export async function generateStudyResources(task: StudentTask): Promise<CopilotResult> {
  const systemPrompt = `You are an Academic Proactive Copilot — a study strategist and research assistant embedded in
a student productivity system.

You receive a structured academic task object (JSON). Your job is to:

1. ANALYZE the task: understand the course domain, task type, and urgency based on deadline proximity.

2. GENERATE a tailored study strategy with concrete, actionable steps. Use universal pedagogical
   frameworks appropriate to the task type:
   - For Exams: Spaced repetition schedule, practice problem sets, concept mapping
   - For Assignments: Outline-first methodology, citation strategy, draft + review cadence
   - For Projects: Agile milestones, MVP scope definition, risk identification
   - For Lectures: Pre-reading, active note-taking methods (Cornell, Zettelkasten), review cycles

3. FIND high-quality learning resources:
   - YouTube: Search for highly-rated explainer videos specific to the courseName and topic.
     Format as { title, channelName, estimatedUrl, relevanceReason }
   - Academic Papers / Textbooks: Identify standard open-access resources (arXiv, OpenStax,
     MIT OpenCourseWare, Project Gutenberg for classics, Google Scholar pointers).
     Format as { title, authors, source, url, relevanceReason }
   - Practice Tools: Suggest relevant platforms (Khan Academy, Anki decks, LeetCode, etc.)

4. OUTPUT a JSON array of resource objects under the key "recommended_materials", plus a
   "study_plan" string (Markdown-formatted, concise).

Respond ONLY with valid JSON:
{ "study_plan": "...", "recommended_materials": [...] }`;

  const inputPrompt = `Task JSON:\n${JSON.stringify(task, null, 2)}`;

  const conversation = await lemmaClient.agents.run("AcademicProactiveCopilot", `${systemPrompt}\n\n${inputPrompt}`);

  let attempts = 0;
  let assistantMsgText = "";
  while (attempts < 15 && !assistantMsgText) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const messages = await lemmaClient.conversations.messages.list((conversation as any).id);
    const assistantMsg = messages.items.find(m => m.role === "assistant" && m.text);
    if (assistantMsg && assistantMsg.text) {
      assistantMsgText = assistantMsg.text;
    }
    attempts++;
  }

  if (!assistantMsgText) {
    throw new Error("Timeout waiting for response from Lemma AcademicProactiveCopilot");
  }

  const cleanJsonText = assistantMsgText.replace(/```json|```/g, "").trim();
  const parsedData = copilotSchema.parse(JSON.parse(cleanJsonText));

  await studentDatastore.appendMaterials(task.taskId, parsedData.recommended_materials);
  await studentDatastore.updateTask(task.taskId, {
    notes: `${task.notes}\n\n### Generated Study Plan\n${parsedData.study_plan}`,
  });

  return {
    taskId: task.taskId,
    study_plan: parsedData.study_plan,
    recommended_materials: parsedData.recommended_materials,
  };
}
