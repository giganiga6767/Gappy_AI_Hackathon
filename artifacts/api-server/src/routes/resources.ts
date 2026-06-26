import { Router } from "express";
import { db, client } from "@workspace/db";
import { resourcesTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function ensureResourceColumns(): Promise<void> {
  for (const sql of [
    "ALTER TABLE resources ADD COLUMN description TEXT",
    "ALTER TABLE resources ADD COLUMN source TEXT",
  ]) {
    try {
      await client.execute(sql);
    } catch {
      // Column may already exist
    }
  }
}

router.get("/resources", async (req, res): Promise<void> => {
  await ensureResourceColumns();
  const { courseId } = req.query as Record<string, string>;
  const conditions = courseId ? [eq(resourcesTable.courseId, courseId)] : [];
  const resources = await db.select().from(resourcesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(resourcesTable.createdAt);

  const enriched = await Promise.all(resources.map(async (r) => {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, r.courseId)).limit(1);
    const extra = await client.execute({
      sql: "SELECT description, source FROM resources WHERE id = ?",
      args: [r.id],
    });
    const row = extra.rows[0] as { description?: string; source?: string } | undefined;
    return {
      ...r,
      description: row?.description ?? null,
      source: row?.source ?? "manual",
      courseName: course?.name ?? "",
      courseCode: course?.subjectCode ?? "",
    };
  }));

  res.json(enriched);
});

router.post("/resources", async (req, res): Promise<void> => {
  await ensureResourceColumns();
  const { title, url, filePath, type, courseId, description } = req.body;
  if (!title || !type || !courseId) {
    res.status(400).json({ error: "title, type, courseId required" });
    return;
  }
  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO resources (id, title, url, file_path, type, course_id, description, source, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?)`,
    args: [id, title, url || null, filePath || null, type, courseId, description || null, Date.now()],
  });

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  res.status(201).json({
    id,
    title,
    url: url ?? null,
    filePath: filePath ?? null,
    type,
    courseId,
    description: description ?? null,
    source: "manual",
    courseName: course?.name ?? "",
    courseCode: course?.subjectCode ?? "",
  });
});

router.delete("/resources/:resourceId", async (req, res): Promise<void> => {
  await db.delete(resourcesTable).where(eq(resourcesTable.id, req.params.resourceId));
  res.status(204).end();
});

export default router;
