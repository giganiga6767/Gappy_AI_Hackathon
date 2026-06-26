import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gradesTable = sqliteTable("grades", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  examType: text("exam_type").notNull().default("CIE"),
  label: text("label").notNull(),
  obtainedMarks: real("obtained_marks").notNull(),
  maxMarks: real("max_marks").notNull(),
  scaledOutOf: real("scaled_out_of"),
  date: text("date"),
  notes: text("notes"),
  isScaled: integer("is_scaled", { mode: "boolean" }).notNull().default(false),
  courseId: text("course_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type GradeItem = typeof gradesTable.$inferSelect;
