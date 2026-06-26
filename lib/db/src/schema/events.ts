import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  type: text("type").notNull().default("LECTURE"),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
  location: text("location"),
  isCancelled: integer("is_cancelled", { mode: "boolean" }).notNull().default(false),
  cancellationNote: text("cancellation_note"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringGroupId: text("recurring_group_id"),
  courseId: text("course_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
