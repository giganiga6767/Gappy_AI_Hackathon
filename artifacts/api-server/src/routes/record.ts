import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, resourcesTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { resolveGeminiApiKey } from "../lib/utils";

const router = Router();
const WORKSPACE_DIR = process.env.NEXUSDESK_ROOT || path.resolve(process.cwd(), "../..");
const RECORDINGS_DIR = path.join(WORKSPACE_DIR, "recordings");

// Ensure recordings directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// 1. Process base64 audio and trigger pipeline
router.post("/record/process", async (req, res): Promise<void> => {
  const { audio, fileName, courseId, sessionName, useLocalWhisper, geminiApiKey, geminiModel } = req.body;

  if (!audio || !fileName || !courseId || !sessionName) {
    res.status(400).json({ error: "audio, fileName, courseId, sessionName are required" });
    return;
  }

  try {
    // Check course existence
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Save audio file to recordings dir
    const extension = path.extname(fileName) || ".webm";
    const safeSessionName = sessionName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const baseName = `${safeSessionName}_${Date.now()}`;
    const audioFileName = `${baseName}${extension}`;
    const audioFilePath = path.join(RECORDINGS_DIR, audioFileName);

    const buffer = Buffer.from(audio, "base64");
    fs.writeFileSync(audioFilePath, buffer);

    // Prepare execution context / environment variables
    const apiKeyVal = resolveGeminiApiKey(geminiApiKey);
    const modelVal = geminiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Step 1: Transcribe the audio
    const localFlag = useLocalWhisper ? " --local" : "";
    const transcriberCmd = `python3 scripts/class_transcriber.py "${audioFilePath}"${localFlag}`;

    exec(transcriberCmd, {
      cwd: WORKSPACE_DIR,
      env: {
        ...process.env,
        GEMINI_API_KEY: apiKeyVal,
        GEMINI_MODEL: modelVal,
      }
    }, async (transcribeErr, stdout, stderr) => {
      if (transcribeErr) {
        console.error("Transcriber execution error:", transcribeErr, stderr);
        res.status(500).json({
          error: "Audio transcription failed",
          details: stderr || transcribeErr.message
        });
        return;
      }

      const txtFilePath = audioFilePath.replace(extension, ".txt");
      if (!fs.existsSync(txtFilePath)) {
        res.status(500).json({ error: "Transcription completed but output text file was not generated." });
        return;
      }

      // Step 2: Generate notes using Note-Taker script
      // Pass the course info as context to help the note-taker do a better job
      const context = `${course.subjectCode} - ${course.name} class session notes. Focus on topics discussed and assignments.`;
      const noteTakerCmd = `python3 scripts/gemini_note_taker.py "${txtFilePath}" "${context}"`;

      exec(noteTakerCmd, {
        cwd: WORKSPACE_DIR,
        env: {
          ...process.env,
          GEMINI_API_KEY: apiKeyVal,
          GEMINI_MODEL: modelVal,
        }
      }, async (notesErr, nStdout, nStderr) => {
        // Clean up raw .txt transcript to save space if needed
        try {
          if (fs.existsSync(txtFilePath)) {
            fs.unlinkSync(txtFilePath);
          }
        } catch (e) {
          console.warn("Could not delete temporary txt transcript file:", e);
        }

        if (notesErr) {
          console.error("Note taker execution error:", notesErr, nStderr);
          res.status(500).json({
            error: "Notes generation failed",
            details: nStderr || notesErr.message
          });
          return;
        }

        const notesMdPath = audioFilePath.replace(extension, ".notes.md");
        const notesDocxPath = audioFilePath.replace(extension, ".notes.docx");

        if (!fs.existsSync(notesMdPath)) {
          res.status(500).json({ error: "Notes generation finished but markdown file was not generated." });
          return;
        }

        // Step 3: Parse markdown and create tasks/resources
        const notesContent = fs.readFileSync(notesMdPath, "utf-8");
        const lines = notesContent.split("\n");
        let inActionItems = false;
        const actionItems: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) {
            const headingText = trimmed.replace(/^#+\s+/, "").toLowerCase();
            if (headingText.includes("action item") || headingText.includes("task") || headingText.includes("todo")) {
              inActionItems = true;
            } else {
              inActionItems = false;
            }
            continue;
          }
          if (inActionItems) {
            if (trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\.\s/.test(trimmed)) {
              const itemText = trimmed.replace(/^[-*\d.]+\s+/, "");
              if (itemText) {
                actionItems.push(itemText);
              }
            }
          }
        }

        // Insert extracted tasks
        let tasksCreated = 0;
        for (const item of actionItems) {
          try {
            await db.insert(tasksTable).values({
              title: item,
              category: "ACADEMICS",
              priority: "MEDIUM",
              description: `Extracted from class session: ${sessionName}`,
              linkedCourseId: courseId
            });
            tasksCreated++;
          } catch (taskErr) {
            console.error("Failed to insert task:", taskErr);
          }
        }

        // Insert resources (Audio, Markdown notes, Word notes)
        let resourcesCreated = 0;
        try {
          // Audio resource
          await db.insert(resourcesTable).values({
            title: `${sessionName} (Audio Recording)`,
            type: "VIDEO",
            courseId: courseId,
            filePath: audioFilePath,
            url: `/api/recordings/download?path=${encodeURIComponent(audioFilePath)}`
          });
          resourcesCreated++;

          // Markdown Notes
          await db.insert(resourcesTable).values({
            title: `${sessionName} Notes (Markdown)`,
            type: "NOTE",
            courseId: courseId,
            filePath: notesMdPath,
            url: `/api/recordings/download?path=${encodeURIComponent(notesMdPath)}`
          });
          resourcesCreated++;

          // Word Notes
          if (fs.existsSync(notesDocxPath)) {
            await db.insert(resourcesTable).values({
              title: `${sessionName} Notes (Word)`,
              type: "PDF", // Using PDF/Document category placeholder or fallback
              courseId: courseId,
              filePath: notesDocxPath,
              url: `/api/recordings/download?path=${encodeURIComponent(notesDocxPath)}`
            });
            resourcesCreated++;
          }
        } catch (resourceErr) {
          console.error("Failed to save resources:", resourceErr);
        }

        res.json({
          success: true,
          notes: notesContent,
          tasksCreated,
          resourcesCreated,
          audioUrl: `/api/recordings/download?path=${encodeURIComponent(audioFilePath)}`,
          notesUrl: `/api/recordings/download?path=${encodeURIComponent(notesMdPath)}`,
        });
      });
    });

  } catch (err: any) {
    console.error("Error processing recording:", err);
    res.status(500).json({ error: err.message || "Failed to process audio recording" });
  }
});

// 2. Read markdown notes contents
router.get("/recordings/read", async (req, res): Promise<void> => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path parameter is required" });
    return;
  }

  // Safe path checks
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(WORKSPACE_DIR)) {
    res.status(403).json({ error: "Access denied. Path is outside workspace." });
    return;
  }

  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read file contents" });
  }
});

// 3. Download resource file
router.get("/recordings/download", async (req, res): Promise<void> => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path parameter is required" });
    return;
  }

  // Safe path checks
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(WORKSPACE_DIR)) {
    res.status(403).json({ error: "Access denied. Path is outside workspace." });
    return;
  }

  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.download(resolvedPath);
});

export default router;
