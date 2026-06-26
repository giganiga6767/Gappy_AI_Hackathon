import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListCgpaRecords, 
  useCreateCgpaRecord, 
  useUpdateCgpaRecord, 
  useDeleteCgpaRecord, 
  getListCgpaRecordsQueryKey 
} from "@workspace/api-client-react";
import { CGPASimulator } from "@/components/cgpa/CGPASimulator";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";

export default function CGPAPage() {
  const { data: records = [], isLoading } = useListCgpaRecords();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createRecord = useCreateCgpaRecord({
    mutation: {
      onSuccess: () => {
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getListCgpaRecordsQueryKey() });
      }
    }
  });

  const updateRecord = useUpdateCgpaRecord({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListCgpaRecordsQueryKey() });
      }
    }
  });

  const deleteRecord = useDeleteCgpaRecord({
    mutation: {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListCgpaRecordsQueryKey() });
      }
    }
  });

  const completed = records.filter(r => !r.isProjected && r.sgpa !== null);

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createRecord.mutate({
      data: {
        semesterNumber: Number(formData.get('semesterNumber')),
        semesterName: formData.get('semesterName') as string,
        sgpa: Number(formData.get('sgpa')),
        creditsEarned: Number(formData.get('creditsEarned')),
        totalCredits: Number(formData.get('totalCredits')),
        isProjected: false
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>, recordId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateRecord.mutate({
      recordId,
      data: {
        semesterNumber: Number(formData.get('semesterNumber')),
        semesterName: formData.get('semesterName') as string,
        sgpa: Number(formData.get('sgpa')),
        creditsEarned: Number(formData.get('creditsEarned')),
        totalCredits: Number(formData.get('totalCredits')),
      }
    });
  };

  const handleDelete = (recordId: string) => {
    if (window.confirm("Are you sure you want to delete this semester record?")) {
      deleteRecord.mutate({ recordId });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">CGPA</h1>
          <p className="font-mono text-sm text-inkLight mt-1">ACADEMICS // PERFORMANCE_TRACKER</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] bg-surface animate-pulse border-2 border-ink"></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CGPASimulator completedSemesters={completed} />
          </div>
          
          <div className="space-y-6">
            <h2 className="section-label">ACADEMIC RECORD</h2>
            
            <div className="space-y-4">
              {completed.map(record => {
                if (editingId === record.id) {
                  return (
                    <BrutalCard key={record.id} className="p-4 bg-terracottaLight/10 border-terracotta">
                      <form onSubmit={(e) => handleEditSubmit(e, record.id)} className="space-y-3">
                        <div className="flex justify-between items-center pb-1 border-b-2 border-ink">
                          <h3 className="font-bold text-xs uppercase font-mono">EDIT SEM {record.semesterNumber} RECORD</h3>
                          <button 
                            type="button" 
                            onClick={() => handleDelete(record.id)} 
                            className="text-xs font-mono font-bold text-terracotta hover:underline uppercase"
                          >
                            [Delete]
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-mono text-[9px] font-bold block mb-1">SEM #</label>
                            <input 
                              type="number" 
                              name="semesterNumber" 
                              defaultValue={record.semesterNumber} 
                              required 
                              className="w-full border-2 border-ink bg-paper p-1 font-mono text-sm" 
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[9px] font-bold block mb-1">NAME</label>
                            <input 
                              type="text" 
                              name="semesterName" 
                              defaultValue={record.semesterName || ""} 
                              required 
                              className="w-full border-2 border-ink bg-paper p-1 font-mono text-sm" 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="font-mono text-[9px] font-bold block mb-1">SGPA</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            name="sgpa" 
                            defaultValue={record.sgpa ?? 0} 
                            required 
                            className="w-full border-2 border-ink bg-paper p-1 font-mono text-sm" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-mono text-[9px] font-bold block mb-1">CREDITS</label>
                            <input 
                              type="number" 
                              name="creditsEarned" 
                              defaultValue={record.creditsEarned} 
                              required 
                              className="w-full border-2 border-ink bg-paper p-1 font-mono text-sm" 
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[9px] font-bold block mb-1">TOTAL CR</label>
                            <input 
                              type="number" 
                              name="totalCredits" 
                              defaultValue={record.totalCredits} 
                              required 
                              className="w-full border-2 border-ink bg-paper p-1 font-mono text-sm" 
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-1">
                          <BrutalButton 
                            type="button" 
                            onClick={() => setEditingId(null)} 
                            className="flex-1 text-[10px] py-1 bg-surface"
                          >
                            CANCEL
                          </BrutalButton>
                          <BrutalButton 
                            type="submit" 
                            variant="primary" 
                            className="flex-1 text-[10px] py-1"
                          >
                            SAVE
                          </BrutalButton>
                        </div>
                      </form>
                    </BrutalCard>
                  );
                }

                return (
                  <BrutalCard key={record.id} className="p-4 flex justify-between items-center group relative hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
                    <div>
                      <div className="font-mono text-xs font-bold text-inkLight">SEM {record.semesterNumber}</div>
                      <div className="font-bold">{record.semesterName || `Semester ${record.semesterNumber}`}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold">{record.sgpa?.toFixed(2)}</div>
                        <div className="font-mono text-[10px] text-inkLight">{record.creditsEarned} CR</div>
                      </div>
                      <button 
                        onClick={() => setEditingId(record.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-2 py-0.5 border-2 border-ink bg-amberLight text-ink font-mono text-[10px] font-bold uppercase transition-opacity"
                      >
                        EDIT
                      </button>
                    </div>
                  </BrutalCard>
                );
              })}
              
              {completed.length === 0 && (
                <div className="text-center font-mono text-sm text-inkLight py-8 border-2 border-dashed border-inkFaint bg-surface/50">
                  NO COMPLETED SEMESTERS
                </div>
              )}

              {isAdding ? (
                <BrutalCard className="bg-sageLight/30 border-sage">
                  <form onSubmit={handleAddSubmit} className="space-y-3">
                    <h3 className="font-bold text-sm">ADD SEMESTER RECORD</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" name="semesterNumber" placeholder="SEM #" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
                      <input type="text" name="semesterName" placeholder="NAME (e.g. S3)" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
                    </div>
                    <input type="number" step="0.01" name="sgpa" placeholder="SGPA" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" name="creditsEarned" placeholder="CREDITS" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
                      <input type="number" name="totalCredits" placeholder="TOTAL CR" required className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-sm" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <BrutalButton type="button" onClick={() => setIsAdding(false)} className="flex-1 text-xs py-1 bg-surface">CANCEL</BrutalButton>
                      <BrutalButton type="submit" variant="primary" className="flex-1 text-xs py-1">SAVE</BrutalButton>
                    </div>
                  </form>
                </BrutalCard>
              ) : (
                <BrutalButton onClick={() => setIsAdding(true)} className="w-full border-dashed bg-surface">
                  + ADD PAST SEMESTER
                </BrutalButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
