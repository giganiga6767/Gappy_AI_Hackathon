import { Link } from "wouter";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalBadge } from "../shared/BrutalBadge";
import type { Project } from "@workspace/api-client-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors: Record<string, "default" | "terracotta" | "sage" | "amber"> = {
    'PLANNING': 'default',
    'ACTIVE': 'sage',
    'TESTING': 'amber',
    'ON_HOLD': 'terracotta',
    'COMPLETED': 'default'
  };

  const progress = project.milestoneCount 
    ? (project.completedMilestones || 0) / project.milestoneCount * 100 
    : 0;

  return (
    <Link href={`/projects/${project.id}`}>
      <BrutalCard className="hover:cursor-pointer flex flex-col h-full group hover:bg-surfaceHover">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-heading text-xl font-bold leading-tight group-hover:underline">
            {project.name}
          </h3>
          <BrutalBadge variant={statusColors[project.status] || 'default'}>
            {project.status.replace('_', ' ')}
          </BrutalBadge>
        </div>
        
        {project.description && (
          <p className="text-xs text-inkLight mb-4 line-clamp-3">
            {project.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t-2 border-ink border-dashed">
          <div className="flex justify-between font-mono text-[10px] font-bold text-inkLight mb-2">
            <span>MILESTONES</span>
            <span>{project.completedMilestones || 0} / {project.milestoneCount || 0}</span>
          </div>
          <div className="h-2 bg-paper border-2 border-ink relative w-full overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-ink"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </BrutalCard>
    </Link>
  );
}
