import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/attendance", async (req, res): Promise<void> => {
  const { semesterId } = req.query as Record<string, string>;

  // Get all courses (optionally filtered by semester)
  const courseConditions = semesterId ? [eq(coursesTable.semesterId, semesterId)] : [];
  const courses = await db.select().from(coursesTable)
    .where(courseConditions.length ? and(...courseConditions) : undefined);

  const summaries = await Promise.all(courses.map(async (course) => {
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.courseId, course.id));
    const attended = records.filter(r => r.status === "ATTENDED").length;
    const missed = records.filter(r => r.status === "ABSENT" || r.status === "MISSED").length;
    const cancelled = records.filter(r => r.status === "CANCELLED").length;
    const totalRecords = attended + missed;
    const effectivePct = totalRecords === 0 ? 100 : Math.round((attended / totalRecords) * 1000) / 10;
    const targetPct = course.minAttendancePct;
    const isAtRisk = effectivePct < targetPct;
    const canSkip = totalRecords === 0 ? 999 : Math.max(0, Math.floor((attended - (targetPct / 100) * totalRecords) / (targetPct / 100)));
    const mustAttend = effectivePct >= targetPct ? 0 : Math.max(0, Math.ceil((targetPct / 100 * totalRecords - attended) / (1 - targetPct / 100)));

    return {
      courseId: course.id,
      subjectCode: course.subjectCode,
      courseName: course.name,
      color: course.color ?? null,
      totalRecords,
      attended,
      missed,
      cancelled,
      effectivePct,
      isAtRisk,
      targetPct,
      canSkip,
      mustAttend,
    };
  }));

  res.json(summaries);
});

router.post("/attendance/mark", async (req, res): Promise<void> => {
  const { eventId, courseId, status, note } = req.body;
  if (!eventId || !courseId || !status) {
    res.status(400).json({ error: "eventId, courseId, status required" });
    return;
  }

  // Upsert: check if record exists
  const [existing] = await db.select().from(attendanceTable)
    .where(and(eq(attendanceTable.eventId, eventId), eq(attendanceTable.courseId, courseId)))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(attendanceTable)
      .set({ status, ...(note !== undefined && { note }), markedAt: new Date() })
      .where(eq(attendanceTable.id, existing.id))
      .returning();
    res.json(updated);
    return;
  }

  const [row] = await db.insert(attendanceTable).values({
    eventId, courseId, status,
    ...(note && { note }),
  }).returning();
  res.json(row);
});

router.get("/attendance/summary/:courseId", async (req, res): Promise<void> => {
  const courseId = req.params.courseId;
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const records = await db.select().from(attendanceTable).where(eq(attendanceTable.courseId, courseId));
  const attended = records.filter(r => r.status === "ATTENDED").length;
  const missed = records.filter(r => r.status === "ABSENT" || r.status === "MISSED").length;
  const totalClasses = attended + missed;
  const effectivePct = totalClasses === 0 ? 100 : Math.round((attended / totalClasses) * 1000) / 10;
  const minPct = course.minAttendancePct;
  const isAtRisk = effectivePct < minPct;
  const canSkip = totalClasses === 0 ? 999 : Math.max(0, Math.floor((attended - (minPct / 100) * totalClasses) / (minPct / 100)));
  const mustAttend = effectivePct >= minPct ? 0 : Math.max(0, Math.ceil((minPct / 100 * totalClasses - attended) / (1 - minPct / 100)));

  res.json({
    effectivePct,
    canSkip,
    mustAttend,
    totalClasses,
    attended,
    missed,
    isAtRisk,
  });
});

export default router;
