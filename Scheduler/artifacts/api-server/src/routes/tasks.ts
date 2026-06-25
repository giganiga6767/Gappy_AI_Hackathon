import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const { category, status } = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (category) conditions.push(eq(tasksTable.category, category));
  if (status) conditions.push(eq(tasksTable.status, status));

  const rows = await db.select().from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);
  res.json(rows);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const { title, description, dueDate, category, priority, tags, linkedCourseId, linkedProjectId } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: "title, category required" });
    return;
  }
  const [row] = await db.insert(tasksTable).values({
    title,
    category,
    ...(description && { description }),
    ...(dueDate && { dueDate }),
    priority: priority ?? "MEDIUM",
    tags: tags ?? [],
    ...(linkedCourseId && { linkedCourseId }),
    ...(linkedProjectId && { linkedProjectId }),
  }).returning();
  res.status(201).json(row);
});

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  const [row] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.taskId)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const { title, description, dueDate, status, category, priority, tags } = req.body;
  const [row] = await db.update(tasksTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate }),
      ...(status && { status }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(tags !== undefined && { tags }),
    })
    .where(eq(tasksTable.id, req.params.taskId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  await db.delete(tasksTable).where(eq(tasksTable.id, req.params.taskId));
  res.status(204).end();
});

export default router;
