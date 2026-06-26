import { useState, useMemo } from "react";
import { BrutalCard } from "../shared/BrutalCard";
import type { CgpaRecord } from "@workspace/api-client-react";

interface CGPASimulatorProps {
  completedSemesters: CgpaRecord[];
}

export function CGPASimulator({ completedSemesters }: CGPASimulatorProps) {
  const [targetCGPA, setTargetCGPA] = useState<number>(8.5);
  
  const totalSems = 8;
  const remainingSems = Math.max(0, totalSems - completedSemesters.length);
  
  const [projectedSGPAs, setProjectedSGPAs] = useState<string[]>(
    Array(remainingSems).fill("8.0")
  );

  const stats = useMemo(() => {
    const completedWeighted = completedSemesters.reduce((sum, sem) => sum + ((sem.sgpa || 0) * sem.creditsEarned), 0);
    const completedCredits = completedSemesters.reduce((sum, sem) => sum + sem.creditsEarned, 0);
    
    const creditsPerSem = 21; // Assumption
    const projectedCredits = remainingSems * creditsPerSem;
    
    let projectedWeighted = 0;
    projectedSGPAs.forEach((sgpaStr) => {
      const val = parseFloat(sgpaStr);
      if (!isNaN(val)) projectedWeighted += val * creditsPerSem;
    });
    
    const totalCredits = completedCredits + projectedCredits;
    const simulatedCGPA = totalCredits > 0 ? (completedWeighted + projectedWeighted) / totalCredits : 0;
    
    const requiredTotalWeighted = targetCGPA * totalCredits;
    const requiredFutureWeighted = requiredTotalWeighted - completedWeighted;
    const requiredFutureSGPA = remainingSems > 0 ? requiredFutureWeighted / projectedCredits : 0;
    
    return {
      simulatedCGPA,
      requiredFutureSGPA,
      completedCGPA: completedCredits > 0 ? completedWeighted / completedCredits : 0
    };
  }, [completedSemesters, projectedSGPAs, remainingSems, targetCGPA]);

  const updateProjectedSGPA = (index: number, val: string) => {
    const newArr = [...projectedSGPAs];
    newArr[index] = val;
    setProjectedSGPAs(newArr);
  };

  const simColor = stats.simulatedCGPA >= 8 ? "text-sage" : stats.simulatedCGPA >= 7 ? "text-amber" : "text-terracotta";

  return (
    <div className="space-y-6">
      <BrutalCard className="p-8 text-center bg-ink text-paper border-ink shadow-brutal-accent">
        <h3 className="font-mono text-sm font-bold text-inkFaint mb-2 tracking-widest">SIMULATED CGPA</h3>
        <div className={`font-heading text-7xl font-extrabold ${simColor} mb-4 drop-shadow-[4px_4px_0_#2D2D2D]`}>
          {stats.simulatedCGPA.toFixed(2)}
        </div>
        <div className="flex justify-center gap-4 text-xs font-mono">
          <div className="border border-paper/30 px-3 py-1 bg-inkLight/50">
            CURRENT: {stats.completedCGPA.toFixed(2)}
          </div>
        </div>
      </BrutalCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BrutalCard>
          <h3 className="section-label mb-4">REMAINING SEMESTERS</h3>
          {remainingSems === 0 ? (
            <div className="font-mono text-sm text-inkLight text-center py-4">ALL SEMESTERS COMPLETED</div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: remainingSems }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="font-mono text-xs font-bold w-16">SEM {completedSemesters.length + i + 1}</div>
                  <input
                    type="range"
                    min="4"
                    max="10"
                    step="0.1"
                    value={projectedSGPAs[i]}
                    onChange={(e) => updateProjectedSGPA(i, e.target.value)}
                    className="flex-1 accent-ink"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={projectedSGPAs[i]}
                    onChange={(e) => updateProjectedSGPA(i, e.target.value)}
                    className="w-16 border-2 border-ink bg-paper p-1 font-mono text-sm text-center"
                  />
                </div>
              ))}
            </div>
          )}
        </BrutalCard>

        <BrutalCard>
          <h3 className="section-label mb-4">GOAL TRACKER</h3>
          
          <div className="mb-6">
            <label className="font-mono text-[10px] font-bold block mb-2">TARGET CGPA</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={targetCGPA}
              onChange={(e) => setTargetCGPA(parseFloat(e.target.value) || 0)}
              className="w-full border-2 border-ink bg-paper p-2 font-mono text-xl font-bold"
            />
          </div>

          <div className="bg-surfaceHover border-2 border-ink p-4">
            <div className="font-mono text-[10px] font-bold mb-1">REQUIRED SGPA (REMAINING SEMS)</div>
            
            {stats.requiredFutureSGPA > 10 ? (
              <div className="font-mono text-xl font-bold text-terracotta">
                NOT ACHIEVABLE
              </div>
            ) : stats.requiredFutureSGPA <= 0 ? (
              <div className="font-mono text-xl font-bold text-sage">
                GOAL SECURED
              </div>
            ) : (
              <div className={`font-mono text-3xl font-bold ${stats.requiredFutureSGPA > 9 ? 'text-amber' : 'text-sageDark'}`}>
                {stats.requiredFutureSGPA.toFixed(2)}
              </div>
            )}
            
            <p className="font-mono text-[10px] text-inkLight mt-2 mt-4 leading-relaxed">
              Assuming 21 credits per remaining semester. Real values may vary based on exact registered credits.
            </p>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}
