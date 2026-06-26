import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursesTable = sqliteTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  subjectCode: text("subject_code").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  creditWeight: real("credit_weight").notNull().default(3),
  minAttendancePct: real("min_attendance_pct").notNull().default(75),
  facultyName: text("faculty_name"),
  roomNumber: text("room_number"),
  color: text("color"),
  semesterId: text("semester_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("courses_semester_id_idx").on(table.semesterId),
  index("courses_subject_code_idx").on(table.subjectCode),
]);

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
