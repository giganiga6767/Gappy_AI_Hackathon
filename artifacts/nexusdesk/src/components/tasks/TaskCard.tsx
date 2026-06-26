import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateTask, useDeleteTask, getListTasksQueryKey, type Task } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalBadge } from "../shared/BrutalBadge";
import { BrutalButton } from "../shared/BrutalButton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface TaskCardProps {
  task: Task;
}

interface Material {
  title: string;
  type: "VIDEO" | "NOTE" | "LINK";
  url: string;
  reason: string;
}

export function TaskCard({ task }: TaskCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const handleStatusChange = (newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ taskId: task.id, data: { status: newStatus } });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask.mutate({ taskId: task.id });
  };

  const handleGenerateCopilot = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }), // Uses server/inbox API key fallback
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate study strategy");
      toast({
        title: "Strategy generated!",
        description: "AI study plan and resources are now active for this task.",
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Could not generate AI strategy.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse materials
  let materials: Material[] = [];
  if (task.studyMaterials) {
    try {
      materials = typeof task.studyMaterials === "string" ? JSON.parse(task.studyMaterials) : task.studyMaterials;
    } catch {
      // Ignored
    }
  }

  const hasAiContent = task.studyPlan || (materials && materials.length > 0) || task.triageNote;

  return (
    <>
      <BrutalCard 
        className="p-3 mb-3 bg-paper hover:bg-surfaceHover cursor-pointer group transition-all duration-200 hover:-translate-y-[2px]"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-sm leading-tight group-hover:text-sage">{task.title}</h4>
          <button 
            onClick={handleDelete}
            className="text-inkLight hover:text-terracotta ml-2 font-mono text-[10px] p-1 border border-transparent hover:border-ink"
          >
            [X]
          </button>
        </div>
        
        {task.description && (
          <p className="text-xs text-inkLight mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {task.priority === 'HIGH' || task.priority === 'CRITICAL' ? (
            <BrutalBadge variant="terracotta">{task.priority}</BrutalBadge>
          ) : (
            <BrutalBadge>{task.priority}</BrutalBadge>
          )}
          {task.dueDate && (
            <BrutalBadge variant="amber">
              DUE: {format(new Date(task.dueDate), "MMM dd")}
            </BrutalBadge>
          )}
          {hasAiContent && (
            <BrutalBadge variant="sage">🤖 AI</BrutalBadge>
          )}
        </div>

        <div className="flex border-2 border-ink">
          <button 
            className={`flex-1 font-mono text-[10px] font-bold py-1 border-r-2 border-ink ${task.status === 'TODO' ? 'bg-ink text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
            onClick={(e) => handleStatusChange('TODO', e)}
          >
            TODO
          </button>
          <button 
            className={`flex-1 font-mono text-[10px] font-bold py-1 border-r-2 border-ink ${task.status === 'IN_PROGRESS' ? 'bg-amber text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
            onClick={(e) => handleStatusChange('IN_PROGRESS', e)}
          >
            DOING
          </button>
          <button 
            className={`flex-1 font-mono text-[10px] font-bold py-1 ${task.status === 'DONE' ? 'bg-sage text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
            onClick={(e) => handleStatusChange('DONE', e)}
          >
            DONE
          </button>
        </div>
      </BrutalCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl border-4 border-ink bg-paper shadow-brutal p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader className="border-b-4 border-ink pb-3 mb-4">
            <DialogTitle className="font-heading text-2xl uppercase tracking-tight">{task.title}</DialogTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <BrutalBadge variant="default">{task.category}</BrutalBadge>
              <BrutalBadge variant={task.priority === 'HIGH' || task.priority === 'CRITICAL' ? "terracotta" : "default"}>{task.priority} PRIORITY</BrutalBadge>
              {task.dueDate && (
                <BrutalBadge variant="amber">DUE DATE: {format(new Date(task.dueDate), "PPP")}</BrutalBadge>
              )}
            </div>
          </DialogHeader>

          {task.description && (
            <div className="bg-surface border-2 border-ink p-4 mb-4">
              <h5 className="font-mono text-xs font-bold text-inkLight uppercase tracking-wider mb-1">Description</h5>
              <p className="text-sm font-medium">{task.description}</p>
            </div>
          )}

          {/* AI Strategy Area */}
          <div className="space-y-4">
            {task.triageNote && (
              <div className="border-2 border-ink bg-amberFaint/30 p-4">
                <h5 className="font-mono text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  🚦 AI Triage & Priority Note
                </h5>
                <p className="text-xs font-mono text-ink leading-relaxed">{task.triageNote}</p>
              </div>
            )}

            {task.studyPlan ? (
              <div className="border-2 border-ink bg-sageLight/10 p-4">
                <h5 className="font-mono text-xs font-bold text-sage uppercase tracking-wider mb-3 flex items-center gap-2">
                  📖 AI Customized Study Guide
                </h5>
                <div className="prose prose-sm max-w-none font-mono text-xs text-ink leading-relaxed space-y-2">
                  <ReactMarkdown>{task.studyPlan}</ReactMarkdown>
                </div>
              </div>
            ) : null}

            {materials && materials.length > 0 ? (
              <div className="border-2 border-ink p-4 bg-paper">
                <h5 className="font-mono text-xs font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
                  🔗 Recommended Learning Resources
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {materials.map((m, idx) => (
                    <BrutalCard key={idx} className="p-3 bg-surface hover:bg-surfaceHover">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs leading-tight">{m.title}</span>
                        <BrutalBadge variant="sage" className="text-[8px] px-1 py-0">{m.type}</BrutalBadge>
                      </div>
                      <p className="text-[10px] text-inkLight font-mono leading-tight mb-2">{m.reason}</p>
                      <a 
                        href={m.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-mono text-[9px] text-sage underline hover:text-sageDark"
                      >
                        Visit Link →
                      </a>
                    </BrutalCard>
                  ))}
                </div>
              </div>
            ) : null}

            {!hasAiContent && (
              <div className="border-2 border-dashed border-inkFaint p-6 text-center bg-surface/50">
                <p className="font-mono text-xs text-inkLight mb-4">No AI study strategy has been generated for this task yet.</p>
                <BrutalButton 
                  variant="sage" 
                  onClick={handleGenerateCopilot} 
                  disabled={isGenerating}
                  className="mx-auto flex items-center gap-2"
                >
                  {isGenerating ? <Spinner className="size-3" /> : "🤖"}
                  {isGenerating ? "Generating Study Strategy..." : "Generate AI Study Plan"}
                </BrutalButton>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 pt-4 border-t-2 border-ink/20 flex gap-2">
            <BrutalButton variant="default" onClick={() => setIsOpen(false)}>Close</BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
