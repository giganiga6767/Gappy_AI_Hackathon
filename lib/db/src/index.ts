import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Resolve DB URL: use DATABASE_URL if it is SQLite (local-first), otherwise use NEXUSDESK_DB_URL (Replit compatibility)
const getDbUrl = () => {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("postgres:") && !envUrl.startsWith("postgresql:")) {
    return envUrl;
  }
  return process.env.NEXUSDESK_DB_URL || "file:./sqlite.db";
};
const dbUrl = getDbUrl();

export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
