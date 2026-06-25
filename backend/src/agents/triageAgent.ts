import { z } from "zod";
import { TriageResult } from "../types";
import { studentDatastore, lemmaClient } from "../datastores/studentDatastore";
import { enterpriseDatastore } from "../datastores/enterpriseDatastore";

const triageSchema = z.object({
  target: z.enum(["student", "enterprise"]),
  payload: z.record(z.any()),
});

export async function processTranscript(rawText: string): Promise<TriageResult> {
  const systemPrompt = `You are an intelligent Triage Router embedded in a dual-mode productivity system.
Your job is to analyze raw transcribed text from audio files and do the following:

1. CLASSIFY: Determine if the content is "Academic" or "Professional". Base this on vocabulary,
   context cues (course names, professors, assignments vs. sprint tasks, clients, deadlines).

2. EXTRACT: Pull out all structured action items. For Academic content, extract:
   - Task type (Lecture, Assignment, Exam, Project)
   - Course name
   - Deadline (normalize to ISO 8601)
   - Any mentioned grade weight or score
   - Notes or key concepts

   For Professional content, extract:
   - Task name
   - Description / acceptance criteria
   - Owner (person responsible)
   - Priority signals (urgent, critical, low-priority)
   - Blocker mentions (anything that could cause a 'Blocked' status)
   - Estimated hours if mentioned

3. FORMAT: Output a single JSON object matching the target datastore schema exactly.
   Do not include fields you cannot determine — omit them or set to null.

4. ROUTE: Indicate which datastore to write to: "student" or "enterprise".

Respond ONLY with valid JSON. No commentary, no markdown fences.
Schema: { "target": "student" | "enterprise", "payload": { ...fields } }`;

  const inputPrompt = `Raw Transcript:\n"""\n${rawText}\n"""`;

  const conversation = await lemmaClient.agents.run("TriageAgent", `${systemPrompt}\n\n${inputPrompt}`);
  
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
    throw new Error("Timeout waiting for response from Lemma TriageAgent");
  }

  const cleanJsonText = assistantMsgText.replace(/```json|```/g, "").trim();
  const parsedData = triageSchema.parse(JSON.parse(cleanJsonText));

  if (parsedData.target === "student") {
    const payload = parsedData.payload;
    const taskInput = {
      type: payload.type || "Lecture",
      status: payload.status || "Pending",
      deadline: payload.deadline ? new Date(payload.deadline) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
      courseName: payload.courseName || "General Studies",
      gradeWeight: payload.gradeWeight !== undefined ? Number(payload.gradeWeight) : 0,
      currentScore: payload.currentScore !== undefined ? Number(payload.currentScore) : null,
      gpaPoints: payload.gpaPoints !== undefined ? Number(payload.gpaPoints) : null,
      notes: payload.notes || "",
    };

    const task = await studentDatastore.createTask(taskInput);
    return {
      target: "student",
      recordId: task.taskId,
      record: task,
    };
  } else {
    const payload = parsedData.payload;
    const taskInput = {
      taskName: payload.taskName || "Unnamed Sprint Task",
      description: payload.description || "",
      status: payload.status || "Open",
      owner: payload.owner || "Unassigned",
      priority: payload.priority || "Medium",
      estimatedHours: payload.estimatedHours !== undefined ? Number(payload.estimatedHours) : 0,
      billableHours: payload.billableHours !== undefined ? Number(payload.billableHours) : 0,
      blockerReason: payload.blockerReason || null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
    };

    const task = await enterpriseDatastore.createTask(taskInput);
    return {
      target: "enterprise",
      recordId: task.sprintId,
      record: task,
    };
  }
}
