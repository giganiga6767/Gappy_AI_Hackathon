import { Router } from "express";
import { db } from "@workspace/db";
import { semestersTable, coursesTable, eventsTable, attendanceTable, gradesTable, tasksTable, resourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/semesters", async (req, res): Promise<void> => {
  const rows = await db.select().from(semestersTable).orderBy(semestersTable.createdAt);
  res.json(rows);
});

router.post("/semesters", async (req, res): Promise<void> => {
  const { name, startDate, endDate, isActive } = req.body;
  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: "name, startDate, endDate required" });
    return;
  }
  if (new Date(endDate) < new Date(startDate)) {
    res.status(400).json({ error: "End date cannot be before start date" });
    return;
  }
  if (isActive) {
    await db.update(semestersTable).set({ isActive: false });
  }
  const [row] = await db.insert(semestersTable).values({ name, startDate, endDate, isActive: isActive ?? false }).returning();
  res.status(201).json(row);
});

router.get("/semesters/active", async (req, res): Promise<void> => {
  const [row] = await db.select().from(semestersTable).where(eq(semestersTable.isActive, true)).limit(1);
  if (!row) { res.status(404).json({ error: "No active semester" }); return; }
  res.json(row);
});

router.get("/semesters/:semesterId", async (req, res): Promise<void> => {
  const [row] = await db.select().from(semestersTable).where(eq(semestersTable.id, req.params.semesterId)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/semesters/:semesterId", async (req, res): Promise<void> => {
  const { name, startDate, endDate, isActive } = req.body;
  if (startDate || endDate) {
    const [existing] = await db.select().from(semestersTable).where(eq(semestersTable.id, req.params.semesterId)).limit(1);
    if (existing) {
      const finalStart = startDate || existing.startDate;
      const finalEnd = endDate || existing.endDate;
      if (new Date(finalEnd) < new Date(finalStart)) {
        res.status(400).json({ error: "End date cannot be before start date" });
        return;
      }
    }
  }
  if (isActive) {
    await db.update(semestersTable).set({ isActive: false });
  }
  const [row] = await db.update(semestersTable)
    .set({ ...(name && { name }), ...(startDate && { startDate }), ...(endDate && { endDate }), ...(isActive !== undefined && { isActive }) })
    .where(eq(semestersTable.id, req.params.semesterId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/semesters/:semesterId", async (req, res): Promise<void> => {
  const semId = req.params.semesterId;
  const courses = await db.select().from(coursesTable).where(eq(coursesTable.semesterId, semId));
  for (const course of courses) {
    await db.delete(eventsTable).where(eq(eventsTable.courseId, course.id));
    await db.delete(attendanceTable).where(eq(attendanceTable.courseId, course.id));
    await db.delete(gradesTable).where(eq(gradesTable.courseId, course.id));
    await db.delete(tasksTable).where(eq(tasksTable.linkedCourseId, course.id));
    await db.delete(resourcesTable).where(eq(resourcesTable.courseId, course.id));
  }
  await db.delete(coursesTable).where(eq(coursesTable.semesterId, semId));
  const result = await db.delete(semestersTable).where(eq(semestersTable.id, semId)).returning();
  if (!result.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

export default router;
