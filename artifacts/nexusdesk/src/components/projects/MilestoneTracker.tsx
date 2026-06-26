import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAddMilestone, useUpdateMilestone, getGetProjectQueryKey } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalButton } from "../shared/BrutalButton";
import { BrutalBadge } from "../shared/BrutalBadge";
import type { Milestone } from "@workspace/api-client-react";
import { format } from "date-fns";

interface MilestoneTrackerProps {
  projectId: string;
  milestones: Milestone[];
}

export function MilestoneTracker({ projectId, milestones }: MilestoneTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const addMilestone = useAddMilestone({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    }
  });

  const updateMilestone = useUpdateMilestone({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addMilestone.mutate({
      projectId,
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        targetDate: formData.get('targetDate') as string || undefined,
      }
    });
  };

  const handleStatusChange = (milestoneId: string, status: string) => {
    updateMilestone.mutate({
      milestoneId,
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined
      }
    });
  };

  return (
    <BrutalCard className="p-0 overflow-hidden">
      <div className="p-4 border-b-2 border-ink flex justify-between items-center bg-surfaceHover">
        <h3 className="section-label mb-0 border-none pb-0">MILESTONES</h3>
        <BrutalButton onClick={() => setIsAdding(!isAdding)} className="px-2 py-1 text-[10px]">
          {isAdding ? "CANCEL" : "+ ADD"}
        </BrutalButton>
      </div>

      {isAdding && (
        <div className="p-4 border-b-2 border-ink bg-paper">
          <form onSubmit={handleAddSubmit} className="space-y-3">
            <input type="text" name="title" placeholder="TITLE" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
            <input type="text" name="description" placeholder="DESCRIPTION" className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
            <input type="date" name="targetDate" className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm uppercase" />
            <BrutalButton type="submit" variant="primary" className="w-full py-1.5 text-xs">SAVE</BrutalButton>
          </form>
        </div>
      )}

      <div className="divide-y-2 divide-ink">
        {milestones.length === 0 && !isAdding && (
          <div className="p-6 text-center font-mono text-xs text-inkLight">NO MILESTONES</div>
        )}
        
        {milestones.map(milestone => (
          <div key={milestone.id} className="p-4 bg-paper">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-sm leading-tight">{milestone.title}</h4>
              <BrutalBadge variant={milestone.status === 'COMPLETED' ? 'sage' : 'default'}>
                {milestone.status}
              </BrutalBadge>
            </div>
            
            {milestone.description && (
              <p className="text-xs text-inkLight mb-3">{milestone.description}</p>
            )}
            
            <div className="flex justify-between items-center mt-3">
              <span className="font-mono text-[10px] text-inkLight">
                {milestone.targetDate ? `TARGET: ${format(new Date(milestone.targetDate), "MMM dd, yyyy")}` : 'NO TARGET DATE'}
              </span>
              
              {milestone.status !== 'COMPLETED' && (
                <button 
                  onClick={() => handleStatusChange(milestone.id, 'COMPLETED')}
                  className="font-mono text-[10px] font-bold text-sage underline decoration-sage/50 underline-offset-2"
                >
                  MARK COMPLETED
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </BrutalCard>
  );
}
