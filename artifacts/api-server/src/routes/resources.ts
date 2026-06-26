import { Router } from "express";
import { db } from "@workspace/db";
import { resourcesTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/resources", async (req, res): Promise<void> => {
  const { courseId } = req.query as Record<string, string>;
  const conditions = courseId ? [eq(resourcesTable.courseId, courseId)] : [];
  const resources = await db.select().from(resourcesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(resourcesTable.createdAt);

  const enriched = await Promise.all(resources.map(async (r) => {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, r.courseId)).limit(1);
    return {
      ...r,
      courseName: course?.name ?? "",
      courseCode: course?.subjectCode ?? "",
    };
  }));

  res.json(enriched);
});

router.post("/resources", async (req, res): Promise<void> => {
  const { title, url, filePath, type, courseId } = req.body;
  if (!title || !type || !courseId) {
    res.status(400).json({ error: "title, type, courseId required" });
    return;
  }
  const [row] = await db.insert(resourcesTable).values({
    title, type, courseId,
    ...(url && { url }),
    ...(filePath && { filePath }),
  }).returning();

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  res.status(201).json({ ...row, courseName: course?.name ?? "", courseCode: course?.subjectCode ?? "" });
});

router.delete("/resources/:resourceId", async (req, res): Promise<void> => {
  await db.delete(resourcesTable).where(eq(resourcesTable.id, req.params.resourceId));
  res.status(204).end();
});

export default router;
