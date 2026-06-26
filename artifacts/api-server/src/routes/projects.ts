import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, milestonesTable, projectLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

async function getProjectSummary(project: typeof projectsTable.$inferSelect) {
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.projectId, project.id)).orderBy(milestonesTable.createdAt);
  const completedMilestones = milestones.filter(m => m.status === "COMPLETED").length;
  return {
    ...project,
    milestoneCount: milestones.length,
    completedMilestones,
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  const withStats = await Promise.all(projects.map(getProjectSummary));
  res.json(withStats);
});

router.post("/projects", async (req, res): Promise<void> => {
  const { name, description, status, components, githubUrl, notionUrl, startDate, targetDate } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [row] = await db.insert(projectsTable).values({
    name,
    status: status ?? "PLANNING",
    components: components ?? [],
    ...(description && { description }),
    ...(githubUrl && { githubUrl }),
    ...(notionUrl && { notionUrl }),
    ...(startDate && { startDate }),
    ...(targetDate && { targetDate }),
  }).returning();
  res.status(201).json(row);
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, req.params.projectId)).limit(1);
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.projectId, project.id)).orderBy(milestonesTable.createdAt);
  const logs = await db.select().from(projectLogsTable).where(eq(projectLogsTable.projectId, project.id)).orderBy(desc(projectLogsTable.createdAt));

  res.json({ ...project, milestones, logs });
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const { name, description, status, components, githubUrl, notionUrl, targetDate } = req.body;
  const [row] = await db.update(projectsTable)
    .set({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(components !== undefined && { components }),
      ...(githubUrl !== undefined && { githubUrl }),
      ...(notionUrl !== undefined && { notionUrl }),
      ...(targetDate !== undefined && { targetDate }),
    })
    .where(eq(projectsTable.id, req.params.projectId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  await db.delete(milestonesTable).where(eq(milestonesTable.projectId, req.params.projectId));
  await db.delete(projectLogsTable).where(eq(projectLogsTable.projectId, req.params.projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, req.params.projectId));
  res.status(204).end();
});

router.post("/projects/:projectId/milestones", async (req, res): Promise<void> => {
  const { title, description, status, targetDate } = req.body;
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const [row] = await db.insert(milestonesTable).values({
    title,
    projectId: req.params.projectId,
    status: status ?? "PENDING",
    ...(description && { description }),
    ...(targetDate && { targetDate }),
  }).returning();
  res.status(201).json(row);
});

router.patch("/projects/milestones/:milestoneId", async (req, res): Promise<void> => {
  const { title, description, status, targetDate, completedAt } = req.body;
  const [row] = await db.update(milestonesTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(targetDate !== undefined && { targetDate }),
      ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
    })
    .where(eq(milestonesTable.id, req.params.milestoneId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.post("/projects/:projectId/logs", async (req, res): Promise<void> => {
  const { content, date } = req.body;
  if (!content) {
    res.status(400).json({ error: "content required" });
    return;
  }
  const [row] = await db.insert(projectLogsTable).values({
    content,
    projectId: req.params.projectId,
    date: date ?? new Date().toISOString().split("T")[0],
  }).returning();
  res.status(201).json(row);
});

export default router;
