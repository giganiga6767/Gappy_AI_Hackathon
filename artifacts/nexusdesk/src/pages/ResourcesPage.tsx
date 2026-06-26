import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListResources, useListCourses, useCreateResource, useDeleteResource, getListResourcesQueryKey } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";

export default function ResourcesPage() {
  const { data: resources = [], isLoading: isLoadingResources } = useListResources();
  const { data: courses = [], isLoading: isLoadingCourses } = useListCourses();
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const createResource = useCreateResource({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
      }
    }
  });

  const deleteResource = useDeleteResource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createResource.mutate({
      data: {
        title: formData.get('title') as string,
        url: formData.get('url') as string || undefined,
        type: formData.get('type') as string,
        courseId: formData.get('courseId') as string,
      }
    });
  };

  const groupedResources = useMemo(() => {
    const groups: Record<string, typeof resources> = {};
    resources.forEach(res => {
      const key = res.courseId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(res);
    });
    return groups;
  }, [resources]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">RESOURCES</h1>
          <p className="font-mono text-sm text-inkLight mt-1">ACADEMICS // MATERIALS_&_LINKS</p>
        </div>
        <BrutalButton variant="primary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "CANCEL" : "+ ADD RESOURCE"}
        </BrutalButton>
      </div>

      {isAdding && (
        <BrutalCard className="bg-sageLight/20 border-sage">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <h3 className="section-label mb-2">NEW RESOURCE</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">TITLE</label>
                <input type="text" name="title" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">URL</label>
                <input type="url" name="url" className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" placeholder="https://" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">TYPE</label>
                <select name="type" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm">
                  <option value="PDF">PDF</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="LINK">LINK</option>
                  <option value="NOTE">NOTE</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">COURSE</label>
                <select name="courseId" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm">
                  <option value="">SELECT COURSE...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.subjectCode} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t-2 border-ink/20">
              <BrutalButton type="submit" variant="primary">SAVE RESOURCE</BrutalButton>
            </div>
          </form>
        </BrutalCard>
      )}

      {isLoadingResources || isLoadingCourses ? (
        <div className="h-64 bg-surface animate-pulse border-2 border-ink"></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResources).map(([courseId, items]) => {
            const course = courses.find(c => c.id === courseId);
            const courseName = course ? `${course.subjectCode} // ${course.name}` : "UNKNOWN COURSE";
            
            return (
              <div key={courseId} className="space-y-4">
                <h2 className="font-mono text-sm font-bold bg-ink text-paper px-4 py-2 border-2 border-ink inline-block">
                  {courseName}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(res => (
                    <BrutalCard key={res.id} className="p-4 flex flex-col justify-between h-full bg-paper hover:bg-surfaceHover group">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm leading-tight pr-4">{res.title}</h3>
                          <button 
                            onClick={() => deleteResource.mutate({ resourceId: res.id })}
                            className="text-inkLight hover:text-terracotta font-mono text-[10px]"
                          >
                            [X]
                          </button>
                        </div>
                        <BrutalBadge>{res.type}</BrutalBadge>
                      </div>
                      
                      {res.url && (
                        <div className="mt-4 pt-3 border-t-2 border-ink border-dashed">
                          <a 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] font-bold text-sage underline decoration-sage/50 underline-offset-2 break-all"
                          >
                            {res.url}
                          </a>
                        </div>
                      )}
                    </BrutalCard>
                  ))}
                </div>
              </div>
            );
          })}
          
          {resources.length === 0 && !isAdding && (
            <div className="text-center font-mono text-sm text-inkLight py-12 border-2 border-dashed border-inkFaint bg-surface/50">
              NO RESOURCES FOUND. ADD SOME TO GET STARTED.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
