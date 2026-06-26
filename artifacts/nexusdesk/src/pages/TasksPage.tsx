import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";

const CATEGORIES = ["ACADEMICS", "HARDWARE_DEV", "PERSONAL", "PROJECT", "ADMIN"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useListTasks();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    category: "ACADEMICS" as string,
    priority: "MEDIUM" as string,
  });
  const [addError, setAddError] = useState<string | null>(null);

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsAdding(false);
        setForm({ title: "", description: "", dueDate: "", category: "ACADEMICS", priority: "MEDIUM" });
        setAddError(null);
      },
      onError: (e: any) => setAddError(e?.message || "Failed to create task"),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setAddError("Title is required.");
      return;
    }
    createTask.mutate({
      data: {
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        category: form.category,
        priority: form.priority,
      },
    });
  };

  const pendingCount = tasks.filter((t) => t.status !== "DONE").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between border-b-4 border-ink pb-4 mb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">TASKS</h1>
          <p className="font-mono text-sm text-inkLight mt-1">
            ACTION_ITEMS // {pendingCount} PENDING, {doneCount} DONE
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-ink text-paper font-mono text-xs font-bold border-2 border-ink shadow-brutal active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        >
          {isAdding ? "✕ CANCEL" : "+ ADD TASK"}
        </button>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <div className="bg-surface border-2 border-ink p-4 mb-6 shrink-0">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider mb-3">
            NEW TASK
          </span>
          {addError && (
            <p className="font-mono text-xs text-terracotta mb-3 border border-terracotta bg-terracottaLight p-2">
              {addError}
            </p>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] font-bold block mb-1">TITLE *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. CS301 Assignment 3 — Graph Traversal"
                className="w-full border-2 border-ink p-2 bg-paper text-sm focus:outline-none font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] font-bold block mb-1">DESCRIPTION</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details..."
                className="w-full border-2 border-ink p-2 bg-paper text-sm focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold block mb-1">CATEGORY</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border-2 border-ink p-2 bg-paper text-sm focus:outline-none font-mono"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold block mb-1">PRIORITY</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border-2 border-ink p-2 bg-paper text-sm focus:outline-none font-mono"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold block mb-1">DUE DATE</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full border-2 border-ink p-2 bg-paper text-sm focus:outline-none font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createTask.isPending}
                className="w-full py-2 bg-sage text-paper font-mono text-xs font-bold border-2 border-ink shadow-brutal-sm active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              >
                {createTask.isPending ? "SAVING..." : "✓ CREATE TASK"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-surface animate-pulse border-2 border-ink" />
          ))}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
          <KanbanBoard tasks={tasks} category="ACADEMICS" />
          <KanbanBoard tasks={tasks} category="PROJECT" />
          <KanbanBoard tasks={tasks} category="PERSONAL" />
        </div>
      )}
    </div>
  );
}
