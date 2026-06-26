import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Use NEXUSDESK_DB_URL to avoid collision with Replit's PostgreSQL DATABASE_URL
const dbUrl = process.env.NEXUSDESK_DB_URL || "file:./sqlite.db";

export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
