import { Router } from "express";
import { db } from "@workspace/db";
import { coursesTable, attendanceTable, eventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

async function getCourseWithStats(courseId: string) {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) return null;

  const records = await db.select().from(attendanceTable).where(eq(attendanceTable.courseId, courseId));
  const attended = records.filter(r => r.status === "ATTENDED").length;
  const missed = records.filter(r => r.status === "MISSED").length;
  const cancelled = records.filter(r => r.status === "CANCELLED").length;
  const totalClasses = attended + missed;
  const effectivePct = totalClasses === 0 ? 100 : Math.round((attended / totalClasses) * 1000) / 10;
  const minPct = course.minAttendancePct;
  const isAtRisk = effectivePct < minPct;

  // canSkip: how many classes can be missed while staying at minPct
  // attended / (total + canSkip) >= minPct/100 => canSkip = floor((attended - minPct/100 * total) / (minPct/100))
  const canSkip = totalClasses === 0 ? 999 : Math.max(0, Math.floor((attended - (minPct / 100) * totalClasses) / (minPct / 100)));
  // mustAttend: how many consecutive classes needed to reach minPct
  const mustAttend = effectivePct >= minPct ? 0 : Math.max(0, Math.ceil((minPct / 100 * totalClasses - attended) / (1 - minPct / 100)));

  return { ...course, totalClasses, attended, missed, cancelled, effectivePct, isAtRisk, canSkip, mustAttend };
}

router.get("/courses", async (req, res): Promise<void> => {
  const { semesterId } = req.query as Record<string, string>;
  const conditions = semesterId ? [eq(coursesTable.semesterId, semesterId)] : [];
  const courses = await db.select().from(coursesTable).where(conditions.length ? and(...conditions) : undefined).orderBy(coursesTable.createdAt);

  const withStats = await Promise.all(courses.map(c => getCourseWithStats(c.id)));
  res.json(withStats.filter(Boolean));
});

router.post("/courses", async (req, res): Promise<void> => {
  const { subjectCode, name, shortName, creditWeight, minAttendancePct, facultyName, roomNumber, color, semesterId } = req.body;
  if (!subjectCode || !name || !shortName || !semesterId) {
    res.status(400).json({ error: "subjectCode, name, shortName, semesterId required" });
    return;
  }
  const [row] = await db.insert(coursesTable).values({
    subjectCode, name, shortName, semesterId,
    creditWeight: creditWeight ?? 3,
    minAttendancePct: minAttendancePct ?? 75,
    ...(facultyName && { facultyName }),
    ...(roomNumber && { roomNumber }),
    ...(color && { color }),
  }).returning();
  res.status(201).json(row);
});

router.get("/courses/:courseId", async (req, res): Promise<void> => {
  const stats = await getCourseWithStats(req.params.courseId);
  if (!stats) { res.status(404).json({ error: "Not found" }); return; }
  res.json(stats);
});

router.patch("/courses/:courseId", async (req, res): Promise<void> => {
  const { name, shortName, creditWeight, minAttendancePct, facultyName, roomNumber, color } = req.body;
  const [row] = await db.update(coursesTable)
    .set({
      ...(name && { name }),
      ...(shortName && { shortName }),
      ...(creditWeight !== undefined && { creditWeight }),
      ...(minAttendancePct !== undefined && { minAttendancePct }),
      ...(facultyName !== undefined && { facultyName }),
      ...(roomNumber !== undefined && { roomNumber }),
      ...(color !== undefined && { color }),
    })
    .where(eq(coursesTable.id, req.params.courseId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/courses/:courseId", async (req, res): Promise<void> => {
  await db.delete(coursesTable).where(eq(coursesTable.id, req.params.courseId));
  res.status(204).end();
});

export default router;
