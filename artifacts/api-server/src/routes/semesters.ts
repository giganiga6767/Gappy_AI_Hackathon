import { Router } from "express";
import { db } from "@workspace/db";
import { semestersTable } from "@workspace/db";
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

export default router;
