import { Router, Request, Response, NextFunction } from "express";
import { runWeeklyDigest } from "../../workflows/weeklyDigestWorkflow";
import { getDbClient, parseTags } from "../../lib/nexusDb";

const router = Router();

router.post("/generate", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { artifactId } = await runWeeklyDigest();
    res.json({ success: true, artifactId });
  } catch (err) {
    next(err);
  }
});

router.get("/latest", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getDbClient();
    const result = await client.execute(
      "SELECT id, title, type, content, tags, created_at FROM artifacts ORDER BY created_at DESC"
    );

    const digest = result.rows.find((row) => {
      const tags = parseTags((row as unknown as { tags: unknown }).tags);
      return tags.includes("weekly-digest");
    });

    if (!digest) {
      res.status(404).json({ error: "No weekly digest found" });
      return;
    }

    const d = digest as unknown as {
      id: string;
      title: string;
      type: string;
      content: string;
      tags: unknown;
      created_at: number;
    };

    res.json({
      id: d.id,
      title: d.title,
      type: d.type,
      content: d.content,
      tags: parseTags(d.tags),
      createdAt: new Date(Number(d.created_at)).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
