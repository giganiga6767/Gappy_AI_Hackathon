import { useParams } from "wouter";
import { useGetProject, useAddProjectLog, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { MilestoneTracker } from "@/components/projects/MilestoneTracker";
import { format } from "date-fns";
import { useState } from "react";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [logContent, setLogContent] = useState("");

  const { data: project, isLoading } = useGetProject(projectId || "");

  const addLog = useAddProjectLog({
    mutation: {
      onSuccess: () => {
        setLogContent("");
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId || "") });
      }
    }
  });

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logContent.trim() || !projectId) return;
    
    addLog.mutate({
      projectId,
      data: { content: logContent }
    });
  };

  if (isLoading || !project) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tighter leading-tight">
            {project.name}
          </h1>
          <div className="flex gap-2 mt-2">
            <BrutalBadge variant="default">{project.status}</BrutalBadge>
            {project.githubUrl && <BrutalBadge variant="default">GITHUB</BrutalBadge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-6">
          {project.description && (
            <BrutalCard className="bg-surfaceHover">
              <p className="font-mono text-sm leading-relaxed">{project.description}</p>
            </BrutalCard>
          )}

          <div className="space-y-4">
            <h2 className="section-label">DEVELOPMENT LOG</h2>
            
            <form onSubmit={handleAddLog} className="flex gap-2">
              <textarea 
                value={logContent}
                onChange={e => setLogContent(e.target.value)}
                placeholder="LOG ENTRY..."
                className="flex-1 border-2 border-ink bg-paper p-2 font-mono text-sm resize-none h-12"
              />
              <BrutalButton type="submit" variant="primary">POST</BrutalButton>
            </form>

            <div className="space-y-3">
              {project.logs?.map(log => (
                <BrutalCard key={log.id} className="p-3 bg-paper">
                  <div className="font-mono text-[10px] font-bold text-inkLight mb-1">
                    {format(new Date(log.date), "MMM dd, yyyy HH:mm")}
                  </div>
                  <div className="font-mono text-sm whitespace-pre-wrap">{log.content}</div>
                </BrutalCard>
              ))}
              {(!project.logs || project.logs.length === 0) && (
                <div className="text-center font-mono text-xs text-inkLight py-8 border-2 border-dashed border-inkFaint bg-surface/50">
                  NO LOGS YET
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MilestoneTracker projectId={project.id} milestones={project.milestones || []} />
          
          {project.components && project.components.length > 0 && (
            <BrutalCard>
              <h3 className="section-label mb-3">COMPONENTS</h3>
              <div className="flex flex-wrap gap-2">
                {project.components.map((c, i) => (
                  <span key={i} className="font-mono text-xs font-bold border border-ink px-2 py-1 bg-surface">
                    {c}
                  </span>
                ))}
              </div>
            </BrutalCard>
          )}
        </div>
      </div>
    </div>
  );
}
