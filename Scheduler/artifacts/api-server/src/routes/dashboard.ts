import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, attendanceTable, tasksTable, projectsTable, coursesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const today = new Date();
  const dayStart = new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z");
  const dayEnd = new Date(today.toISOString().split("T")[0] + "T23:59:59.999Z");

  // Today's events
  const todayEvents = await db.select().from(eventsTable)
    .where(and(gte(eventsTable.startTime, dayStart), lte(eventsTable.startTime, dayEnd)))
    .orderBy(eventsTable.startTime);

  // Get attendance for today's events
  const todayAttended = await Promise.all(todayEvents.map(async (e) => {
    if (!e.courseId) return null;
    const [att] = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.eventId, e.id), eq(attendanceTable.courseId, e.courseId)))
      .limit(1);
    return att;
  }));

  const attended = todayAttended.filter(a => a?.status === "ATTENDED").length;
  const missed = todayAttended.filter(a => a?.status === "MISSED").length;

  // Courses at risk
  const courses = await db.select().from(coursesTable);
  let atRiskCount = 0;
  let totalAttPct = 0;
  let totalCourses = 0;

  for (const course of courses) {
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.courseId, course.id));
    const att = records.filter(r => r.status === "ATTENDED").length;
    const miss = records.filter(r => r.status === "MISSED").length;
    const total = att + miss;
    const pct = total === 0 ? 100 : (att / total) * 100;
    if (pct < course.minAttendancePct) atRiskCount++;
    totalAttPct += pct;
    totalCourses++;
  }

  const overallAttendancePct = totalCourses === 0 ? 100 : Math.round(totalAttPct / totalCourses * 10) / 10;

  // Pending tasks
  const pendingTasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.status, "TODO")));

  // Active projects
  const activeProjects = await db.select().from(projectsTable)
    .where(eq(projectsTable.status, "ACTIVE"));

  // Upcoming exams (next 14 days)
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingExams = await db.select().from(eventsTable)
    .where(and(
      eq(eventsTable.type, "EXAM"),
      gte(eventsTable.startTime, today),
      lte(eventsTable.startTime, twoWeeks),
    ))
    .orderBy(eventsTable.startTime);

  const enrichedExams = upcomingExams.map(e => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    courseShortName: null,
    courseColor: null,
    attendanceStatus: null,
    durationMinutes: Math.round((e.endTime.getTime() - e.startTime.getTime()) / 60000),
  }));

  res.json({
    todayEventCount: todayEvents.length,
    attendanceAtRiskCount: atRiskCount,
    pendingTaskCount: pendingTasks.length,
    activeProjectCount: activeProjects.length,
    overallAttendancePct,
    todayAttended: attended,
    todayMissed: missed,
    upcomingExams: enrichedExams,
  });
});

export default router;
