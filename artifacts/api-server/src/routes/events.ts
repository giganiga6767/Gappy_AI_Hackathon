import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, attendanceTable, coursesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

async function enrichEvent(event: typeof eventsTable.$inferSelect) {
  let courseShortName: string | null = null;
  let courseColor: string | null = null;
  let attendanceStatus: string | null = null;

  if (event.courseId) {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, event.courseId)).limit(1);
    if (course) {
      courseShortName = course.shortName;
      courseColor = course.color ?? null;
    }
    const [att] = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.eventId, event.id), eq(attendanceTable.courseId, event.courseId)))
      .limit(1);
    if (att) attendanceStatus = att.status;
  }

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  return {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    courseShortName,
    courseColor,
    attendanceStatus,
    durationMinutes,
  };
}

router.get("/events", async (req, res): Promise<void> => {
  const { date, startDate, endDate } = req.query as Record<string, string>;

  let conditions: any[] = [];

  if (date) {
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");
    conditions.push(gte(eventsTable.startTime, dayStart), lte(eventsTable.startTime, dayEnd));
  } else if (startDate && endDate) {
    conditions.push(gte(eventsTable.startTime, new Date(startDate)), lte(eventsTable.startTime, new Date(endDate)));
  }

  const events = await db.select().from(eventsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(eventsTable.startTime);

  const enriched = await Promise.all(events.map(enrichEvent));
  res.json(enriched);
});

router.post("/events", async (req, res): Promise<void> => {
  const { title, type, startTime, endTime, location, courseId, isRecurring, recurrenceDays, recurrenceUntil } = req.body;
  if (!title || !type || !startTime || !endTime) {
    res.status(400).json({ error: "title, type, startTime, endTime required" });
    return;
  }

  if (!isRecurring || !recurrenceDays?.length) {
    const groupId = crypto.randomUUID();
    const [row] = await db.insert(eventsTable).values({
      title, type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      ...(location && { location }),
      ...(courseId && { courseId }),
      isRecurring: false,
    }).returning();
    const enriched = await enrichEvent(row);
    res.status(201).json({ created: 1, events: [enriched] });
    return;
  }

  // Recurring: generate events for each matching day until recurrenceUntil
  const groupId = crypto.randomUUID();
  const until = recurrenceUntil ? new Date(recurrenceUntil) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const days = recurrenceDays as number[];

  const toInsert = [];
  const cursor = new Date(start);
  while (cursor <= until) {
    if (days.includes(cursor.getDay())) {
      const s = new Date(cursor);
      const e = new Date(cursor.getTime() + durationMs);
      s.setHours(start.getHours(), start.getMinutes(), 0, 0);
      e.setHours(end.getHours(), end.getMinutes(), 0, 0);
      toInsert.push({
        title, type,
        startTime: s,
        endTime: e,
        ...(location && { location }),
        ...(courseId && { courseId }),
        isRecurring: true,
        recurringGroupId: groupId,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!toInsert.length) {
    res.status(201).json({ created: 0, events: [] });
    return;
  }

  const rows = await db.insert(eventsTable).values(toInsert).returning();
  const enriched = await Promise.all(rows.map(enrichEvent));
  res.status(201).json({ created: rows.length, events: enriched });
});

router.get("/events/:eventId", async (req, res): Promise<void> => {
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, req.params.eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  const enriched = await enrichEvent(event);
  res.json(enriched);
});

router.patch("/events/:eventId", async (req, res): Promise<void> => {
  const { title, location, startTime, endTime } = req.body;
  const [row] = await db.update(eventsTable)
    .set({
      ...(title && { title }),
      ...(location !== undefined && { location }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
    })
    .where(eq(eventsTable.id, req.params.eventId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const enriched = await enrichEvent(row);
  res.json(enriched);
});

router.delete("/events/:eventId", async (req, res): Promise<void> => {
  await db.delete(eventsTable).where(eq(eventsTable.id, req.params.eventId));
  res.status(204).end();
});

router.post("/events/:eventId/cancel", async (req, res): Promise<void> => {
  const { cancellationNote } = req.body;
  const [row] = await db.update(eventsTable)
    .set({ isCancelled: true, ...(cancellationNote && { cancellationNote }) })
    .where(eq(eventsTable.id, req.params.eventId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const enriched = await enrichEvent(row);
  res.json(enriched);
});

export default router;
