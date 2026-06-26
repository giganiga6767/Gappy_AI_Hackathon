import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("TODO"),
  category: text("category").notNull().default("ACADEMICS"),
  priority: text("priority").notNull().default("MEDIUM"),
  tags: text("tags"),
  linkedCourseId: text("linked_course_id"),
  linkedProjectId: text("linked_project_id"),
  studyPlan: text("study_plan"),
  studyMaterials: text("study_materials"),
  triageNote: text("triageNote"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("tasks_status_idx").on(table.status),
  index("tasks_category_idx").on(table.category),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_course_id_idx").on(table.linkedCourseId),
  index("tasks_due_date_idx").on(table.dueDate),
]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
