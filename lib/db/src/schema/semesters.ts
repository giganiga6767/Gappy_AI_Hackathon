import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const semestersTable = sqliteTable("semesters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertSemesterSchema = createInsertSchema(semestersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSemester = z.infer<typeof insertSemesterSchema>;
export type Semester = typeof semestersTable.$inferSelect;
