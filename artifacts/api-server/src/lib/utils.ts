/**
 * Clean and validate an API key. Returns undefined if the key is a placeholder or invalid.
 */
export function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  // Trim and strip wrapping quotes
  let cleaned = key.trim().replace(/^["']|["']$/g, "").trim();
  
  const lower = cleaned.toLowerCase();
  if (
    !cleaned ||
    lower.includes("placeholder") ||
    lower.includes("your_") ||
    lower.includes("your-") ||
    lower.includes("insert_") ||
    lower.includes("example") ||
    lower.includes("<your") ||
    lower === "undefined" ||
    lower === "null" ||
    cleaned.length < 10
  ) {
    return undefined;
  }
  
  return cleaned;
}

/**
 * Resolve the Gemini API key, preferring the client-supplied key if valid,
 * otherwise falling back to environment variables.
 */
export function resolveGeminiApiKey(clientKey?: string): string | undefined {
  const sanitizedClient = sanitizeApiKey(clientKey);
  if (sanitizedClient) {
    return sanitizedClient;
  }

  // Fallback to environment variables, sanitizing them as well
  return (
    sanitizeApiKey(process.env.GEMINI_API_KEY) ||
    sanitizeApiKey(process.env.GOOGLE_API_KEY) ||
    sanitizeApiKey(process.env.ANTIGRAVITY_API_KEY)
  );
}
