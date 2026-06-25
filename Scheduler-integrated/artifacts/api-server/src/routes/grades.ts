import { Router } from "express";
import { db } from "@workspace/db";
import { gradesTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function computePercentage(obtained: number, max: number, scaledOutOf: number | null, isScaled: boolean): number {
  if (isScaled && scaledOutOf && scaledOutOf > 0) {
    return Math.round((obtained / max) * scaledOutOf * 10) / 10;
  }
  return max === 0 ? 0 : Math.round((obtained / max) * 1000) / 10;
}

function enrichGrade(g: typeof gradesTable.$inferSelect) {
  return {
    ...g,
    percentage: computePercentage(g.obtainedMarks, g.maxMarks, g.scaledOutOf ?? null, g.isScaled),
  };
}

router.get("/grades", async (req, res): Promise<void> => {
  const { courseId } = req.query as Record<string, string>;
  const conditions = courseId ? [eq(gradesTable.courseId, courseId)] : [];
  const rows = await db.select().from(gradesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(gradesTable.createdAt);
  res.json(rows.map(enrichGrade));
});

router.post("/grades", async (req, res): Promise<void> => {
  const { examType, label, obtainedMarks, maxMarks, scaledOutOf, date, notes, isScaled, courseId } = req.body;
  if (!examType || !label || obtainedMarks === undefined || !maxMarks || !courseId) {
    res.status(400).json({ error: "examType, label, obtainedMarks, maxMarks, courseId required" });
    return;
  }
  const [row] = await db.insert(gradesTable).values({
    examType, label,
    obtainedMarks: Number(obtainedMarks),
    maxMarks: Number(maxMarks),
    isScaled: isScaled ?? false,
    courseId,
    ...(scaledOutOf !== undefined && { scaledOutOf: Number(scaledOutOf) }),
    ...(date && { date }),
    ...(notes && { notes }),
  }).returning();
  res.status(201).json(enrichGrade(row));
});

router.patch("/grades/:gradeId", async (req, res): Promise<void> => {
  const { label, obtainedMarks, maxMarks, scaledOutOf, isScaled, notes } = req.body;
  const [row] = await db.update(gradesTable)
    .set({
      ...(label && { label }),
      ...(obtainedMarks !== undefined && { obtainedMarks: Number(obtainedMarks) }),
      ...(maxMarks !== undefined && { maxMarks: Number(maxMarks) }),
      ...(scaledOutOf !== undefined && { scaledOutOf: scaledOutOf !== null ? Number(scaledOutOf) : null }),
      ...(isScaled !== undefined && { isScaled }),
      ...(notes !== undefined && { notes }),
    })
    .where(eq(gradesTable.id, req.params.gradeId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(enrichGrade(row));
});

router.delete("/grades/:gradeId", async (req, res): Promise<void> => {
  await db.delete(gradesTable).where(eq(gradesTable.id, req.params.gradeId));
  res.status(204).end();
});

router.get("/grades/course/:courseId/summary", async (req, res): Promise<void> => {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, req.params.courseId)).limit(1);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const items = await db.select().from(gradesTable).where(eq(gradesTable.courseId, req.params.courseId)).orderBy(gradesTable.createdAt);
  const enriched = items.map(enrichGrade);

  const totalObtained = enriched.reduce((s, g) => s + g.obtainedMarks, 0);
  const totalMax = enriched.reduce((s, g) => s + g.maxMarks, 0);
  const percentage = totalMax === 0 ? 0 : Math.round((totalObtained / totalMax) * 1000) / 10;

  res.json({
    courseId: course.id,
    courseName: course.name,
    subjectCode: course.subjectCode,
    items: enriched,
    totalObtained,
    totalMax,
    percentage,
  });
});

export default router;
