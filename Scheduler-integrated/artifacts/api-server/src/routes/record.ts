import { Router } from "express";
import { spawn, type ChildProcess } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const router = Router();
let activeProcess: ChildProcess | null = null;
let currentOutputWav: string | null = null;
let sessionName: string | null = null;

router.post("/record/start", async (req, res): Promise<void> => {
  const { mode, name } = req.body; // mode: 'system' | 'mic', name: session name
  
  if (activeProcess) {
    res.status(400).json({ error: "Recording is already in progress" });
    return;
  }

  sessionName = name || `session_${Date.now()}`;
  const sanitizedSessionName = sessionName!.replace(/[^a-zA-Z0-9_]/g, "_");
  
  // Set up path in Desktop notes or temporary directory
  const outputDir = path.join(os.homedir(), "Desktop", "notes", sanitizedSessionName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  currentOutputWav = path.join(outputDir, `${sanitizedSessionName}.wav`);
  const platform = os.platform();
  let cmd = "";
  let args: string[] = [];

  req.log.info({ platform, mode, currentOutputWav }, "Starting loopback background recording");

  if (platform === "linux") {
    if (mode === "system") {
      // PulseAudio/PipeWire loopback record
      cmd = "parecord";
      args = ["-d", "@DEFAULT_MONITOR@", currentOutputWav];
    } else {
      // Mic record
      cmd = "arecord";
      args = ["-f", "S16_LE", "-c", "1", "-r", "16000", currentOutputWav];
    }
  } else if (platform === "win32") {
    // Windows FFmpeg WASAPI audio capture
    cmd = "ffmpeg";
    if (mode === "system") {
      args = ["-y", "-f", "wasapi", "-i", "audio=default", currentOutputWav];
    } else {
      args = ["-y", "-f", "dshow", "-i", "audio=default", currentOutputWav];
    }
  } else if (platform === "darwin") {
    // macOS AVFoundation audio capture
    cmd = "ffmpeg";
    if (mode === "system") {
      args = ["-y", "-f", "avfoundation", "-i", ":default", currentOutputWav];
    } else {
      args = ["-y", "-f", "avfoundation", "-i", ":0", currentOutputWav];
    }
  } else {
    res.status(500).json({ error: `Unsupported platform for loopback recording: ${platform}` });
    return;
  }

  try {
    activeProcess = spawn(cmd, args);
    
    activeProcess.on("error", (err) => {
      req.log.error({ err }, "Recording process startup failed");
      activeProcess = null;
      currentOutputWav = null;
    });

    activeProcess.on("exit", (code, signal) => {
      req.log.info({ code, signal }, "Recording process exited");
      activeProcess = null;
    });

    res.json({ success: true, sessionName, outputFile: currentOutputWav });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to spawn recording process: ${err.message}` });
  }
});

router.post("/record/stop", async (req, res): Promise<void> => {
  if (!activeProcess || !currentOutputWav) {
    res.status(400).json({ error: "No active recording to stop" });
    return;
  }

  req.log.info("Stopping recording process...");

  // Gracefully terminate the process
  activeProcess.kill("SIGTERM");
  activeProcess = null;

  const wavPath = currentOutputWav;
  currentOutputWav = null;

  // Let's run ffmpeg to compress the WAV to MP3 to save space
  const mp3Path = wavPath.replace(/\.wav$/, ".mp3");
  const ffmpegCmd = "ffmpeg";
  const ffmpegArgs = ["-y", "-i", wavPath, "-ac", "1", "-ar", "16000", "-ab", "32k", mp3Path];

  req.log.info({ wavPath, mp3Path }, "Compressing audio via FFmpeg");

  const compressor = spawn(ffmpegCmd, ffmpegArgs);

  compressor.on("close", (code) => {
    if (code === 0) {
      req.log.info("Audio compressed successfully. Deleting raw WAV...");
      fs.unlink(wavPath, (err) => {
        if (err) req.log.error({ err }, "Failed to delete raw WAV");
      });
    } else {
      req.log.warn({ code }, "FFmpeg compression returned non-zero code. Keeping raw WAV");
    }
  });

  res.json({
    success: true,
    sessionName,
    outputWav: wavPath,
    outputMp3: mp3Path,
    message: "Recording stopped and compression started in the background."
  });
});

export default router;
