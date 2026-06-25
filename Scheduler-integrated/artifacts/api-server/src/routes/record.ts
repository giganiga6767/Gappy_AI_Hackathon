import { Router } from "express";
import { logger } from "../lib/logger";

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
