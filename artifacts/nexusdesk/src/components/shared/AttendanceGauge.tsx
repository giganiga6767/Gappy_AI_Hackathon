import { cn } from "@/lib/utils";

interface AttendanceGaugeProps {
  effectivePct: number;
  targetPct?: number;
  attended: number;
  missed: number;
  isAtRisk: boolean;
  className?: string;
}

export function AttendanceGauge({ 
  effectivePct, 
  targetPct = 75, 
  attended, 
  missed, 
  isAtRisk,
  className 
}: AttendanceGaugeProps) {
  const safe = !isAtRisk;
  const clampedEffective = Math.min(Math.max(effectivePct, 0), 100);
  
  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="h-5 bg-paper border-2 border-ink relative w-full">
        {/* Target marker */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-amber z-10"
          style={{ left: `${targetPct}%` }}
        />
        
        {/* Fill */}
        <div 
          className={cn(
            "absolute top-0 bottom-0 left-0 border-r-2",
            safe ? "bg-sageLight border-sage" : "bg-terracottaLight border-terracotta"
          )}
          style={{ width: `${clampedEffective}%` }}
        />
        
        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="font-mono text-[10px] font-bold text-ink bg-paper/80 px-1">
            {effectivePct.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center font-mono text-[10px] font-bold uppercase">
        <div className="flex gap-2">
          <span className="text-sageDark">{attended} IN</span>
          <span className="text-terracottaDark">{missed} OUT</span>
        </div>
        <div className={safe ? "text-sage" : "text-terracotta"}>
          {safe ? "SAFE" : "AT RISK"}
        </div>
      </div>
    </div>
  );
}
