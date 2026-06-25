import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateProject, useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useListProjects();
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const createProject = useCreateProject({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const componentsStr = formData.get('components') as string;
    const components = componentsStr.split(',').map(c => c.trim()).filter(Boolean);
    
    createProject.mutate({
      data: {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        status: formData.get('status') as string || 'PLANNING',
        components: components,
        githubUrl: formData.get('githubUrl') as string,
        targetDate: formData.get('targetDate') as string || undefined,
      }
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">PROJECTS</h1>
          <p className="font-mono text-sm text-inkLight mt-1">DEVELOPMENT // HARDWARE_&_SOFTWARE</p>
        </div>
        <BrutalButton variant="primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "CANCEL" : "+ NEW PROJECT"}
        </BrutalButton>
      </div>

      {isAdding && (
        <BrutalCard className="bg-sageLight/20 border-sage">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <h3 className="section-label mb-2">INITIALIZE NEW PROJECT</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">NAME</label>
                <input type="text" name="name" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">STATUS</label>
                <select name="status" className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm">
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TESTING">TESTING</option>
                  <option value="ON_HOLD">ON HOLD</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold">DESCRIPTION</label>
              <textarea name="description" rows={3} className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm resize-none" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">COMPONENTS (comma separated)</label>
                <input type="text" name="components" className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" placeholder="ESP32, React, Node.js" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold">GITHUB URL</label>
                  <input type="text" name="githubUrl" className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold">TARGET DATE</label>
                  <input type="date" name="targetDate" className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm uppercase" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t-2 border-ink/20">
              <BrutalButton type="submit" variant="primary">INITIALIZE</BrutalButton>
            </div>
          </form>
        </BrutalCard>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-surface animate-pulse border-2 border-ink"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
