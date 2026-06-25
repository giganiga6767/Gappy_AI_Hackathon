import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cgpaRecordsTable = pgTable("cgpa_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  semesterNumber: integer("semester_number").notNull(),
  semesterName: text("semester_name"),
  sgpa: real("sgpa"),
  creditsEarned: real("credits_earned").notNull().default(21),
  totalCredits: real("total_credits").notNull().default(21),
  isProjected: boolean("is_projected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCgpaRecordSchema = createInsertSchema(cgpaRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCgpaRecord = z.infer<typeof insertCgpaRecordSchema>;
export type CgpaRecord = typeof cgpaRecordsTable.$inferSelect;
