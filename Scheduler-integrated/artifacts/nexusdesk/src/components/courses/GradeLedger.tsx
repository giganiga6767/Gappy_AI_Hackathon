import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalButton } from "../shared/BrutalButton";
import { BrutalBadge } from "../shared/BrutalBadge";
import type { GradeSummary } from "@workspace/api-client-react";
import { useCreateGradeItem, getGetCourseGradeSummaryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

interface GradeLedgerProps {
  courseId: string;
  summary: GradeSummary;
}

export function GradeLedger({ courseId, summary }: GradeLedgerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();
  
  const createGrade = useCreateGradeItem({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getGetCourseGradeSummaryQueryKey(courseId) });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createGrade.mutate({
      data: {
        courseId,
        examType: formData.get('examType') as string,
        label: formData.get('label') as string,
        obtainedMarks: Number(formData.get('obtainedMarks')),
        maxMarks: Number(formData.get('maxMarks')),
        isScaled: formData.get('isScaled') === 'on',
        scaledOutOf: formData.get('scaledOutOf') ? Number(formData.get('scaledOutOf')) : undefined,
        date: formData.get('date') ? formData.get('date') as string : undefined,
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <h2 className="section-label mb-0">GRADE LEDGER</h2>
        <div className="font-mono text-sm font-bold bg-ink text-paper px-3 py-1 border-2 border-ink shadow-brutal-sm">
          OVERALL: {summary.percentage.toFixed(1)}%
        </div>
      </div>

      <BrutalCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b-2 border-ink font-mono text-xs">
                <th className="p-3 border-r-2 border-ink">TYPE</th>
                <th className="p-3 border-r-2 border-ink">LABEL</th>
                <th className="p-3 border-r-2 border-ink">MARKS</th>
                <th className="p-3 border-r-2 border-ink">SCALED</th>
                <th className="p-3">%</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.map((item) => (
                <tr key={item.id} className="border-b-2 border-ink last:border-b-0 hover:bg-surfaceHover">
                  <td className="p-3 border-r-2 border-ink">
                    <BrutalBadge>{item.examType}</BrutalBadge>
                  </td>
                  <td className="p-3 border-r-2 border-ink font-bold text-sm">
                    {item.label}
                    {item.date && (
                      <div className="font-mono text-[10px] text-inkLight font-normal">
                        {format(new Date(item.date), "MMM dd, yyyy")}
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-r-2 border-ink font-mono text-sm">
                    {item.obtainedMarks} / {item.maxMarks}
                  </td>
                  <td className="p-3 border-r-2 border-ink font-mono text-sm">
                    {item.isScaled && item.scaledOutOf ? `OUT OF ${item.scaledOutOf}` : "-"}
                  </td>
                  <td className="p-3 font-mono text-sm font-bold">
                    {(item.percentage || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              
              {summary.items.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={5} className="p-6 text-center font-mono text-sm text-inkLight bg-surface/50">
                    NO GRADES LOGGED YET.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </BrutalCard>

      {isAdding ? (
        <BrutalCard className="bg-terracottaLight/20 border-terracotta shadow-brutal-accent">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <h3 className="font-bold text-sm">ADD GRADE ITEM</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">TYPE</label>
                <select name="examType" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm">
                  <option value="MID_SEM">MID SEM</option>
                  <option value="END_SEM">END SEM</option>
                  <option value="QUIZ">QUIZ</option>
                  <option value="ASSIGNMENT">ASSIGNMENT</option>
                  <option value="LAB">LAB</option>
                  <option value="PROJECT">PROJECT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">LABEL</label>
                <input type="text" name="label" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" placeholder="e.g. Quiz 1" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">OBTAINED</label>
                <input type="number" step="0.5" name="obtainedMarks" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold">MAX</label>
                <input type="number" step="0.5" name="maxMarks" required className="w-full border-2 border-ink bg-paper p-2 font-mono text-sm" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 border-t-2 border-ink/20 pt-4 mt-4">
              <label className="flex items-center gap-2 font-mono text-sm">
                <input type="checkbox" name="isScaled" className="w-4 h-4 border-2 border-ink" />
                IS SCALED
              </label>
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] font-bold">SCALED OUT OF</label>
                <input type="number" step="0.5" name="scaledOutOf" className="w-24 border-2 border-ink bg-paper p-1 font-mono text-sm" />
              </div>
              <div className="flex-1"></div>
              <BrutalButton type="button" onClick={() => setIsAdding(false)} className="bg-surface">CANCEL</BrutalButton>
              <BrutalButton type="submit" variant="primary">SAVE GRADE</BrutalButton>
            </div>
          </form>
        </BrutalCard>
      ) : (
        <BrutalButton onClick={() => setIsAdding(true)} className="w-full border-dashed bg-surface hover:bg-surfaceHover">
          + ADD NEW GRADE
        </BrutalButton>
      )}
    </div>
  );
}
