import { Router } from "express";
import { db } from "@workspace/db";
import { inboxTable, semestersTable, coursesTable, eventsTable, resourcesTable, tasksTable, attendanceTable, artifactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import { LemmaClient } from "lemma-sdk";
import { resolveGeminiApiKey } from "../lib/utils";
import { emitEvent } from "../lib/events";

const router = Router();
// Resolve workspace root: env override > relative from server package > cwd
const WORKSPACE_DIR = process.env.NEXUSDESK_ROOT || path.resolve(process.cwd(), "../..");
const RECORDINGS_DIR = path.join(WORKSPACE_DIR, "recordings");

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Initialize Lemma Client for datastore sync
const lemmaClient = new LemmaClient({
  apiUrl: process.env.LEMMA_API_URL || "http://127.0.0.1:8711",
  authUrl: process.env.LEMMA_AUTH_URL || "http://127.0.0.1:3711/auth",
});
lemmaClient.setPodId(process.env.POD_ID || "default-pod");


// 1. Get all active inbox items
router.get("/inbox", async (req, res): Promise<void> => {
  try {
    const items = await db.select().from(inboxTable);
    // Filter out applied items, keeping captured and understood
    const activeItems = items.filter(item => item.status !== "applied");
    res.json(activeItems);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch inbox items", details: err.message });
  }
});

// 2. Get a single inbox item
router.get("/inbox/:id", async (req, res): Promise<void> => {
  try {
    const [item] = await db.select().from(inboxTable).where(eq(inboxTable.id, req.params.id)).limit(1);
    if (!item) {
      res.status(404).json({ error: "Inbox item not found" });
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch inbox item", details: err.message });
  }
});

// 3. Delete / Archive an inbox item
router.delete("/inbox/:id", async (req, res): Promise<void> => {
  try {
    await db.delete(inboxTable).where(eq(inboxTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete inbox item", details: err.message });
  }
});

// 4. Capture Endpoint
router.post("/inbox/capture", async (req, res): Promise<void> => {
  const { title, type, rawText, fileBase64, fileName } = req.body;

  if (!title || !type) {
    res.status(400).json({ error: "title and type are required" });
    return;
  }

  try {
    let filePath: string | null = null;
    let savedText: string | null = rawText || null;

    if (fileBase64 && fileName) {
      const extension = path.extname(fileName);
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const baseName = `${safeTitle}_${Date.now()}`;
      const savedFileName = `${baseName}${extension}`;
      const savedFilePath = path.join(RECORDINGS_DIR, savedFileName);

      const buffer = Buffer.from(fileBase64, "base64");
      fs.writeFileSync(savedFilePath, buffer);
      filePath = savedFilePath;
    }

    const [item] = await db.insert(inboxTable).values({
      title,
      type,
      status: "captured",
      filePath,
      rawText: savedText,
      analysis: null
    }).returning();

    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to capture item", details: err.message });
  }
});

// Helper for Gemini / Ollama call
async function callGemini(prompt: string, apiKey: string, base64Image?: string): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: Error | null = null;

  for (const model of models) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const parts: any[] = [{ text: prompt }];

        if (base64Image) {
          const match = base64Image.match(/^data:(image\/\w+|application\/pdf);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          } else {
            parts.push({
              inlineData: {
                mimeType: "image/png",
                data: base64Image.replace(/^data:(image\/\w+|application\/pdf);base64,/, "")
              }
            });
          }
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
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
    console.warn(`Model ${model} failed, falling back to next available model...`);
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

async function callOllama(prompt: string, base64Image?: string): Promise<string> {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = base64Image ? "llama3.2-vision" : "llama3";
  const cleanImage = base64Image ? base64Image.replace(/^data:image\/\w+;base64,/, "") : undefined;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
      images: cleanImage ? [cleanImage] : undefined,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json() as { response: string };
  return data.response.trim();
}

// 5. Understand Endpoint (Non-blocking Background Task)
router.post("/inbox/:id/understand", async (req, res): Promise<void> => {
  const { provider, apiKey, useLocalWhisper } = req.body;
  const { id } = req.params;

  try {
    const [item] = await db.select().from(inboxTable).where(eq(inboxTable.id, id)).limit(1);
    if (!item) {
      res.status(404).json({ error: "Inbox item not found" });
      return;
    }

    const geminiApiKey = resolveGeminiApiKey(apiKey);
    const llmProvider = (provider === "gemini" || provider === "antigravity" || geminiApiKey) ? "gemini" : "ollama";

    if (llmProvider === "gemini" && !geminiApiKey) {
      res.status(400).json({ error: "Gemini API key is required." });
      return;
    }

    // Immediately set status to "understanding" and respond to client
    await db.update(inboxTable).set({ status: "understanding" }).where(eq(inboxTable.id, id));
    res.status(202).json({ success: true, status: "understanding" });

    // Run long-running transcription and LLM analysis in background
    (async () => {
      try {
        let rawTextToAnalyze = item.rawText || "";
        let base64Image: string | undefined = undefined;
        let computedArtifacts: any[] = [];

        // Step A: Ingestion based on type
        if (item.type === "audio" || item.type === "recording") {
          if (!item.filePath || !fs.existsSync(item.filePath)) {
            throw new Error("Audio file path is missing or file does not exist.");
          }

          // Transcribe the audio
          const localFlag = useLocalWhisper ? " --local" : "";
          const transcriberCmd = `python3 scripts/class_transcriber.py "${item.filePath}"${localFlag}`;

          await new Promise<void>((resolve, reject) => {
            exec(transcriberCmd, {
              cwd: WORKSPACE_DIR,
              env: { ...process.env, GEMINI_API_KEY: geminiApiKey }
            }, (err, stdout, stderr) => {
              if (err) reject(new Error(`Audio transcription failed: ${stderr || err.message}`));
              else resolve();
            });
          });

          const txtFilePath = item.filePath.replace(/\.[^/.]+$/, ".txt");
          if (!fs.existsSync(txtFilePath)) {
            throw new Error("Transcription completed but output text file was not generated.");
          }

          // Read transcribed text
          rawTextToAnalyze = fs.readFileSync(txtFilePath, "utf-8");

          // Generate structured notes from transcript using note-taker script
          const context = "Academic class session notes. Focus on topics discussed and assignments.";
          const noteTakerCmd = `python3 scripts/gemini_note_taker.py "${txtFilePath}" "${context}"`;

          await new Promise<void>((resolve, reject) => {
            exec(noteTakerCmd, {
              cwd: WORKSPACE_DIR,
              env: { ...process.env, GEMINI_API_KEY: geminiApiKey }
            }, (err, stdout, stderr) => {
              // Cleanup raw transcript txt
              try { fs.unlinkSync(txtFilePath); } catch {}
              if (err) reject(new Error(`Notes generation failed: ${stderr || err.message}`));
              else resolve();
            });
          });

          const notesMdPath = item.filePath.replace(/\.[^/.]+$/, ".notes.md");
          const notesDocxPath = item.filePath.replace(/\.[^/.]+$/, ".notes.docx");

          if (fs.existsSync(notesMdPath)) {
            computedArtifacts.push({
              title: `${item.title} Notes (Markdown)`,
              type: "NOTE",
              filePath: notesMdPath,
              url: `/api/recordings/download?path=${encodeURIComponent(notesMdPath)}`
            });
          }

          if (fs.existsSync(notesDocxPath)) {
            computedArtifacts.push({
              title: `${item.title} Notes (Word)`,
              type: "PDF",
              filePath: notesDocxPath,
              url: `/api/recordings/download?path=${encodeURIComponent(notesDocxPath)}`
            });
          }

          computedArtifacts.push({
            title: `${item.title} (Audio Recording)`,
            type: "VIDEO",
            filePath: item.filePath,
            url: `/api/recordings/download?path=${encodeURIComponent(item.filePath)}`
          });

        } else if (item.type === "image" || item.type === "pdf") {
          if (!item.filePath || !fs.existsSync(item.filePath)) {
            throw new Error(`${item.type === "pdf" ? "PDF" : "Image"} file is missing.`);
          }
          const fileBuffer = fs.readFileSync(item.filePath);
          const isPdf = item.type === "pdf";
          const mimeType = isPdf ? "application/pdf" : "image/png";
          base64Image = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
        }

        // Step B: Ask LLM to extract entity relations in our simplified product model
        const currentDate = new Date().toISOString().split("T")[0];
        const prompt = `You are a highly advanced academic strategist, scheduler, and curriculum parser.
Analyze this academic document (syllabus, calendar, timetable, assignment guidelines, or notes) and generate a comprehensive, pre-scheduled, and highly-optimized semester roadmap.
Current Date: ${currentDate}

CRITICAL: If the document is a general academic calendar or administrative schedule that does not specify a student's individual curriculum, DO NOT invent fictional courses. Instead, extract only the general administrative/academic dates (e.g. registration, holidays, exam weeks) and assign them to a generic subject code like "GEN" or "ADMIN".

In addition to extracting the raw events and courses mentioned in the text, you must use your academic intelligence to proactively generate:
1. PREP TASKS & MILESTONES: For every major exam (midterm, final) or project/assignment mentioned:
   - Generate 2-3 preparation tasks (e.g. "Review formulas for [Course] Exam", "Draft essay outline for [Assignment]") scheduled at appropriate dates leading up to the deadline (e.g., 7 days, 3 days, 1 day prior).
   - Generate 3-4 milestone check-ins for complex projects (e.g., "Brainstorm proposal", "Implement core logic", "Write report").
2. STUDY PLANS: For every action/task (both extracted and generated), produce a detailed markdown "studyPlan" outlining a day-by-day or step-by-step strategy to complete it successfully.
3. RECOMMENDATIONS & RESOURCES: For every action/task, recommend 2-3 specific, high-quality learning resources (videos, books, links) as a JSON array "studyMaterials" including:
   - title: Name of the resource
   - type: "VIDEO" | "LINK" | "NOTE"
   - url: A valid educational URL (e.g. YouTube search link for the topic, MIT OCW link, Google Scholar)
   - reason: Why this resource is relevant to this specific task
4. TRIAGE NOTE: For every action/task, write a "triageNote" explaining the task's difficulty, importance to their GPA (based on syllabus weights), and priority rationale.
5. SEMESTER ROADMAP REPORT: Compile a complete semester overview and workload strategy into a detailed markdown document ("weeklyDigest"). Include sections:
   - 📅 Key Deadlines & Chronological Exam Timeline
   - ⚡ CIE Grade Survival Advice (based on course credits/weights)
   - 🛠️ Strategic Study Rules (focus areas for weak subjects)
   - 🚦 Potential schedule clashes or heavy workload weeks

Target Schema JSON format:
{
  "semester": {
    "name": "Semester Name (e.g. Fall 2026)",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "courses": [
    {
      "subjectCode": "Code (e.g. CS101)",
      "name": "Full Course Name",
      "shortName": "Abbreviation (e.g. CS)",
      "creditWeight": 3,
      "facultyName": "Faculty name if found",
      "roomNumber": "Room if found"
    }
  ],
  "sessions": [
    {
      "subjectCode": "CS101",
      "title": "Title (e.g. Lecture 1, Midterm Exam)",
      "type": "LECTURE", // LECTURE, LAB, TUTORIAL, EXAM, MEETING, BREAK
      "date": "YYYY-MM-DD", // For single instance/event
      "dayOfWeek": 1, // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (for recurring class)
      "startHour": 9,
      "startMinute": 0,
      "endHour": 10,
      "endMinute": 0,
      "location": "Room if different"
    }
  ],
  "artifacts": [
    {
      "title": "Title of materials",
      "type": "NOTE", // NOTE, PDF, VIDEO, LINK
      "subjectCode": "CS101"
    }
  ],
  "actions": [
    {
      "title": "Action title",
      "description": "Details",
      "category": "ACADEMICS", // ACADEMICS, HARDWARE_DEV, PERSONAL
      "priority": "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      "dueDate": "YYYY-MM-DD",
      "subjectCode": "CS101",
      "triageNote": "AI explanation of importance, difficulty, and approach strategy",
      "studyPlan": "Markdown step-by-step preparation plan",
      "studyMaterials": [
        {
          "title": "Resource title",
          "type": "VIDEO", // VIDEO, LINK, NOTE
          "url": "https://...",
          "reason": "Why this is recommended"
        }
      ]
    }
  ],
  "weeklyDigest": "Full detailed markdown semester roadmap report content"
}

Only return a valid JSON object matching this schema. If any section is empty, return empty array. Do not write text before or after the JSON.

Content to analyze:
${rawTextToAnalyze}`;

        let llmResponse = "";
        if (llmProvider === "gemini") {
          llmResponse = await callGemini(prompt, geminiApiKey!, base64Image);
        } else {
          llmResponse = await callOllama(prompt, base64Image);
        }

        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(`Could not parse JSON from LLM: ${llmResponse}`);
        }
        const analysisJson = JSON.parse(jsonMatch[0]);

        // Merge computed artifacts from transcription pipeline
        if (computedArtifacts.length > 0) {
          if (!analysisJson.artifacts) analysisJson.artifacts = [];
          const defaultCourseCode = analysisJson.courses?.[0]?.subjectCode || "";
          computedArtifacts.forEach(art => {
            art.subjectCode = art.subjectCode || defaultCourseCode;
            analysisJson.artifacts.push(art);
          });
        }

        // Update database
        await db.update(inboxTable).set({
          rawText: rawTextToAnalyze || item.rawText,
          analysis: JSON.stringify(analysisJson),
          status: "understood"
        }).where(eq(inboxTable.id, id));

      } catch (err: any) {
        console.error(`[BackgroundUnderstand] Error analyzing item ${id}:`, err);
        await db.update(inboxTable).set({
          status: "failed",
          analysis: JSON.stringify({ error: err.message || "Unknown error during AI analysis" })
        }).where(eq(inboxTable.id, id));
      }
    })();

  } catch (err: any) {
    console.error("Understand handler startup error:", err);
    res.status(500).json({ error: "Failed to initiate inbox item understanding", details: err.message });
  }
});

// 5b. Smart Inbox Conflict Resolution
router.post("/inbox/:id/conflicts", async (req, res): Promise<void> => {
  const payload = req.body;
  const conflicts = {
    courses: [] as any[],
    sessions: [] as any[],
    actions: [] as any[]
  };

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  try {
    const [activeSem] = await db.select().from(semestersTable).where(eq(semestersTable.isActive, true)).limit(1);
    if (!activeSem) {
      res.json(conflicts);
      return;
    }

    // 1. Check Course Code Conflicts
    if (payload.courses && Array.isArray(payload.courses)) {
      for (const c of payload.courses) {
        if (!c.subjectCode) continue;
        const [existing] = await db.select().from(coursesTable)
          .where(and(eq(coursesTable.subjectCode, c.subjectCode), eq(coursesTable.semesterId, activeSem.id)))
          .limit(1);
        if (existing && existing.name.toLowerCase() !== c.name.toLowerCase()) {
          conflicts.courses.push({
            subjectCode: c.subjectCode,
            warning: `Code "${c.subjectCode}" is already registered in active semester as "${existing.name}" (incoming is "${c.name}").`
          });
        }
      }
    }

    // 2. Check Schedule Conflicts (Time Overlaps)
    const existingEvents = await db.select().from(eventsTable);
    if (payload.sessions && Array.isArray(payload.sessions)) {
      for (const sess of payload.sessions) {
        if (!sess.date && sess.dayOfWeek !== undefined) {
          for (const ev of existingEvents) {
            if (!ev.isRecurring) continue;
            const evStart = new Date(ev.startTime);
            const evEnd = new Date(ev.endTime);
            if (evStart.getDay() === sess.dayOfWeek) {
              const existingStartMin = evStart.getHours() * 60 + evStart.getMinutes();
              const existingEndMin = evEnd.getHours() * 60 + evEnd.getMinutes();
              const incomingStartMin = (sess.startHour ?? 9) * 60 + (sess.startMinute ?? 0);
              const incomingEndMin = (sess.endHour ?? 10) * 60 + (sess.endMinute ?? 0);

              const overlap = Math.max(existingStartMin, incomingStartMin) < Math.min(existingEndMin, incomingEndMin);
              if (overlap) {
                const formatTime = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                conflicts.sessions.push({
                  title: sess.title,
                  warning: `"${sess.title}" (${formatTime(sess.startHour ?? 9, sess.startMinute ?? 0)} - ${formatTime(sess.endHour ?? 10, sess.endMinute ?? 0)}) overlaps with existing class "${ev.title}" (${formatTime(evStart.getHours(), evStart.getMinutes())} - ${formatTime(evEnd.getHours(), evEnd.getMinutes())}) on ${DAY_NAMES[sess.dayOfWeek]}.`
                });
              }
            }
          }
        }
      }
    }

    // 3. Check Task Duplicates
    if (payload.actions && Array.isArray(payload.actions)) {
      for (const act of payload.actions) {
        if (!act.title) continue;
        const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.title, act.title)).limit(1);
        if (existing) {
          conflicts.actions.push({
            title: act.title,
            warning: `Task "${act.title}" already exists in your checklist.`
          });
        }
      }
    }

    res.json(conflicts);
  } catch (err: any) {
    console.error("Conflict checking error:", err);
    res.status(500).json({ error: "Failed to check conflicts", details: err.message });
  }
});


// 6. Apply Endpoint
router.post("/inbox/:id/apply", async (req, res): Promise<void> => {
  const { id } = req.params;
  const finalPayload = req.body;

  try {
    const [item] = await db.select().from(inboxTable).where(eq(inboxTable.id, id)).limit(1);
    if (!item) {
      res.status(404).json({ error: "Inbox item not found" });
      return;
    }

    // A. Apply Semester
    let activeSemesterId = "";
    if (finalPayload.semester && finalPayload.semester.name) {
      const sem = finalPayload.semester;
      const semStart = sem.startDate;
      const semEnd = sem.endDate;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const hasValidDates = semStart && semEnd && dateRegex.test(semStart) && dateRegex.test(semEnd);

      const [existingSem] = await db.select().from(semestersTable).where(eq(semestersTable.name, sem.name)).limit(1);
      if (existingSem) {
        activeSemesterId = existingSem.id;
        if (hasValidDates) {
          await db.update(semestersTable).set({
            startDate: semStart,
            endDate: semEnd
          }).where(eq(semestersTable.id, activeSemesterId));
        }
      } else if (hasValidDates) {
        await db.update(semestersTable).set({ isActive: false });
        const [newSem] = await db.insert(semestersTable).values({
          name: sem.name,
          startDate: semStart,
          endDate: semEnd,
          isActive: true
        }).returning();
        activeSemesterId = newSem.id;
      }
    }

    if (!activeSemesterId) {
      const [activeSem] = await db.select().from(semestersTable).where(eq(semestersTable.isActive, true)).limit(1);
      if (activeSem) {
        activeSemesterId = activeSem.id;
      } else {
        const [defaultSem] = await db.insert(semestersTable).values({
          name: "Academic Semester 2026",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          isActive: true
        }).returning();
        activeSemesterId = defaultSem.id;
      }
    }

    const [semesterRecord] = await db.select().from(semestersTable).where(eq(semestersTable.id, activeSemesterId)).limit(1);
    const semStartDate = new Date(semesterRecord.startDate);
    const semEndDate = new Date(semesterRecord.endDate);

    // B. Apply Courses
    const courseMap = new Map<string, string>();
    const mutedColors = ["#C4614A", "#6B7F52", "#B8872A", "#4A5568", "#5A5A5A"];
    
    const existingCourses = await db.select().from(coursesTable).where(eq(coursesTable.semesterId, activeSemesterId));
    existingCourses.forEach(c => {
      courseMap.set(c.subjectCode.toUpperCase(), c.id);
    });

    if (finalPayload.courses && Array.isArray(finalPayload.courses)) {
      for (let i = 0; i < finalPayload.courses.length; i++) {
        const c = finalPayload.courses[i];
        if (!c.subjectCode || !c.name) continue;
        const codeUpper = c.subjectCode.toUpperCase();

        if (courseMap.has(codeUpper)) {
          const cId = courseMap.get(codeUpper)!;
          await db.update(coursesTable).set({
            name: c.name,
            shortName: c.shortName || codeUpper,
            creditWeight: c.creditWeight ?? 3,
            facultyName: c.facultyName || null,
            roomNumber: c.roomNumber || null,
          }).where(eq(coursesTable.id, cId));
        } else {
          const [newCourse] = await db.insert(coursesTable).values({
            subjectCode: c.subjectCode,
            name: c.name,
            shortName: c.shortName || codeUpper,
            creditWeight: c.creditWeight ?? 3,
            minAttendancePct: 75,
            facultyName: c.facultyName || null,
            roomNumber: c.roomNumber || null,
            color: mutedColors[i % mutedColors.length],
            semesterId: activeSemesterId
          }).returning();
          courseMap.set(codeUpper, newCourse.id);
        }
      }
    }

    // C. Apply Sessions
    if (finalPayload.sessions && Array.isArray(finalPayload.sessions)) {
      for (const sess of finalPayload.sessions) {
        if (!sess.title) continue;

        let courseId: string | null = null;
        if (sess.subjectCode) {
          courseId = courseMap.get(sess.subjectCode.toUpperCase()) || null;
        }

        if (!sess.date && sess.dayOfWeek !== undefined) {
          const recurringGroupId = crypto.randomUUID();
          const toInsert = [];
          const cursor = new Date(semStartDate);

          let limit = 0;
          while (cursor.getDay() !== sess.dayOfWeek && limit < 7) {
            cursor.setDate(cursor.getDate() + 1);
            limit++;
          }

          while (cursor <= semEndDate) {
            if (cursor.getDay() === sess.dayOfWeek) {
              const start = new Date(cursor);
              start.setHours(sess.startHour ?? 9, sess.startMinute ?? 0, 0, 0);
              const end = new Date(cursor);
              end.setHours(sess.endHour ?? 10, sess.endMinute ?? 0, 0, 0);

              toInsert.push({
                title: sess.title,
                type: sess.type || "LECTURE",
                startTime: start,
                endTime: end,
                location: sess.location || null,
                isRecurring: true,
                recurringGroupId,
                courseId
              });
            }
            cursor.setDate(cursor.getDate() + 7);
          }

          if (toInsert.length > 0) {
            await db.insert(eventsTable).values(toInsert);
          }
        } else if (sess.date) {
          const start = new Date(`${sess.date}T${String(sess.startHour ?? 9).padStart(2, "0")}:${String(sess.startMinute ?? 0).padStart(2, "0")}:00`);
          const end = new Date(`${sess.date}T${String(sess.endHour ?? 10).padStart(2, "0")}:${String(sess.endMinute ?? 0).padStart(2, "0")}:00`);

          await db.insert(eventsTable).values({
            title: sess.title,
            type: sess.type || "LECTURE",
            startTime: start,
            endTime: end,
            location: sess.location || null,
            isRecurring: false,
            courseId
          });
        }
      }
    }

    // D. Apply Artifacts
    if (finalPayload.artifacts && Array.isArray(finalPayload.artifacts)) {
      for (const art of finalPayload.artifacts) {
        if (!art.title) continue;

        let courseId: string | null = null;
        if (art.subjectCode) {
          courseId = courseMap.get(art.subjectCode.toUpperCase()) || null;
        }

        if (courseId) {
          await db.insert(resourcesTable).values({
            title: art.title,
            type: art.type || "LINK",
            courseId,
            filePath: art.filePath || null,
            url: art.url || null
          });
        }
      }
    }

    // E. Apply Actions
    if (finalPayload.actions && Array.isArray(finalPayload.actions)) {
      for (const act of finalPayload.actions) {
        if (!act.title) continue;

        let courseId: string | null = null;
        let courseName = "General";
        if (act.subjectCode) {
          courseId = courseMap.get(act.subjectCode.toUpperCase()) || null;
          const matchingCourse = existingCourses.find(c => c.subjectCode.toUpperCase() === act.subjectCode.toUpperCase());
          if (matchingCourse) {
            courseName = matchingCourse.name;
          }
        }

        const [insertedTask] = await db.insert(tasksTable).values({
          title: act.title,
          description: act.description || null,
          category: act.category || "ACADEMICS",
          priority: act.priority || "MEDIUM",
          dueDate: act.dueDate || null,
          linkedCourseId: courseId,
          studyPlan: act.studyPlan || null,
          studyMaterials: act.studyMaterials ? (typeof act.studyMaterials === "string" ? act.studyMaterials : JSON.stringify(act.studyMaterials)) : null,
          triageNote: act.triageNote || null
        }).returning();

        // Sync to Lemma Datastore
        try {
          const recordData = {
            taskId: insertedTask.id,
            type: act.category === "PERSONAL" ? "Lecture" : "Assignment",
            status: "Pending",
            deadline: act.dueDate ? new Date(act.dueDate).toISOString() : new Date().toISOString(),
            courseName: courseName,
            gradeWeight: 0,
            currentScore: null,
            gpaPoints: null,
            recommended_materials: [],
            notes: act.description || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await lemmaClient.records.create("student_tasks", recordData);
          console.log(`[Lemma SDK] Synced action "${act.title}" to student_tasks datastore.`);
        } catch (lemmaErr: any) {
          console.warn(`[Lemma SDK] student_tasks datastore sync skipped: ${lemmaErr.message}`);
        }
      }
    }

    // F. Apply Weekly Digest Report
    if (finalPayload.weeklyDigest) {
      await db.insert(artifactsTable).values({
        title: `AI Syllabus Digest — ${new Date().toISOString().split("T")[0]}`,
        type: "REPORT",
        content: finalPayload.weeklyDigest,
        tags: JSON.stringify(["weekly-digest"]),
      });
    }

    await db.update(inboxTable).set({
      status: "applied",
      analysis: JSON.stringify(finalPayload)
    }).where(eq(inboxTable.id, id));

    emitEvent("syllabus:applied", { id });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to apply inbox item", details: err.message });
  }
});

// Zero-lock-in ZIP export endpoint
router.get("/export/zip", async (req, res): Promise<void> => {
  try {
    const tasks = await db.select().from(tasksTable);
    const courses = await db.select().from(coursesTable);
    const semesters = await db.select().from(semestersTable);
    const events = await db.select().from(eventsTable);
    const resources = await db.select().from(resourcesTable);

    const activeSem = semesters.find(s => s.isActive) || semesters[0];
    const semesterName = activeSem ? activeSem.name : "Semester";

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
    });
    fs.writeFileSync(path.join(exportDir, "actions.md"), actionsMd);

    // Write JSONs
    fs.writeFileSync(path.join(exportDir, "courses.json"), JSON.stringify(courses, null, 2));
    fs.writeFileSync(path.join(exportDir, "tasks.json"), JSON.stringify(tasks, null, 2));

    // Copy resources
    resources.forEach(r => {
      if (r.filePath && fs.existsSync(r.filePath)) {
        const dest = path.join(exportDir, "notes_and_media", path.basename(r.filePath));
        fs.copyFileSync(r.filePath, dest);
      }
    });

    const zipFile = path.join(WORKSPACE_DIR, "semester_download.zip");
    if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);

    try {
      execSync(`zip -r "${zipFile}" "${exportDirName}"`, { cwd: WORKSPACE_DIR, stdio: "ignore" });
    } catch {
      execSync(`tar -czf "${zipFile}" "${exportDirName}"`, { cwd: WORKSPACE_DIR, stdio: "ignore" });
    }

    // Clean up temp
    fs.rmSync(exportDir, { recursive: true, force: true });

    res.download(zipFile, "semester.zip", () => {
      try { if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile); } catch {}
    });
  } catch (err: any) {
    res.status(500).json({ error: "Export failed", details: err.message });
  }
});

export default router;
