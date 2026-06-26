import { defineConfig } from "drizzle-kit";
import path from "path";

// Use NEXUSDESK_DB_URL to avoid collision with Replit's PostgreSQL DATABASE_URL
const dbUrl = process.env.NEXUSDESK_DB_URL || "file:./sqlite.db";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
