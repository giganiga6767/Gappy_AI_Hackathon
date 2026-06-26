import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceTable = sqliteTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  status: text("status").notNull().default("ATTENDED"),
  note: text("note"),
  markedAt: integer("marked_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  eventId: text("event_id").notNull(),
  courseId: text("course_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({
  id: true,
  createdAt: true,
  markedAt: true,
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type AttendanceRecord = typeof attendanceTable.$inferSelect;
