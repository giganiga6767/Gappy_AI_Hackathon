import * as chokidar from "chokidar";
import * as fs from "fs-extra";
import * as path from "path";
import { processTranscript } from "../agents/triageAgent";

const TRANSCRIPTS_DIR = path.resolve("./transcripts");
const PROCESSED_DIR = path.join(TRANSCRIPTS_DIR, "processed");
const FAILED_DIR = path.join(TRANSCRIPTS_DIR, "failed");

async function handleNewFile(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  if (!filename.endsWith(".txt")) return;

  console.log(`[IngestionWatcher] Processing: ${filename}`);

  try {
    const rawText = await fs.readFile(filePath, "utf-8");
    if (!rawText.trim()) {
      throw new Error("Transcript file is empty");
    }

    const triageResult = await processTranscript(rawText);
    console.log(
      `[IngestionWatcher] Successfully routed ${filename} to ${triageResult.target} datastore. Created record ID: ${triageResult.recordId}`
    );

    const destPath = path.join(PROCESSED_DIR, filename);
    await fs.move(filePath, destPath, { overwrite: true });
  } catch (error: any) {
    console.error(`[IngestionWatcher] Error processing file ${filename}:`, error);
    try {
      const destPath = path.join(FAILED_DIR, filename);
      await fs.move(filePath, destPath, { overwrite: true });
    } catch (moveError) {
      console.error(`[IngestionWatcher] Failed to move broken file to failed folder:`, moveError);
    }
  }
}

export function startIngestionWatcher(): void {
  fs.ensureDirSync(TRANSCRIPTS_DIR);
  fs.ensureDirSync(PROCESSED_DIR);
  fs.ensureDirSync(FAILED_DIR);

  console.log(`[IngestionWatcher] Bootstrapping directory scan on ${TRANSCRIPTS_DIR}...`);

  fs.readdirSync(TRANSCRIPTS_DIR).forEach((file) => {
    const fullPath = path.join(TRANSCRIPTS_DIR, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith(".txt")) {
      handleNewFile(fullPath);
    }
  });

  const watcher = chokidar.watch(TRANSCRIPTS_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 0,
  });

  watcher.on("add", (filePath) => {
    handleNewFile(filePath);
  });

  console.log(`[IngestionWatcher] Successfully started watching folder: ${TRANSCRIPTS_DIR}`);
}
