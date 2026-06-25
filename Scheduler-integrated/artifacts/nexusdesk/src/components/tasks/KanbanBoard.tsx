import { useState } from "react";
import type { Task } from "@workspace/api-client-react";
import { TaskCard } from "./TaskCard";
import { AddTaskForm } from "./AddTaskForm";
import { BrutalButton } from "../shared/BrutalButton";
import { usePersona } from "@/context/PersonaContext";

interface KanbanBoardProps {
  tasks: Task[];
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  HOMEWORK_SCHOOL: "HOMEWORK / SCHOOL",
  EXTRACURRICULAR: "EXTRACURRICULAR",
  EXAM_PREP: "EXAM PREP",
  PERSONAL: "PERSONAL",
  SAGE_SPRINT: "SAGE SPRINT",
  PRODUCTION_OPS: "PRODUCTION OPS",
  CLIENT_CRM: "CLIENT CRM",
  LOGISTICS: "LOGISTICS",
  ACADEMICS: "ACADEMICS",
  HARDWARE_DEV: "HARDWARE DEV",
  ROUTINE: "ROUTINE",
};

export function KanbanBoard({ tasks, category }: KanbanBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { isProfessional } = usePersona();

  const categoryTasks = tasks.filter((t) => t.category === category);
  const todoTasks = categoryTasks.filter((t) => t.status === "TODO");
  const doingTasks = categoryTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = categoryTasks.filter((t) => t.status === "DONE");

  const displayLabel = CATEGORY_LABELS[category] || category.replace(/_/g, " ");
  const columnColor = "bg-surface border-ink";
  const headerColor = isProfessional
    ? "bg-amber text-paper border-ink"
    : "bg-ink text-paper border-ink";

  return (
    <div
      className={`flex flex-col h-full border-2 shadow-brutal p-4 ${columnColor}`}
    >
      <div className="flex justify-between items-center border-b-2 border-ink pb-2 mb-4">
        <h2
          className={`font-heading text-base font-bold px-2 py-0.5 border-2 ${headerColor}`}
        >
          {displayLabel}
        </h2>
        <span className="font-mono text-sm font-bold bg-ink text-paper px-2 py-0.5 border-2 border-ink">
          {categoryTasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {isAdding && (
          <AddTaskForm category={category} onCancel={() => setIsAdding(false)} />
        )}

        {todoTasks.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] font-bold text-inkLight mb-2">TODO</h3>
            {todoTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}

        {doingTasks.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] font-bold text-inkLight mb-2 mt-4">IN PROGRESS</h3>
            {doingTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] font-bold text-inkLight mb-2 mt-4">DONE</h3>
            {doneTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}

        {categoryTasks.length === 0 && !isAdding && (
          <div className="text-center font-mono text-xs text-inkLight py-8 border-2 border-dashed border-inkFaint">
            NO TASKS
          </div>
        )}
      </div>

      {!isAdding && (
        <BrutalButton
          className="w-full mt-4 border-dashed bg-transparent hover:bg-surfaceHover"
          onClick={() => setIsAdding(true)}
        >
          + ADD TASK
        </BrutalButton>
      )}
    </div>
  );
}
