import { defineConfig } from "drizzle-kit";
import path from "path";

// Resolve DB URL: use DATABASE_URL if it is SQLite (local-first), otherwise use NEXUSDESK_DB_URL (Replit compatibility)
const getDbUrl = () => {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("postgres:") && !envUrl.startsWith("postgresql:")) {
    return envUrl;
  }
  return process.env.NEXUSDESK_DB_URL || "file:./sqlite.db";
};
const dbUrl = getDbUrl();

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
