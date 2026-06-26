import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudyPlanItem {
  date: string;
  subject: string;
  topic: string;
  task: string;
  rationale: string;
}

export function StudyPlannerCard() {
  const [plan, setPlan] = useState<StudyPlanItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/agent/study-plan/preview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPlan(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast({
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Could not generate study plan",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    setApplyLoading(true);
    try {
      const res = await fetch("/api/agent/study-plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply failed");
      toast({
        title: "Study plan applied",
        description: `${data.tasksCreated} study tasks added to your planner`,
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      setPlan(null);
    } catch (err: unknown) {
      toast({
        title: "Apply failed",
        description: err instanceof Error ? err.message : "Could not apply study plan",
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <BrutalCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-tight">AI Study Planner</h3>
        <div className="flex gap-2">
          <BrutalButton
            variant="default"
            onClick={handlePreview}
            disabled={previewLoading || applyLoading}
            className="flex items-center gap-2"
          >
            {previewLoading && <Spinner className="size-3" />}
            Preview Plan
          </BrutalButton>
          <BrutalButton
            variant="primary"
            onClick={handleApply}
            disabled={previewLoading || applyLoading}
            className="flex items-center gap-2"
          >
            {applyLoading && <Spinner className="size-3" />}
            Generate & Apply
          </BrutalButton>
        </div>
      </div>

      {plan && plan.length > 0 && (
        <div className="overflow-x-auto border-2 border-ink">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] font-bold">Date</TableHead>
                <TableHead className="font-mono text-[10px] font-bold">Subject</TableHead>
                <TableHead className="font-mono text-[10px] font-bold">Topic</TableHead>
                <TableHead className="font-mono text-[10px] font-bold">Task</TableHead>
                <TableHead className="font-mono text-[10px] font-bold">Rationale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((item, i) => (
                <TableRow key={`${item.date}-${i}`}>
                  <TableCell className="font-mono text-xs">{item.date}</TableCell>
                  <TableCell className="text-sm">{item.subject}</TableCell>
                  <TableCell className="text-sm">{item.topic}</TableCell>
                  <TableCell className="text-sm font-bold">{item.task}</TableCell>
                  <TableCell className="text-xs text-inkLight">{item.rationale}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {plan && plan.length === 0 && (
        <p className="font-mono text-xs text-inkLight">No plan items returned. Check Gemini API key.</p>
      )}
    </BrutalCard>
  );
}
