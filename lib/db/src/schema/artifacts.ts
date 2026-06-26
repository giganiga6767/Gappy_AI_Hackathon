import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artifactsTable = sqliteTable("artifacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  type: text("type").notNull().default("NOTE"), // 'NOTE', 'SUMMARY', 'REPORT', 'TRANSCRIPT', 'PDF', 'SLIDE', 'CODE'
  content: text("content"),
  filePath: text("file_path"),
  tags: text("tags"), // JSON stringified array
  linkedCourseId: text("linked_course_id"),
  linkedSessionId: text("linked_session_id"),
  linkedInboxId: text("linked_inbox_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertArtifactSchema = createInsertSchema(artifactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type Artifact = typeof artifactsTable.$inferSelect;
