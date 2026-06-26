const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");

/**
 * Emit an event asynchronously to the Lemma agentic backend.
 * This pattern decouples HTTP routes from background calculations.
 */
export async function emitEvent(event: string, data: any): Promise<void> {
  try {
    fetch(`${BACKEND_URL}/api/agent/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
      signal: AbortSignal.timeout(5000),
    }).catch(err => {
      // Catch network-level errors in fire-and-forget fetch
      console.warn(`[EventEmit] Failed to deliver event ${event} to backend:`, err.message);
    });
  } catch (err: any) {
    console.warn(`[EventEmit] Failed to emit event ${event}:`, err.message);
  }
}
