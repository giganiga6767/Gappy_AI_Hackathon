import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Use absolute path to ensure both CLI and API server share the exact same local file
const dbUrl = process.env.DATABASE_URL || "file:/home/niranjan/Desktop/Gappy_AI_Hackathon/sqlite.db";

export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
