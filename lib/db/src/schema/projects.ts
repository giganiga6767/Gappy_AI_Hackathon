import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("PLANNING"),
  components: text("components"), // Store as stringified JSON in SQLite
  githubUrl: text("github_url"),
  notionUrl: text("notion_url"),
  startDate: text("start_date"),
  targetDate: text("target_date"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const milestonesTable = sqliteTable("milestones", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("PENDING"),
  targetDate: text("target_date"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  projectId: text("project_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const projectLogsTable = sqliteTable("project_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  date: text("date").notNull().$defaultFn(() => new Date().toISOString().split("T")[0]),
  projectId: text("project_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProjectLogSchema = createInsertSchema(projectLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type InsertProjectLog = z.infer<typeof insertProjectLogSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type Milestone = typeof milestonesTable.$inferSelect;
export type ProjectLog = typeof projectLogsTable.$inferSelect;
