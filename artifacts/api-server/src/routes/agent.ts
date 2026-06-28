import { Router } from "express";

const router = Router();

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");

async function proxyToBackend(
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(180000),
  });

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || "Invalid response from backend" };
  }

  return { status: response.status, body };
}

router.get("/agent/study-plan/preview", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/study-plan/preview");
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.post("/agent/study-plan", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/study-plan", { method: "POST" });
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.get("/agent/triage/preview", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/triage/preview");
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.post("/agent/triage", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/triage", { method: "POST" });
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.get("/agent/recommend-resources/preview", async (req, res): Promise<void> => {
  try {
    const qs = new URLSearchParams();
    if (req.query.courseId) qs.set("courseId", String(req.query.courseId));
    if (req.query.topic) qs.set("topic", String(req.query.topic));
    const query = qs.toString();
    const { status, body } = await proxyToBackend(
      `/api/agent/recommend-resources/preview${query ? `?${query}` : ""}`
    );
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.post("/agent/recommend-resources", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/recommend-resources", {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.get("/agent/conversations", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/agent/conversations");
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.get("/agent/conversations/:convId/messages", async (req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend(`/api/agent/conversations/${req.params.convId}/messages`);
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

export default router;
