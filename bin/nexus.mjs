#!/usr/bin/env node
import { db } from "../lib/db/src/index.js";
import { semestersTable, coursesTable, eventsTable, tasksTable, resourcesTable, inboxTable } from "../lib/db/src/schema/index.js";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";

const WORKSPACE_DIR = "/home/niranjan/Desktop/Gappy_AI_Hackathon";
const RECORDINGS_DIR = path.join(WORKSPACE_DIR, "recordings");
const AUDIO_DIR = path.join(RECORDINGS_DIR, "audio");
const NOTES_DIR = path.join(RECORDINGS_DIR, "notes");

// Ensure directories exist
[RECORDINGS_DIR, AUDIO_DIR, NOTES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function showHelp() {
  console.log(`
NexusDesk AI Academic Desk CLI
Usage: nexus <command> [options]

Commands:
  capture               Capture inputs (text, files, or live recordings) into the Inbox.
    Options:
      --text "<content>"        Capture raw text/syllabus paste.
      --file <path>             Capture a local PDF, image, audio, or notes file.
      --type <text|audio|image|pdf>  Specify the type of capture explicitly.
      --title "<title>"         Give the capture a custom name.
      --record                  Interactively record live microphone audio.
      --system                  Use system audio loopback (for Zoom, YouTube, Meetings).

  import <file>         Alias for capture --file <file>. Copies and queues the file in the Inbox.

    Options:
      --title "<title>"         Specify custom title for the imported file.
      --type <type>             Specify type explicitly (audio, image, pdf, notes).

  export <format>       Export semester data, calendar, notes, actions, and media.
    Options:
      zip | all                 Export all assets compressed into "semester.zip" (Zero Lock-In).
      ics                       Export academic calendar as "calendar.ics".
      json                      Export academic metadata as JSON files.
      md                        Export progress summary as "summary.md".
  `);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case "capture": {
      const textIdx = args.indexOf("--text");
      const fileIdx = args.indexOf("--file");
      const typeIdx = args.indexOf("--type");
      const titleIdx = args.indexOf("--title");
      const shouldRecord = args.includes("--record");

      const rawText = textIdx !== -1 ? args[textIdx + 1] : null;
      const filePathArg = fileIdx !== -1 ? args[fileIdx + 1] : null;
      let type = typeIdx !== -1 ? args[typeIdx + 1] : null;
      let title = titleIdx !== -1 ? args[titleIdx + 1] : null;

      if (!shouldRecord && !rawText && !filePathArg) {
        console.error("Error: Must specify either --record, --text, or --file.");
        return;
      }

      if (shouldRecord) {
        type = "recording";
        if (!title) title = `Voice Capture ${new Date().toLocaleString()}`;
        console.log(`🎙️  Starting Audio Recording Session: ${title}`);
        const sessionName = title.replace(/\s+/g, "_");
        const wavFile = path.join(AUDIO_DIR, `${sessionName}.wav`);
        const mp3File = path.join(AUDIO_DIR, `${sessionName}.mp3`);

        const isSystem = args.includes("--system");
        let cmd = "arecord";
        let cmdArgs = ["-f", "S16_LE", "-c", "1", "-r", "16000", wavFile];

        if (isSystem) {
          console.log("🖥️  System Loopback Active: Recording Zoom, YouTube, or Online Meeting audio.");
          try {
            execSync("which parecord", { stdio: "ignore" });
            cmd = "parecord";
            cmdArgs = ["-d", "@DEFAULT_MONITOR@", wavFile];
          } catch {
            try {
              execSync("which pw-record", { stdio: "ignore" });
              cmd = "pw-record";
              cmdArgs = [wavFile];
            } catch {
              console.warn("⚠️  PulseAudio/PipeWire monitor utilities not found. Using default microphone.");
            }
          }
        } else {
          console.log("🎙️  Microphone Input Active: Recording ambient room audio.");
          try {
            execSync("which pw-record", { stdio: "ignore" });
            cmd = "pw-record";
            cmdArgs = [wavFile];
          } catch {
            try {
              execSync("which parecord", { stdio: "ignore" });
              cmd = "parecord";
              cmdArgs = [wavFile];
            } catch {}
          }
        }


        console.log("-------------------------------------------------");
        console.log(`Using recording command: ${cmd} ${cmdArgs.join(" ")}`);
        console.log("🛑 Press Ctrl+C to STOP recording when class ends.");
        console.log("-------------------------------------------------");

        const proc = spawn(cmd, cmdArgs, { stdio: "inherit" });

        process.on("SIGINT", async () => {
          console.log("\n⚡ Stopping recording and compressing WAV to MP3...");
          proc.kill("SIGINT");
          
          setTimeout(async () => {
            if (fs.existsSync(wavFile)) {
              try {
                execSync(`ffmpeg -y -i "${wavFile}" -ac 1 -ar 16000 -ab 32k "${mp3File}"`, { stdio: "ignore" });
                fs.unlinkSync(wavFile);
                console.log(`✅ Saved compressed recording: ${mp3File}`);
                
                // Add to Inbox
                await db.insert(inboxTable).values({
                  title,
                  type: "audio",
                  status: "captured",
                  filePath: mp3File,
                  rawText: null
                });
                console.log("📥 Captured and queued recording in the Inbox. Open the web app to Preview & Apply.");
              } catch (e) {
                console.warn("⚠️ Compression failed. WAV kept.", e.message);
                await db.insert(inboxTable).values({
                  title,
                  type: "audio",
                  status: "captured",
                  filePath: wavFile,
                  rawText: null
                });
                console.log("📥 Captured and queued WAV recording in the Inbox.");
              }
            }
            process.exit(0);
          }, 1000);
        });

        // Keep process alive for recording
        await new Promise(() => {});
        break;
      }

      if (filePathArg) {
        const resolvedPath = path.resolve(filePathArg);
        if (!fs.existsSync(resolvedPath)) {
          console.error(`Error: File not found at ${resolvedPath}`);
          return;
        }

        const fileName = path.basename(resolvedPath);
        if (!title) title = fileName.replace(/\.[^/.]+$/, "");
        if (!type) {
          const ext = path.extname(fileName).toLowerCase();
          if ([".mp3", ".wav", ".webm", ".m4a"].includes(ext)) type = "audio";
          else if ([".png", ".jpg", ".jpeg"].includes(ext)) type = "image";
          else if (ext === ".pdf") type = "pdf";
          else type = "text";
        }

        const destPath = path.join(RECORDINGS_DIR, `${Date.now()}_${fileName}`);
        fs.copyFileSync(resolvedPath, destPath);

        await db.insert(inboxTable).values({
          title,
          type,
          status: "captured",
          filePath: destPath,
          rawText: null
        });

        console.log(`📥 Captured "${title}" (${type}) and queued in the Inbox.`);
        break;
      }

      if (rawText) {
        if (!title) title = `Text Capture ${new Date().toLocaleString()}`;
        if (!type) type = "text";

        await db.insert(inboxTable).values({
          title,
          type,
          status: "captured",
          filePath: null,
          rawText
        });

        console.log(`📥 Captured text paste "${title}" and queued in the Inbox.`);
        break;
      }
      break;
    }

    case "import": {
      // Alias for capture --file
      const fileArg = args[1];
      const titleIdx = args.indexOf("--title");
      const typeIdx = args.indexOf("--type");

      const title = titleIdx !== -1 ? args[titleIdx + 1] : null;
      const type = typeIdx !== -1 ? args[typeIdx + 1] : null;

      if (!fileArg) {
        console.error("Error: Please specify the file path to import.");
        return;
      }

      const captureArgs = ["capture", "--file", fileArg];
      if (title) captureArgs.push("--title", title);
      if (type) captureArgs.push("--type", type);
      
      // Execute the capture flow programmatically
      process.argv = [process.argv[0], process.argv[1], ...captureArgs];
      await main();
      break;
    }

    case "export": {
      const format = args[1];
      if (!format || !["ics", "json", "md", "zip", "all"].includes(format)) {
        console.log("Usage: nexus export <zip|ics|json|md>");
        return;
      }

      const tasks = await db.select().from(tasksTable);
      const courses = await db.select().from(coursesTable);
      const semesters = await db.select().from(semestersTable);
      const events = await db.select().from(eventsTable);
      const resources = await db.select().from(resourcesTable);

      const activeSem = semesters.find(s => s.isActive) || semesters[0];
      const semesterName = activeSem ? activeSem.name : "Semester";

      if (format === "json") {
        fs.writeFileSync("tasks.json", JSON.stringify(tasks, null, 2));
        fs.writeFileSync("courses.json", JSON.stringify(courses, null, 2));
        fs.writeFileSync("semester.json", JSON.stringify(semesters, null, 2));
        console.log("✅ Exported tasks.json, courses.json, and semester.json.");
      }

      if (format === "ics") {
        let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NexusDesk//Academic Calendar//EN\r\n";
        events.forEach(e => {
          const startStr = e.startTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
          const endStr = e.endTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
          icsContent += "BEGIN:VEVENT\r\n";
          icsContent += `UID:${e.id}\r\n`;
          icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\n`;
          icsContent += `DTSTART:${startStr}\r\n`;
          icsContent += `DTEND:${endStr}\r\n`;
          icsContent += `SUMMARY:${e.title}\r\n`;
          if (e.location) icsContent += `LOCATION:${e.location}\r\n`;
          icsContent += "END:VEVENT\r\n";
        });
        icsContent += "END:VCALENDAR\r\n";
        fs.writeFileSync("calendar.ics", icsContent);
        console.log(`✅ Exported calendar.ics containing ${events.length} events.`);
      }

      if (format === "md") {
        let summaryMd = `# Academic Performance Summary\nGenerated on ${new Date().toLocaleDateString()}\n\n`;
        summaryMd += `## Semester: ${semesterName}\n\n`;
        summaryMd += `## Courses\n`;
        courses.forEach(c => {
          summaryMd += `- **${c.subjectCode}**: ${c.name} (${c.creditWeight} credits, Room: ${c.roomNumber || 'N/A'})\n`;
        });
        summaryMd += `\n## Outstanding Actions\n`;
        tasks.filter(t => t.status !== "DONE").forEach(t => {
          summaryMd += `- [ ] [${t.priority}] ${t.title} ${t.dueDate ? `*(Due: ${t.dueDate})*` : ""}\n`;
        });
        fs.writeFileSync("summary.md", summaryMd);
        console.log("✅ Exported progress summary.md.");
      }

      if (format === "zip" || format === "all") {
        console.log("📦 Preparing full zero-lock-in export folder...");
        const exportDirName = `nexusdesk_export_${semesterName.replace(/\s+/g, "_")}`;
        const exportDir = path.join(WORKSPACE_DIR, exportDirName);
        
        if (fs.existsSync(exportDir)) {
          fs.rmSync(exportDir, { recursive: true, force: true });
        }
        fs.mkdirSync(exportDir, { recursive: true });
        fs.mkdirSync(path.join(exportDir, "notes_and_media"), { recursive: true });

        // Write calendar.ics
        let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NexusDesk//Academic Calendar//EN\r\n";
        events.forEach(e => {
          const startStr = e.startTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
          const endStr = e.endTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
          icsContent += "BEGIN:VEVENT\r\n";
          icsContent += `UID:${e.id}\r\n`;
          icsContent += `DTSTART:${startStr}\r\n`;
          icsContent += `DTEND:${endStr}\r\n`;
          icsContent += `SUMMARY:${e.title}\r\n`;
          if (e.location) icsContent += `LOCATION:${e.location}\r\n`;
          icsContent += "END:VEVENT\r\n";
        });
        icsContent += "END:VCALENDAR\r\n";
        fs.writeFileSync(path.join(exportDir, "calendar.ics"), icsContent);

        // Write actions.md
        let actionsMd = `# Academic Actions Checklist\n\n`;
        tasks.forEach(t => {
          const check = t.status === "DONE" ? "[x]" : "[ ]";
          actionsMd += `- ${check} [${t.priority}] ${t.title} ${t.dueDate ? `*(Due: ${t.dueDate})*` : ""}\n`;
          if (t.description) actionsMd += `  *Description:* ${t.description}\n`;
        });
        fs.writeFileSync(path.join(exportDir, "actions.md"), actionsMd);

        // Write courses.json and tasks.json
        fs.writeFileSync(path.join(exportDir, "courses.json"), JSON.stringify(courses, null, 2));
        fs.writeFileSync(path.join(exportDir, "tasks.json"), JSON.stringify(tasks, null, 2));

        // Write summary.md
        let summaryMd = `# Semester Export Summary: ${semesterName}\nExported on: ${new Date().toLocaleDateString()}\n\n`;
        summaryMd += `## Courses\n`;
        courses.forEach(c => {
          summaryMd += `- **${c.subjectCode}**: ${c.name} (${c.creditWeight} credits, Room: ${c.roomNumber || 'N/A'})\n`;
        });
        fs.writeFileSync(path.join(exportDir, "summary.md"), summaryMd);

        // Copy all notes and recordings listed in resources
        let copiedCount = 0;
        resources.forEach(res => {
          if (res.filePath && fs.existsSync(res.filePath)) {
            const dest = path.join(exportDir, "notes_and_media", path.basename(res.filePath));
            fs.copyFileSync(res.filePath, dest);
            copiedCount++;
          }
        });

        console.log(`📂 Copied ${copiedCount} notes & recording files into export package.`);

        // Create zip archive
        const zipFile = path.join(WORKSPACE_DIR, "semester.zip");
        if (fs.existsSync(zipFile)) {
          fs.unlinkSync(zipFile);
        }

        try {
          execSync(`zip -r "${zipFile}" "${exportDirName}"`, { cwd: WORKSPACE_DIR, stdio: "ignore" });
          console.log(`✅ Success! Created export package "semester.zip" (${(fs.statSync(zipFile).size / 1024 / 1024).toFixed(2)} MB).`);
        } catch (zipErr) {
          console.warn("⚠️ CLI 'zip' tool not found. Creating fallback tarball semester.tar.gz...");
          const tarFile = path.join(WORKSPACE_DIR, "semester.tar.gz");
          if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
          execSync(`tar -czf "${tarFile}" "${exportDirName}"`, { cwd: WORKSPACE_DIR, stdio: "ignore" });
          console.log(`✅ Success! Created export package "semester.tar.gz" (${(fs.statSync(tarFile).size / 1024 / 1024).toFixed(2)} MB).`);
        }

        // Clean up temporary export directory
        fs.rmSync(exportDir, { recursive: true, force: true });
        console.log("🧹 Cleaned up temporary files. You are completely lock-in free.");
      }
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
