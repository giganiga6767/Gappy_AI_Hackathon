import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { studentDatastore } from "../../datastores/studentDatastore";

const router = Router();

const createTaskSchema = z.object({
  type: z.enum(["Lecture", "Assignment", "Exam", "Project"]),
  status: z.enum(["Pending", "In Progress", "Completed", "Overdue"]),
  deadline: z.string().transform((str) => new Date(str)),
  courseName: z.string().min(1),
  gradeWeight: z.number().min(0).max(100),
  notes: z.string().default(""),
});

const patchTaskSchema = z.object({
  type: z.enum(["Lecture", "Assignment", "Exam", "Project"]).optional(),
  status: z.enum(["Pending", "In Progress", "Completed", "Overdue"]).optional(),
  deadline: z.string().transform((str) => new Date(str)).optional(),
  courseName: z.string().min(1).optional(),
  gradeWeight: z.number().min(0).max(100).optional(),
  currentScore: z.number().nullable().optional(),
  gpaPoints: z.number().nullable().optional(),
  notes: z.string().optional(),
});

router.get("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const typeFilter = req.query.type as string | undefined;

    let tasks = await studentDatastore.getAllTasks();

    if (statusFilter) {
      tasks = tasks.filter((t) => t.status === statusFilter);
    }
    if (typeFilter) {
      tasks = tasks.filter((t) => t.type === typeFilter);
    }

    res.status(200).json({
      data: tasks,
      meta: { count: tasks.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/upcoming", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await studentDatastore.getUpcomingTasks(7);
    res.status(200).json({
      data: tasks,
      meta: { count: tasks.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/:taskId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const task = await studentDatastore.getTaskById(taskId);
    if (!task) {
      res.status(404).json({ error: { message: `Task not found with ID ${taskId}`, code: "NOT_FOUND" } });
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
    const task = await studentDatastore.createTask(parsedBody);
    res.status(201).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.patch("/tasks/:taskId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const parsedBody = patchTaskSchema.parse(req.body);
    const task = await studentDatastore.updateTask(taskId, parsedBody);
    res.status(200).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:taskId/materials", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { materials } = z.object({ materials: z.array(z.string()) }).parse(req.body);
    const task = await studentDatastore.appendMaterials(taskId, materials);
    res.status(200).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;
