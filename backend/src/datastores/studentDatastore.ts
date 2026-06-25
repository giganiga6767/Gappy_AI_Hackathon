import { LemmaClient } from "lemma-sdk";
import * as dotenv from "dotenv";
import { StudentTask, CreateStudentTaskInput } from "../types";

dotenv.config();

export const lemmaClient = new LemmaClient({
  apiUrl: process.env.LEMMA_API_URL || "http://127.0.0.1:8711",
  authUrl: process.env.LEMMA_AUTH_URL || "http://127.0.0.1:3711/auth",
});

const podId = process.env.POD_ID || "default-pod";
lemmaClient.setPodId(podId);

const TABLE_NAME = "student_tasks";

function mapRecordToTask(record: Record<string, any>): StudentTask {
  return {
    taskId: record.taskId,
    type: record.type,
    status: record.status,
    deadline: new Date(record.deadline),
    courseName: record.courseName,
    gradeWeight: Number(record.gradeWeight),
    currentScore: record.currentScore !== undefined && record.currentScore !== null ? Number(record.currentScore) : null,
    gpaPoints: record.gpaPoints !== undefined && record.gpaPoints !== null ? Number(record.gpaPoints) : null,
    recommended_materials: Array.isArray(record.recommended_materials) ? record.recommended_materials : [],
    notes: record.notes || "",
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

export const studentDatastore = {
  async createTask(payload: CreateStudentTaskInput): Promise<StudentTask> {
    const taskId = crypto.randomUUID();
    const now = new Date();
    const recordData = {
      taskId,
      ...payload,
      deadline: payload.deadline.toISOString(),
      recommended_materials: [],
      currentScore: payload.currentScore ?? null,
      gpaPoints: payload.gpaPoints ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const record = await lemmaClient.records.create(TABLE_NAME, recordData);
    return mapRecordToTask(record);
  },

  async getTaskById(taskId: string): Promise<StudentTask | null> {
    try {
      const record = await lemmaClient.records.get(TABLE_NAME, taskId);
      if (!record) return null;
      return mapRecordToTask(record);
    } catch (error) {
      return null;
    }
  },

  async getAllTasks(): Promise<StudentTask[]> {
    try {
      const listResponse = await lemmaClient.records.list(TABLE_NAME);
      return listResponse.items.map(mapRecordToTask);
    } catch (error) {
      return [];
    }
  },

  async getUpcomingTasks(withinDays: number): Promise<StudentTask[]> {
    try {
      const now = new Date();
      const limitDate = new Date();
      limitDate.setDate(now.getDate() + withinDays);

      const listResponse = await lemmaClient.records.list(TABLE_NAME);
      const tasks = listResponse.items.map(mapRecordToTask);

      return tasks.filter(
        (task) =>
          task.status !== "Completed" &&
          task.deadline >= now &&
          task.deadline <= limitDate
      );
    } catch (error) {
      return [];
    }
  },

  async updateTask(taskId: string, patch: Partial<StudentTask>): Promise<StudentTask> {
    const updateData: Record<string, any> = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    if (patch.deadline) {
      updateData.deadline = patch.deadline.toISOString();
    }

    const record = await lemmaClient.records.update(TABLE_NAME, taskId, updateData);
    return mapRecordToTask(record);
  },

  async appendMaterials(taskId: string, materials: string[]): Promise<StudentTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const updatedMaterials = Array.from(new Set([...task.recommended_materials, ...materials]));
    return this.updateTask(taskId, { recommended_materials: updatedMaterials });
  },
};
