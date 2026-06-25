import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursesTable = pgTable("courses", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
