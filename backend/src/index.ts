import * as dotenv from "dotenv";
import { startIngestionWatcher } from "./workflows/ingestionWatcher";
import { startAcademicCronJob } from "./workflows/academicCronJob";
import { startEnterpriseUnblocker } from "./workflows/enterpriseUnblocker";
import { startServer } from "./api/server";

dotenv.config();

async function main() {
  console.log("====================================================");
  console.log(" DUAL-PERSONA WORK & STUDY WORKSPACE BACKEND BOOTING ");
  console.log("====================================================");

  try {
    startIngestionWatcher();
    startAcademicCronJob();
    startEnterpriseUnblocker();

    const PORT = Number(process.env.PORT || 4000);
    await startServer(PORT);

    console.log("====================================================");
    console.log(` Server and all event-driven engines running!`);
    console.log(" - Ingestion Watcher: ACTIVE");
    console.log(" - Academic Cron Job: ACTIVE");
    console.log(" - Enterprise Unblocker: ACTIVE");
    console.log(` Listening for requests on PORT: ${PORT}`);
    console.log("====================================================");
  } catch (error) {
    console.error("Critical error during backend bootstrap sequence:", error);
    process.exit(1);
  }
}

main();
