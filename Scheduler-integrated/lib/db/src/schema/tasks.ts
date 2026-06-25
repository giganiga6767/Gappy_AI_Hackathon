import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("TODO"),
  category: text("category").notNull().default("ACADEMICS"),
  priority: text("priority").notNull().default("MEDIUM"),
  tags: text("tags").array().notNull().default([]),
  linkedCourseId: text("linked_course_id"),
  linkedProjectId: text("linked_project_id"),
  confidenceScore: integer("confidence_score"),
  reasoningQuote: text("reasoning_quote"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
