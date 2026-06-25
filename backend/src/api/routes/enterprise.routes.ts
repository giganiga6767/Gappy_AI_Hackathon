import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { enterpriseDatastore } from "../../datastores/enterpriseDatastore";

const router = Router();

const createTaskSchema = z.object({
  taskName: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(["Open", "In Progress", "Blocked", "Needs Review", "Completed"]),
  owner: z.string().min(1),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  estimatedHours: z.number().min(0),
  tags: z.array(z.string()).default([]),
});

const patchStatusSchema = z.object({
  status: z.enum(["Open", "In Progress", "Blocked", "Needs Review", "Completed"]),
  blockerReason: z.string().optional(),
});

router.get("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const ownerFilter = req.query.owner as string | undefined;

    let tasks = await enterpriseDatastore.getAllTasks();

    if (statusFilter) {
      tasks = tasks.filter((t) => t.status === statusFilter);
    }
    if (ownerFilter) {
      tasks = tasks.filter((t) => t.owner === ownerFilter);
    }

    res.status(200).json({
      data: tasks,
      meta: { count: tasks.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/blocked", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await enterpriseDatastore.getBlockedTasks();
    res.status(200).json({
      data: tasks,
      meta: { count: tasks.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/:sprintId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sprintId } = req.params;
    const task = await enterpriseDatastore.getTaskById(sprintId);
    if (!task) {
      res.status(404).json({ error: { message: `Sprint Task not found with ID ${sprintId}`, code: "NOT_FOUND" } });
      return;
    }
    res.status(200).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = createTaskSchema.parse(req.body);
    const task = await enterpriseDatastore.createTask(parsedBody);
    res.status(201).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.patch("/tasks/:sprintId/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sprintId } = req.params;
    const { status, blockerReason } = patchStatusSchema.parse(req.body);
    const task = await enterpriseDatastore.updateTaskStatus(sprintId, status, blockerReason);
    res.status(200).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:sprintId/hours", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sprintId } = req.params;
    const { hours } = z.object({ hours: z.number().min(0.1) }).parse(req.body);
    const task = await enterpriseDatastore.logBillableHours(sprintId, hours);
    res.status(200).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;
