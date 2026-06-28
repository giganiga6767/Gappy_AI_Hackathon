import { createClient, type Client } from "@libsql/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function getDbUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  const rootDir = path.resolve(__dirname, "../../..");
  if (envUrl && !envUrl.startsWith("postgres:") && !envUrl.startsWith("postgresql:")) {
    if (envUrl.startsWith("file:") && !envUrl.startsWith("file:/")) {
      const relativePath = envUrl.substring(5);
      return `file:${path.resolve(rootDir, relativePath)}`;
    }
    return envUrl;
  }
  return process.env.NEXUSDESK_DB_URL || `file:${path.join(rootDir, "sqlite.db")}`;
}

let _client: Client | null = null;

export function getDbClient(): Client {
  if (!_client) {
    _client = createClient({ url: getDbUrl() });
  }
  return _client;
}

export async function ensureColumn(
  table: string,
  column: string,
  definition: string
): Promise<void> {
  try {
    const client = getDbClient();
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column may already exist
  }
}

export function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return raw ? [raw] : [];
    }
  }
  return [];
}

export function tagsContain(raw: unknown, needle: string): boolean {
  return parseTags(raw).some((t) => t.includes(needle));
}
