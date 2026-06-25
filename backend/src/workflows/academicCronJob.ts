import * as cron from "node-cron";
import { studentDatastore } from "../datastores/studentDatastore";
import { generateStudyResources } from "../agents/academicCopilot";

export async function runNow(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[AcademicCronJob] Running manual deadline scan at ${timestamp}`);

  try {
    const upcomingTasks = await studentDatastore.getUpcomingTasks(7);
    const unprocessedTasks = upcomingTasks.filter(
      (task) => !task.recommended_materials || task.recommended_materials.length === 0
    );

    console.log(`[AcademicCronJob] Found ${unprocessedTasks.length} unprocessed tasks due within 7 days`);

    let processedCount = 0;
    for (const task of unprocessedTasks) {
      try {
        await generateStudyResources(task);
        processedCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[AcademicCronJob] Failed to generate plan for task ${task.taskId}:`, err);
      }
    }

    console.log(
      `[AcademicCronJob] Finished execution. Processed ${unprocessedTasks.length} tasks, updated ${processedCount} with new learning materials`
    );
  } catch (error) {
    console.error("[AcademicCronJob] Critical error during database scan:", error);
  }
}

export function startAcademicCronJob(): void {
  cron.schedule("0 8 * * *", async () => {
    await runNow();
  });
  console.log("[AcademicCronJob] Scheduled daily execution details set: runs at 08:00 AM local time");
}
