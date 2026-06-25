import { datastoreEvents } from "../datastores/enterpriseDatastore";
import { unblockTask } from "../agents/enterpriseSolutionArch";
import { EnterpriseTask } from "../types";

export function startEnterpriseUnblocker(): void {
  datastoreEvents.on("task:status_changed", async (eventData: {
    sprintId: string;
    oldStatus: string;
    newStatus: string;
    task: EnterpriseTask;
  }) => {
    if (eventData.newStatus === "Blocked") {
      console.log(
        `[EnterpriseUnblocker] Blocked task detected: "${eventData.task.taskName}" (${eventData.sprintId})`
      );

      try {
        const solutionResult = await unblockTask(eventData.task);
        const solutionTypes = solutionResult.solutions.map((s) => s.solutionType);
        console.log(
          `[EnterpriseUnblocker] Successfully appended ${solutionResult.solutions.length} solutions for ${eventData.sprintId}. Solution kinds: [${solutionTypes.join(", ")}]`
        );
      } catch (error) {
        console.error(
          `[EnterpriseUnblocker] Error generating unblocking architectures for task ${eventData.sprintId}:`,
          error
        );
      }
    }
  });

  console.log("[EnterpriseUnblockerWorkflow] Active status listener linked successfully");
}
