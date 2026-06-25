import { Router, type IRouter } from "express";
import healthRouter from "./health";
import semestersRouter from "./semesters";
import coursesRouter from "./courses";
import eventsRouter from "./events";
import attendanceRouter from "./attendance";
import gradesRouter from "./grades";
import tasksRouter from "./tasks";
import projectsRouter from "./projects";
import cgpaRouter from "./cgpa";
import resourcesRouter from "./resources";
import ingestRouter from "./ingest";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import recordRouter from "./record";

const router: IRouter = Router();

router.use(authRouter);
router.use(recordRouter);
router.use(healthRouter);
router.use(semestersRouter);
router.use(coursesRouter);
router.use(eventsRouter);
router.use(attendanceRouter);
router.use(gradesRouter);
router.use(tasksRouter);
router.use(projectsRouter);
router.use(cgpaRouter);
router.use(resourcesRouter);
router.use(ingestRouter);
router.use(dashboardRouter);

export default router;
