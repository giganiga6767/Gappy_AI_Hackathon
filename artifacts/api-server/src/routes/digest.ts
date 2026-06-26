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

router.post("/digest/generate", async (_req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/digest/generate", { method: "POST" });
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

router.get("/digest/latest", async (_req, res): Promise<void> => {
  try {
    const { status, body } = await proxyToBackend("/api/digest/latest");
    res.status(status).json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    res.status(503).json({ error: message });
  }
});

export default router;
