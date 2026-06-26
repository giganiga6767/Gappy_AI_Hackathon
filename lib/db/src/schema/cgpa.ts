import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cgpaRecordsTable = sqliteTable("cgpa_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  semesterNumber: integer("semester_number").notNull(),
  semesterName: text("semester_name"),
  sgpa: real("sgpa"),
  creditsEarned: real("credits_earned").notNull().default(21),
  totalCredits: real("total_credits").notNull().default(21),
  isProjected: integer("is_projected", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertCgpaRecordSchema = createInsertSchema(cgpaRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCgpaRecord = z.infer<typeof insertCgpaRecordSchema>;
export type CgpaRecord = typeof cgpaRecordsTable.$inferSelect;
