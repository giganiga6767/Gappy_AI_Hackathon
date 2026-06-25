import { useQueryClient } from "@tanstack/react-query";
import { useUpdateTask, useDeleteTask, getListTasksQueryKey, type Task } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalBadge } from "../shared/BrutalBadge";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const queryClient = useQueryClient();
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

  const handleStatusChange = (newStatus: string) => {
    updateTask.mutate({ taskId: task.id, data: { status: newStatus } });
  };

  return (
    <BrutalCard className="p-3 mb-3 bg-paper hover:bg-surfaceHover">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm leading-tight">{task.title}</h4>
        <button 
          onClick={() => deleteTask.mutate({ taskId: task.id })}
          className="text-inkLight hover:text-terracotta ml-2 font-mono text-[10px]"
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
      </div>

      <div className="flex border-2 border-ink">
        <button 
          className={`flex-1 font-mono text-[10px] font-bold py-1 border-r-2 border-ink ${task.status === 'TODO' ? 'bg-ink text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
          onClick={() => handleStatusChange('TODO')}
        >
          TODO
        </button>
        <button 
          className={`flex-1 font-mono text-[10px] font-bold py-1 border-r-2 border-ink ${task.status === 'IN_PROGRESS' ? 'bg-amber text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
          onClick={() => handleStatusChange('IN_PROGRESS')}
        >
          DOING
        </button>
        <button 
          className={`flex-1 font-mono text-[10px] font-bold py-1 ${task.status === 'DONE' ? 'bg-sage text-paper' : 'bg-surface hover:bg-surfaceHover'}`}
          onClick={() => handleStatusChange('DONE')}
        >
          DONE
        </button>
      </div>
    </BrutalCard>
  );
}
