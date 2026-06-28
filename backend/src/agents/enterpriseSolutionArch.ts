import { z } from "zod";
import { EnterpriseTask, UnblockerResult } from "../types";
import { enterpriseDatastore } from "../datastores/enterpriseDatastore";
import { lemmaClient } from "../datastores/studentDatastore";

const solutionSchema = z.object({
  solutions: z.array(
    z.object({
      solutionType: z.enum([
        "code_snippet",
        "framework_recommendation",
        "sop_template",
        "resource_link",
      ]),
      title: z.string(),
      content: z.string(),
      sourceUrls: z.array(z.string()),
    })
  ),
});

export async function unblockTask(task: EnterpriseTask): Promise<UnblockerResult> {
  const systemPrompt = `You are an Enterprise Solution Architect — an expert engineering and project management consultant
embedded in a professional productivity system.

You receive a blocked task object (JSON) including the taskName, description, and blockerReason.
Your job is to generate 2-4 concrete, immediately actionable solutions. For each solution:

1. DIAGNOSE the blocker type:
   - Technical (code bug, architecture decision, dependency conflict)
   - Process (unclear requirements, missing approval, resource unavailability)
   - Knowledge (team lacks expertise in a specific technology or domain)

2. PRESCRIBE solutions appropriate to the blocker type:
   - For Technical blockers: Provide a code snippet, library recommendation, or architectural
     pattern with a working example. Cite Stack Overflow, official docs, or GitHub issues.
   - For Process blockers: Provide an SOP template, RACI matrix snippet, or escalation script.
     Reference frameworks like ITIL, SAFe, or PMBOK where applicable.
   - For Knowledge blockers: Recommend specific documentation, internal wiki patterns,
     or training resources. Suggest pairing session structure or spike task definition.

3. FORMAT each solution as:
   {
     "solutionType": "code_snippet" | "framework_recommendation" | "sop_template" | "resource_link",
     "title": "...",
     "content": "...(Markdown)...",
     "sourceUrls": ["..."]
   }

Respond ONLY with valid JSON: { "solutions": [...] }
Do not include solutions you are not confident about. Quality over quantity.`;

  const inputPrompt = `Blocked Task JSON:\n${JSON.stringify(task, null, 2)}`;

  const conversation = await lemmaClient.agents.run("enterprisesolutionarchitect", `${systemPrompt}\n\n${inputPrompt}`);

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
    throw new Error("Timeout waiting for response from Lemma EnterpriseSolutionArchitect");
  }

  const cleanJsonText = assistantMsgText.replace(/```json|```/g, "").trim();
  const parsedData = solutionSchema.parse(JSON.parse(cleanJsonText));

  for (const sol of parsedData.solutions) {
    await enterpriseDatastore.appendAISolution(task.sprintId, sol);
  }

  return {
    sprintId: task.sprintId,
    solutions: parsedData.solutions,
  };
}
