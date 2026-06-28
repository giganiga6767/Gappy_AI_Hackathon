import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

import path from "path";

// Resolve DB URL: use DATABASE_URL if it is SQLite (local-first), otherwise use NEXUSDESK_DB_URL (Replit compatibility)
const getDbUrl = () => {
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
};
const dbUrl = getDbUrl();

export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
