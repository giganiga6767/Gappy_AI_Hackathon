import { pgTable, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gradesTable = pgTable("grades", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  examType: text("exam_type").notNull().default("CIE"),
  label: text("label").notNull(),
  obtainedMarks: real("obtained_marks").notNull(),
  maxMarks: real("max_marks").notNull(),
  scaledOutOf: real("scaled_out_of"),
  date: text("date"),
  notes: text("notes"),
  isScaled: boolean("is_scaled").notNull().default(false),
  courseId: text("course_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type GradeItem = typeof gradesTable.$inferSelect;
