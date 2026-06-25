import { EventEmitter } from "events";
import { EnterpriseTask, CreateEnterpriseTaskInput, EnterpriseTaskStatus, AISolution } from "../types";
import { lemmaClient } from "./studentDatastore";

export const datastoreEvents = new EventEmitter();

const TABLE_NAME = "enterprise_tasks";

function mapRecordToTask(record: Record<string, any>): EnterpriseTask {
  return {
    sprintId: record.sprintId,
    taskName: record.taskName,
    description: record.description || "",
    status: record.status as EnterpriseTaskStatus,
    owner: record.owner,
    priority: record.priority,
    billableHours: Number(record.billableHours || 0),
    estimatedHours: Number(record.estimatedHours || 0),
    blockerReason: record.blockerReason || null,
    ai_solutions: Array.isArray(record.ai_solutions) ? record.ai_solutions : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

export const enterpriseDatastore = {
  async createTask(payload: CreateEnterpriseTaskInput): Promise<EnterpriseTask> {
    const sprintId = crypto.randomUUID();
    const now = new Date();
    const recordData = {
      sprintId,
      ...payload,
      billableHours: payload.billableHours ?? 0,
      blockerReason: payload.blockerReason ?? null,
      ai_solutions: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const record = await lemmaClient.records.create(TABLE_NAME, recordData);
    return mapRecordToTask(record);
  },

  async getTaskById(sprintId: string): Promise<EnterpriseTask | null> {
    try {
      const record = await lemmaClient.records.get(TABLE_NAME, sprintId);
      if (!record) return null;
      return mapRecordToTask(record);
    } catch (error) {
      return null;
    }
  },

  async getAllTasks(): Promise<EnterpriseTask[]> {
    try {
      const listResponse = await lemmaClient.records.list(TABLE_NAME);
      return listResponse.items.map(mapRecordToTask);
    } catch (error) {
      return [];
    }
  },

  async getBlockedTasks(): Promise<EnterpriseTask[]> {
    try {
      const listResponse = await lemmaClient.records.list(TABLE_NAME);
      const tasks = listResponse.items.map(mapRecordToTask);
      return tasks.filter((task) => task.status === "Blocked");
    } catch (error) {
      return [];
    }
  },

  async updateTaskStatus(
    sprintId: string,
    status: EnterpriseTaskStatus,
    blockerReason?: string
  ): Promise<EnterpriseTask> {
    const task = await this.getTaskById(sprintId);
    if (!task) {
      throw new Error(`Enterprise task with ID ${sprintId} not found`);
    }

    const oldStatus = task.status;
    const updateData: Record<string, any> = {
      status,
      blockerReason: status === "Blocked" ? blockerReason || "No details provided" : null,
      updatedAt: new Date().toISOString(),
    };

    const record = await lemmaClient.records.update(TABLE_NAME, sprintId, updateData);
    const updatedTask = mapRecordToTask(record);

    datastoreEvents.emit("task:status_changed", {
      sprintId,
      oldStatus,
      newStatus: status,
      task: updatedTask,
    });

    return updatedTask;
  },

  async appendAISolution(
    sprintId: string,
    solution: Omit<AISolution, "id" | "generatedAt">
  ): Promise<EnterpriseTask> {
    const task = await this.getTaskById(sprintId);
    if (!task) {
      throw new Error(`Enterprise task with ID ${sprintId} not found`);
    }

    const newSolution: AISolution = {
      ...solution,
      id: crypto.randomUUID(),
      generatedAt: new Date(),
    };

    const updatedSolutions = [...task.ai_solutions, newSolution];
    const updateData = {
      ai_solutions: updatedSolutions,
      updatedAt: new Date().toISOString(),
    };

    const record = await lemmaClient.records.update(TABLE_NAME, sprintId, updateData);
    return mapRecordToTask(record);
  },

  async logBillableHours(sprintId: string, hours: number): Promise<EnterpriseTask> {
    const task = await this.getTaskById(sprintId);
    if (!task) {
      throw new Error(`Enterprise task with ID ${sprintId} not found`);
    }

    const updatedHours = (task.billableHours || 0) + hours;
    const updateData = {
      billableHours: updatedHours,
      updatedAt: new Date().toISOString(),
    };

    const record = await lemmaClient.records.update(TABLE_NAME, sprintId, updateData);
    return mapRecordToTask(record);
  },
};
