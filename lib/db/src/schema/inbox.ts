import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inboxTable = sqliteTable("inbox", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'audio', 'pdf', 'image', 'syllabus', 'notes', 'text', 'recording'
  status: text("status").notNull().default("captured"), // 'captured', 'understood', 'applied'
  filePath: text("file_path"), // path to the captured file (audio/pdf/image)
  rawText: text("raw_text"), // raw text content or transcribed content
  analysis: text("analysis"), // JSON string representing the understood entities (courses, sessions, artifacts, actions)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertInboxSchema = createInsertSchema(inboxTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InboxItem = typeof inboxTable.$inferSelect;
