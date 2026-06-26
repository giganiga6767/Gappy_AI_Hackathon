import * as dotenv from "dotenv";

dotenv.config({ path: require("path").resolve(__dirname, "../../../.env") });

function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim().replace(/^["']|["']$/g, "").trim();
  const lower = cleaned.toLowerCase();
  if (
    !cleaned ||
    lower.includes("placeholder") ||
    lower.includes("your_") ||
    cleaned.length < 10
  ) {
    return undefined;
  }
  if (!cleaned.startsWith("AIzaSy") && !cleaned.startsWith("AQ.")) {
    return undefined;
  }
  return cleaned;
}

export function resolveGeminiApiKey(): string | undefined {
  return (
    sanitizeApiKey(process.env.GEMINI_API_KEY) ||
    sanitizeApiKey(process.env.GOOGLE_API_KEY) ||
    sanitizeApiKey(process.env.ANTIGRAVITY_API_KEY)
  );
}

export async function callGemini(prompt: string): Promise<string> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: Error | null = null;

  for (const model of models) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(180000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${model}): ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Empty response from Gemini API (${model})`);
        return text.trim();
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

export function stripMarkdownFences(text: string): string {
  return text.replace(/```json|```/g, "").trim();
}

export function parseGeminiJson<T>(text: string): T {
  const clean = stripMarkdownFences(text);
  try {
    return JSON.parse(clean) as T;
  } catch {
    const jsonMatch = clean.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");
    return JSON.parse(jsonMatch[0]) as T;
  }
}
