import { Router, Request, Response, NextFunction } from "express";
import {
  previewStudyPlan,
  applyStudyPlan,
  getUniqueSubjectTopics,
  enrichSubjectTopicsWithCourseIds,
} from "../../agents/studyPlannerAgent";
import { previewTriage, applyTriage } from "../../agents/backlogTriageAgent";
import { previewResources, applyResources } from "../../agents/resourceRecommenderAgent";

import { runNow as runAcademicCopilot } from "../../workflows/academicCronJob";
import { runWeeklyDigest } from "../../workflows/weeklyDigestWorkflow";

const router = Router();

router.post("/events", async (req: Request, res: Response) => {
  const { event, data } = req.body as { event: string; data: any };
  console.log(`[BackendEvents] Received webhook event: ${event}`, data);

  res.status(202).json({ accepted: true });

  (async () => {
    try {
      if (event === "task:created" || event === "task:updated") {
        console.log("[BackendEvents] Running academic copilot scanner...");
        await runAcademicCopilot();
      } else if (event === "syllabus:applied") {
        console.log("[BackendEvents] Syllabus applied. Building new weekly digest...");
        await runWeeklyDigest();
      }
    } catch (err) {
      console.error(`[BackendEvents] Failed to process event ${event}:`, err);
    }
  })();
});

router.get("/study-plan/preview", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await previewStudyPlan();
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

router.post("/study-plan", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { tasksCreated, plan } = await applyStudyPlan();

    const pairs = getUniqueSubjectTopics(plan);
    enrichSubjectTopicsWithCourseIds(pairs)
      .then((enriched) =>
        Promise.allSettled(
          enriched.map(({ courseId, topic }) => applyResources(courseId, topic))
        )
      )
      .catch((err) => console.error("[StudyPlan] Background resource fetch failed:", err));

    res.json({ success: true, tasksCreated });
  } catch (err) {
    next(err);
  }
});

router.get("/triage/preview", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const changes = await previewTriage();
    res.json({ changes });
  } catch (err) {
    next(err);
  }
});

router.post("/triage", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await applyTriage();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/recommend-resources/preview", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string;
    const topic = req.query.topic as string | undefined;
    if (!courseId) {
      res.status(400).json({ error: "courseId required" });
      return;
    }
    const resources = await previewResources(courseId, topic);
    res.json({ resources });
  } catch (err) {
    next(err);
  }
});

router.post("/recommend-resources", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, topic } = req.body as { courseId?: string; topic?: string };
    if (!courseId) {
      res.status(400).json({ error: "courseId required" });
      return;
    }
    const result = await applyResources(courseId, topic);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/conversations", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { lemmaClient } = await import("../../datastores/studentDatastore");
    const list = await lemmaClient.conversations.list({ limit: 100 });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get("/conversations/:convId/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lemmaClient } = await import("../../datastores/studentDatastore");
    const messages = await lemmaClient.conversations.messages.list(req.params.convId, { limit: 100 });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

export default router;
