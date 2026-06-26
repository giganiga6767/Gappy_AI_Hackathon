import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourcesTable = sqliteTable("resources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  url: text("url"),
  filePath: text("file_path"),
  type: text("type").notNull().default("LINK"),
  courseId: text("course_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;
