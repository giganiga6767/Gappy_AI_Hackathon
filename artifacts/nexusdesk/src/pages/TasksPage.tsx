import { useListTasks } from "@workspace/api-client-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useListTasks();

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4 mb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">TASKS</h1>
          <p className="font-mono text-sm text-inkLight mt-1">ACTION_ITEMS // ALL_CATEGORIES</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-full bg-surface animate-pulse border-2 border-ink"></div>
          <div className="h-full bg-surface animate-pulse border-2 border-ink"></div>
          <div className="h-full bg-surface animate-pulse border-2 border-ink"></div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px]">
          <KanbanBoard tasks={tasks} category="ACADEMICS" />
          <KanbanBoard tasks={tasks} category="HARDWARE_DEV" />
          <KanbanBoard tasks={tasks} category="PERSONAL" />
        </div>
      )}
    </div>
  );
}
