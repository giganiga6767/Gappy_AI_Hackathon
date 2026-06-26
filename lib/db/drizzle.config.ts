import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:/home/niranjan/Desktop/Gappy_AI_Hackathon/sqlite.db";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
