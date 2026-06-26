import { useQueryClient } from "@tanstack/react-query";
import { useCreateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalButton } from "../shared/BrutalButton";

interface AddTaskFormProps {
  category: string;
  onCancel: () => void;
}

export function AddTaskForm({ category, onCancel }: AddTaskFormProps) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        onCancel();
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createTask.mutate({
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: category,
        priority: formData.get('priority') as string,
        dueDate: formData.get('dueDate') as string || undefined,
      }
    });
  };

  return (
    <BrutalCard className="p-3 mb-3 bg-terracottaLight/20 border-terracotta">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input 
            type="text" 
            name="title" 
            placeholder="TASK TITLE" 
            required 
            autoFocus
            className="w-full border-2 border-ink bg-paper p-1.5 font-bold text-sm" 
          />
        </div>
        
        <div>
          <textarea 
            name="description" 
            placeholder="Description (optional)" 
            rows={2}
            className="w-full border-2 border-ink bg-paper p-1.5 text-xs resize-none"
          />
        </div>
        
        <div className="flex gap-2">
          <select name="priority" className="flex-1 border-2 border-ink bg-paper p-1 font-mono text-[10px] font-bold">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          
          <input 
            type="date" 
            name="dueDate" 
            className="flex-1 border-2 border-ink bg-paper p-1 font-mono text-[10px] font-bold uppercase" 
          />
        </div>
        
        <div className="flex gap-2 pt-2">
          <BrutalButton type="button" onClick={onCancel} className="flex-1 text-xs py-1">CANCEL</BrutalButton>
          <BrutalButton type="submit" variant="primary" className="flex-1 text-xs py-1">ADD</BrutalButton>
        </div>
      </form>
    </BrutalCard>
  );
}
