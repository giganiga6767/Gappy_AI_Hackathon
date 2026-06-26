import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListResources,
  useListCourses,
  useCreateResource,
  useDeleteResource,
  getListResourcesQueryKey,
} from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface AiResource {
  title: string;
  url: string;
  type: string;
  description: string;
  topic?: string;
}

interface ResourceWithMeta {
  id: string;
  title: string;
  url?: string | null;
  type: string;
  courseId: string;
  description?: string | null;
  source?: string | null;
}

export default function ResourcesPage() {
  const { data: resources = [], isLoading: isLoadingResources } = useListResources();
  const { data: courses = [], isLoading: isLoadingCourses } = useListCourses();
  const [isAdding, setIsAdding] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [previewResources, setPreviewResources] = useState<AiResource[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const typedResources = resources as ResourceWithMeta[];

  const createResource = useCreateResource({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
      },
    },
  });

  const deleteResource = useDeleteResource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
      },
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createResource.mutate({
      data: {
        title: formData.get("title") as string,
        url: (formData.get("url") as string) || undefined,
        type: formData.get("type") as string,
        courseId: formData.get("courseId") as string,
      },
    });
  };

  const openAiPreview = async (courseId: string) => {
    setActiveCourseId(courseId);
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewResources([]);
    try {
      const res = await fetch(`/api/agent/recommend-resources/preview?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreviewResources(data.resources || []);
    } catch (err: unknown) {
      toast({
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Could not fetch recommendations",
        variant: "destructive",
      });
      setModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyAiResources = async () => {
    if (!activeCourseId) return;
    setApplyLoading(true);
    try {
      const res = await fetch("/api/agent/recommend-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeCourseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply failed");
      toast({ title: "Resources added", description: `${data.added} resources added to library` });
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
    } catch (err: unknown) {
      toast({
        title: "Apply failed",
        description: err instanceof Error ? err.message : "Could not add resources",
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const recommendAllCourses = async () => {
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      setBulkProgress(`Processing ${course.name}... (${i + 1}/${courses.length})`);
      try {
        await fetch("/api/agent/recommend-resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: course.id }),
        });
      } catch {
        // Continue with next course
      }
    }
    setBulkProgress(null);
    queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
    toast({ title: "Bulk complete", description: "Processed all courses" });
  };

  const groupedResources = useMemo(() => {
    const groups: Record<string, ResourceWithMeta[]> = {};
    typedResources.forEach((res) => {
      const key = res.courseId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(res);
    });
    return groups;
  }, [typedResources]);

  const coursesWithResources = courses.filter((c) => groupedResources[c.id]?.length || true);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">RESOURCES</h1>
          <p className="font-mono text-sm text-inkLight mt-1">ACADEMICS // MATERIALS_&_LINKS</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BrutalButton
            variant="sage"
            onClick={recommendAllCourses}
            disabled={!!bulkProgress || courses.length === 0}
            className="flex items-center gap-2"
          >
            {bulkProgress && <Spinner className="size-3" />}
            Recommend for All Courses
          </BrutalButton>
          <BrutalButton variant="primary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "CANCEL" : "+ ADD RESOURCE"}
          </BrutalButton>
        </div>
      </div>

      {bulkProgress && (
        <p className="font-mono text-xs font-bold text-sage border-2 border-sage bg-sageLight p-2">
          {bulkProgress}
        </p>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl border-2 border-ink bg-paper">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">AI Resource Recommendations</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-ink">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px]">Title</TableHead>
                    <TableHead className="font-mono text-[10px]">Type</TableHead>
                    <TableHead className="font-mono text-[10px]">Description</TableHead>
                    <TableHead className="font-mono text-[10px]">URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewResources.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-bold">{r.title}</TableCell>
                      <TableCell className="font-mono text-xs">{r.type}</TableCell>
                      <TableCell className="text-xs">{r.description}</TableCell>
                      <TableCell>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-sage underline break-all"
                        >
                          {r.url}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="gap-2">
            <BrutalButton variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </BrutalButton>
            <BrutalButton
              variant="primary"
              onClick={applyAiResources}
              disabled={applyLoading || previewLoading}
              className="flex items-center gap-2"
            >
              {applyLoading && <Spinner className="size-3" />}
              Add All to Library
            </BrutalButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {courses.map((c) => (
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
        <div className="h-64 bg-surface animate-pulse border-2 border-ink" />
      ) : (
        <div className="space-y-8">
          {coursesWithResources.map((course) => {
            const items = groupedResources[course.id] || [];
            return (
              <div key={course.id} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-mono text-sm font-bold bg-ink text-paper px-4 py-2 border-2 border-ink inline-block">
                    {course.subjectCode} // {course.name}
                  </h2>
                  <BrutalButton
                    variant="default"
                    onClick={() => openAiPreview(course.id)}
                    disabled={previewLoading}
                    className="flex items-center gap-2"
                  >
                    🤖 Get AI Resources
                  </BrutalButton>
                </div>
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((res) => (
                      <BrutalCard key={res.id} className="p-4 flex flex-col justify-between h-full bg-paper hover:bg-surfaceHover group">
                        <div>
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h3 className="font-bold text-sm leading-tight">{res.title}</h3>
                            <button
                              onClick={() => deleteResource.mutate({ resourceId: res.id })}
                              className="text-inkLight hover:text-terracotta font-mono text-[10px]"
                            >
                              [X]
                            </button>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <BrutalBadge>{res.type}</BrutalBadge>
                            {res.source === "ai" && (
                              <BrutalBadge variant="sage">AI</BrutalBadge>
                            )}
                          </div>
                          {res.description && (
                            <p className="font-mono text-[10px] text-inkLight mt-2">{res.description}</p>
                          )}
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
                ) : (
                  <p className="font-mono text-xs text-inkLight border-2 border-dashed border-inkFaint p-4">
                    No resources yet for this course.
                  </p>
                )}
              </div>
            );
          })}

          {courses.length === 0 && (
            <div className="text-center font-mono text-sm text-inkLight py-12 border-2 border-dashed border-inkFaint bg-surface/50">
              NO COURSES FOUND. ADD COURSES OR LOAD DEMO DATA.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
