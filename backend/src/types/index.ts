export type StudentTaskType = 'Lecture' | 'Assignment' | 'Exam' | 'Project';
export type StudentTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

export interface StudentTask {
  taskId: string;
  type: StudentTaskType;
  status: StudentTaskStatus;
  deadline: Date;
  courseName: string;
  gradeWeight: number;
  currentScore: number | null;
  gpaPoints: number | null;
  recommended_materials: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateStudentTaskInput = Omit<
  StudentTask,
  'taskId' | 'createdAt' | 'updatedAt' | 'recommended_materials' | 'currentScore' | 'gpaPoints'
> & {
  currentScore?: number | null;
  gpaPoints?: number | null;
};

export type EnterpriseTaskStatus = 'Open' | 'In Progress' | 'Blocked' | 'Needs Review' | 'Completed';
export type EnterpriseTaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AISolution {
  id: string;
  generatedAt: Date;
  solutionType: 'code_snippet' | 'framework_recommendation' | 'sop_template' | 'resource_link';
  title: string;
  content: string;
  sourceUrls: string[];
}

export interface EnterpriseTask {
  sprintId: string;
  taskName: string;
  description: string;
  status: EnterpriseTaskStatus;
  owner: string;
  priority: EnterpriseTaskPriority;
  billableHours: number;
  estimatedHours: number;
  blockerReason: string | null;
  ai_solutions: AISolution[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEnterpriseTaskInput = Omit<
  EnterpriseTask,
  'sprintId' | 'createdAt' | 'updatedAt' | 'ai_solutions' | 'billableHours' | 'blockerReason'
> & {
  billableHours?: number;
  blockerReason?: string | null;
};

export interface TriageResult {
  target: 'student' | 'enterprise';
  recordId: string;
  record: StudentTask | EnterpriseTask;
}

export interface CopilotResult {
  taskId: string;
  study_plan: string;
  recommended_materials: string[];
}

export interface UnblockerResult {
  sprintId: string;
  solutions: Omit<AISolution, 'id' | 'generatedAt'>[];
}
