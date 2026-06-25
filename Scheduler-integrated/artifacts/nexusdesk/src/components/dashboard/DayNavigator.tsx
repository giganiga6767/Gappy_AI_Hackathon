import { cn } from "@/lib/utils";
import { format, addDays, subDays } from "date-fns";
import { BrutalButton } from "../shared/BrutalButton";

interface DayNavigatorProps {
  date: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function DayNavigator({ date, onChange, className }: DayNavigatorProps) {
  const handlePrev = () => onChange(subDays(date, 1));
  const handleNext = () => onChange(addDays(date, 1));
  const handleToday = () => onChange(new Date());

  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrutalButton onClick={handlePrev} className="px-3" data-testid="btn-prev-day">{"<"}</BrutalButton>
      <div className="bg-surface border-2 border-ink px-4 py-2 font-mono text-sm font-bold flex-1 text-center min-w-[140px]">
        {isToday ? "TODAY" : format(date, "MMM dd, yyyy")}
      </div>
      <BrutalButton onClick={handleToday} className="px-3" data-testid="btn-today">T</BrutalButton>
      <BrutalButton onClick={handleNext} className="px-3" data-testid="btn-next-day">{">"}</BrutalButton>
    </div>
  );
}
