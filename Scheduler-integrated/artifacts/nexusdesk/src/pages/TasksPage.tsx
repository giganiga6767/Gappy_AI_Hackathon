import { useListTasks } from "@workspace/api-client-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { usePersona } from "@/context/PersonaContext";

const STUDENT_CATEGORIES = ["HOMEWORK_SCHOOL", "EXTRACURRICULAR", "EXAM_PREP", "PERSONAL"];
const PROFESSIONAL_CATEGORIES = ["SAGE_SPRINT", "PRODUCTION_OPS", "CLIENT_CRM", "LOGISTICS"];

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useListTasks();
  const { isStudent, isProfessional } = usePersona();

  const categories = isStudent ? STUDENT_CATEGORIES : PROFESSIONAL_CATEGORIES;
  const subtitle = isStudent ? "STUDENT // HOMEWORK_ACADEMICS" : "PROFESSIONAL // SPRINT_CRM";

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4 mb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter text-ink">
            TASKS
          </h1>
          <p className="font-mono text-sm text-inkLight mt-1">{subtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-full bg-surface animate-pulse border-2 border-ink" />
          ))}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 min-h-[600px]">
          {categories.map(cat => (
            <KanbanBoard key={cat} tasks={tasks} category={cat} />
          ))}
        </div>
      )}
    </div>
  );
}
