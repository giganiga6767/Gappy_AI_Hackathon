import { Router } from "express";
import { db } from "@workspace/db";
import { cgpaRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/cgpa", async (req, res): Promise<void> => {
  const rows = await db.select().from(cgpaRecordsTable).orderBy(cgpaRecordsTable.semesterNumber);
  res.json(rows);
});

router.post("/cgpa", async (req, res): Promise<void> => {
  const { semesterNumber, semesterName, sgpa, creditsEarned, totalCredits, isProjected } = req.body;
  if (!semesterNumber) {
    res.status(400).json({ error: "semesterNumber required" });
    return;
  }
  const [row] = await db.insert(cgpaRecordsTable).values({
    semesterNumber: Number(semesterNumber),
    ...(semesterName && { semesterName }),
    ...(sgpa !== undefined && sgpa !== null && { sgpa: Number(sgpa) }),
    creditsEarned: creditsEarned !== undefined ? Number(creditsEarned) : 21,
    totalCredits: totalCredits !== undefined ? Number(totalCredits) : 21,
    isProjected: isProjected ?? false,
  }).returning();
  res.status(201).json(row);
});

router.patch("/cgpa/:recordId", async (req, res): Promise<void> => {
  const { semesterNumber, semesterName, sgpa, creditsEarned, totalCredits, isProjected } = req.body;
  const [row] = await db.update(cgpaRecordsTable)
    .set({
      ...(semesterNumber !== undefined && { semesterNumber: Number(semesterNumber) }),
      ...(semesterName !== undefined && { semesterName }),
      ...(sgpa !== undefined && { sgpa: sgpa !== null ? Number(sgpa) : null }),
      ...(creditsEarned !== undefined && { creditsEarned: Number(creditsEarned) }),
      ...(totalCredits !== undefined && { totalCredits: Number(totalCredits) }),
      ...(isProjected !== undefined && { isProjected }),
    })
    .where(eq(cgpaRecordsTable.id, req.params.recordId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/cgpa/:recordId", async (req, res): Promise<void> => {
  await db.delete(cgpaRecordsTable).where(eq(cgpaRecordsTable.id, req.params.recordId));
  res.status(204).end();
});

export default router;
