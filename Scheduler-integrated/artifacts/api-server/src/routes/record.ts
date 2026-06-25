import { Router } from "express";
import { logger } from "../lib/logger";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execPromise = promisify(exec);
const router = Router();

const activeSessions = new Map<string, { startedAt: Date; label: string }>();

router.post("/record/start", (req, res) => {
  const { label = "Recording Session" } = req.body || {};
  const sessionId = crypto.randomUUID();

  activeSessions.set(sessionId, { startedAt: new Date(), label });
  logger.info({ sessionId, label }, "Digital loopback recording started");

  res.json({
    success: true,
    sessionId,
    startedAt: new Date().toISOString(),
    label,
    message: "Digital loopback recording session started. Use /api/record/stop with the sessionId to end the session.",
  });
});

router.post("/record/stop", (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || !activeSessions.has(sessionId)) {
    res.status(404).json({ success: false, error: "Recording session not found." });
    return;
  }

  const session = activeSessions.get(sessionId)!;
  const durationMs = Date.now() - session.startedAt.getTime();
  const durationSec = Math.floor(durationMs / 1000);

  activeSessions.delete(sessionId);
  logger.info({ sessionId, durationSec }, "Digital loopback recording stopped");

  res.json({
    success: true,
    sessionId,
    label: session.label,
    startedAt: session.startedAt.toISOString(),
    stoppedAt: new Date().toISOString(),
    durationSeconds: durationSec,
    message: `Recording stopped. Duration: ${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
  });
});

router.post("/record/process", async (req, res): Promise<void> => {
  const { audioBase64, label, isOnline, provider, apiKey, model } = req.body || {};

  if (!audioBase64) {
    res.status(400).json({ success: false, error: "Audio data (base64) is required." });
    return;
  }

  const sessionLabel = label || `Session_${Date.now()}`;
  const sanitizedLabel = sessionLabel.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  
  // Create temporary workspace
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexusdesk-rec-"));
  const audioTempPath = path.join(tempDir, `${sanitizedLabel}.webm`);

  try {
    // 1. Decode base64 audio and save to webm file
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(audioTempPath, buffer);

    // 2. Determine environment variables for python scripts
    const envVars: Record<string, string> = {
      ...process.env,
      GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY || "",
      GEMINI_MODEL: provider === "gemini" || provider === "antigravity" ? "gemini-2.5-flash" : "gemini-2.5-flash"
    };

    // 3. Transcribe audio file using class_transcriber.py
    logger.info({ audioTempPath, sanitizedLabel }, "Starting transcription via class_transcriber.py");
    const transcriberScript = "/home/niranjan/class-notes-pipeline/scripts/class_transcriber.py";
    
    let transcriptionCmd = `python3 ${transcriberScript} ${audioTempPath}`;
    if (provider === "local" || provider === "ollama") {
      transcriptionCmd += " --local";
    }

    await execPromise(transcriptionCmd, { env: envVars });

    // 4. Generate structured notes
    const textTempPath = path.join(tempDir, `${sanitizedLabel}.txt`);
    const notesTempPath = path.join(tempDir, `${sanitizedLabel}.notes.md`);
    const docxTempPath = path.join(tempDir, `${sanitizedLabel}.notes.docx`);
    const noteTakerScript = "/home/niranjan/class-notes-pipeline/scripts/gemini_note_taker.py";
    
    let notesContent = "";

    if (provider === "lemma") {
      try {
        const transcript = await fs.readFile(textTempPath, "utf-8");
        const prompt = `You are a master academic and professional note-taker. Please convert the following raw transcript from a session recording into beautiful, clean, well-structured, and comprehensive markdown notes. Use headers, bullet points, checklists for action items, and clear sections. Keep it highly readable and clean up any repetition or speech fillers.

Raw Transcript:
${transcript}`;

        const { LemmaClient } = await import("lemma-sdk");
        const lemmaClient = new LemmaClient({
          apiUrl: process.env.LEMMA_API_URL || "http://127-0-0-1.sslip.io:8711",
          authUrl: process.env.LEMMA_AUTH_URL || "http://127-0-0-1.sslip.io:3711/auth",
        });
        await lemmaClient.initialize();
        logger.info("Spawning Lemma SDK Agent 'notes' to summarize transcript...");
        const conv = await lemmaClient.agents.run("notes", prompt);
        const convObj = conv as any;
        if (!convObj || !convObj.id) {
          throw new Error("Lemma Agent run did not return a valid conversation object/ID");
        }

        let attempts = 0;
        let assistantMsgText = "";
        while (attempts < 15 && !assistantMsgText) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const messages = await lemmaClient.conversations.messages.list(convObj.id);
          const assistantMsg = messages.items.find(m => m.role === "assistant" && m.text);
          if (assistantMsg && assistantMsg.text) {
            assistantMsgText = assistantMsg.text;
          }
          attempts++;
        }

        if (!assistantMsgText) {
          throw new Error("Timeout waiting for structured output from Lemma Agent");
        }

        notesContent = assistantMsgText;
        await fs.writeFile(notesTempPath, notesContent);
        
        // Compile markdown to DOCX using python note taker
        logger.info("Compiling Lemma markdown output into styled DOCX...");
        await execPromise(`python3 ${noteTakerScript} --md-only ${notesTempPath} ${docxTempPath}`, { env: envVars });

      } catch (err: any) {
        logger.warn({ err }, "Lemma notes generation failed, falling back to python notes generator");
        await execPromise(`python3 ${noteTakerScript} ${textTempPath}`, { env: envVars });
        notesContent = await fs.readFile(notesTempPath, "utf-8");
      }
    } else if (provider === "ollama") {
      try {
        const transcript = await fs.readFile(textTempPath, "utf-8");
        const prompt = `You are a professional note-taker and editor. You receive raw, messy text from speech-to-text engines — full of filler words, repetition, broken sentences, and no punctuation. Your job is to produce clean, beautifully structured markdown notes.

Rules:
1. Remove ALL filler: "um", "uh", "like", "you know", "so yeah", "basically", etc.
2. Fix grammar, punctuation, and capitalization.
3. Identify and group distinct TOPICS. Give each a clear ## Heading.
4. Extract any action items or decisions into a separate ## Action Items section.
5. Write a 2-3 sentence ## Summary at the top.
6. Preserve the speaker's intent — do not add your own opinions.
7. If dates, names, or numbers appear, format them cleanly.
8. Output ONLY valid markdown. No preamble, no explanation.

RAW TEXT:
---
${transcript}
---`;

        const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const modelName = model || "llama3";
        logger.info({ modelName }, "Requesting local Ollama note generation");
        
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt,
            stream: false,
            options: { temperature: 0.1 }
          }),
          signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
        const data = await response.json() as { response: string };
        notesContent = data.response.trim();

        await fs.writeFile(notesTempPath, notesContent);
        
        // Compile markdown to DOCX using python note taker
        logger.info("Compiling Ollama markdown output into styled DOCX...");
        await execPromise(`python3 ${noteTakerScript} --md-only ${notesTempPath} ${docxTempPath}`, { env: envVars });

      } catch (err: any) {
        logger.warn({ err }, "Local Ollama notes generation failed, falling back to python notes generator");
        await execPromise(`python3 ${noteTakerScript} ${textTempPath}`, { env: envVars });
        notesContent = await fs.readFile(notesTempPath, "utf-8");
      }
    } else {
      logger.info({ textTempPath }, "Generating notes via gemini_note_taker.py");
      await execPromise(`python3 ${noteTakerScript} ${textTempPath}`, { env: envVars });
      notesContent = await fs.readFile(notesTempPath, "utf-8");
    }

    // 5. Ensure target directories on user Desktop exist
    const homeDir = os.homedir();
    const desktopNotesDir = path.join(homeDir, "Desktop", "notes");
    const desktopRecDir = path.join(
      homeDir, 
      "Desktop", 
      "classrecordings", 
      isOnline ? "online" : "offline"
    );

    await fs.mkdir(desktopNotesDir, { recursive: true });
    await fs.mkdir(desktopRecDir, { recursive: true });

    // 6. Copy generated DOCX and recorded webm/mp3 to user Desktop
    const finalDocxPath = path.join(desktopNotesDir, `${sanitizedLabel}.docx`);
    const finalAudioPath = path.join(desktopRecDir, `${sanitizedLabel}.webm`);

    await fs.copyFile(docxTempPath, finalDocxPath);
    await fs.copyFile(audioTempPath, finalAudioPath);

    logger.info({ finalDocxPath, finalAudioPath }, "Successfully moved output files to Desktop");

    res.json({
      success: true,
      notes: notesContent,
      docxPath: finalDocxPath,
      audioPath: finalAudioPath,
      message: `Recording and notes processed successfully! Files saved to your Desktop.`
    });

  } catch (err: any) {
    logger.error({ err }, "Error processing recording pipeline");
    res.status(500).json({ 
      success: false, 
      error: `Failed to process recording: ${err.message || err}` 
    });
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.error({ cleanupErr }, "Failed to clean up temporary recording directory");
    }
  }
});

router.get("/record/status", (_req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, s]) => ({
    sessionId: id,
    label: s.label,
    startedAt: s.startedAt.toISOString(),
    durationSeconds: Math.floor((Date.now() - s.startedAt.getTime()) / 1000),
  }));
  res.json({ activeSessions: sessions.length, sessions });
});

export default router;
