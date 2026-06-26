import { cn } from "@/lib/utils";
import type { EventWithAttendance } from "@workspace/api-client-react";

interface TimelineEventProps {
  event: EventWithAttendance;
  onAttendance: (eventId: string, status: string) => void;
  style?: React.CSSProperties;
}

export function TimelineEvent({ event, onAttendance, style }: TimelineEventProps) {
  const isCancelled = event.isCancelled;
  const isPast = new Date(event.endTime) < new Date();
  const status = event.attendanceStatus;

  return (
    <div 
      className={cn(
        "absolute right-0 left-[72px] border-2 border-ink p-2 flex flex-col justify-between overflow-hidden shadow-brutal-sm",
        isCancelled ? "bg-surface opacity-50" : "bg-paper hover:shadow-brutal hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all",
        !isCancelled && isPast && !status && "border-terracotta bg-terracottaLight/20"
      )}
      style={style}
    >
      <div>
        <div className="flex justify-between items-start mb-1 gap-2">
          <h4 className="font-bold text-sm leading-tight truncate">{event.title}</h4>
          <span className="font-mono text-[10px] font-bold border-2 border-ink px-1 shrink-0 bg-surface">
            {event.type}
          </span>
        </div>
        
        {event.courseShortName && (
          <div className="font-mono text-[10px] font-bold text-inkLight flex items-center gap-1">
            <span 
              className="w-2 h-2 inline-block border border-ink" 
              style={{ backgroundColor: event.courseColor || '#C4614A' }} 
            />
            {event.courseShortName}
          </div>
        )}
        
        <div className="font-mono text-[10px] text-inkLight mt-1 truncate">
          {event.location}
        </div>
      </div>
      
      {isCancelled ? (
        <div className="font-mono text-xs font-bold text-inkLight uppercase">
          CANCELLED
        </div>
      ) : (
        <div className="flex gap-1 mt-2">
          <button 
            className={cn(
              "flex-1 border-2 border-ink font-mono text-[10px] font-bold py-0.5",
              status === "ATTENDED" ? "bg-sage text-paper" : "bg-surface hover:bg-sageLight text-ink"
            )}
            onClick={(e) => { e.stopPropagation(); onAttendance(event.id, "ATTENDED"); }}
          >
            IN
          </button>
          <button 
            className={cn(
              "flex-1 border-2 border-ink font-mono text-[10px] font-bold py-0.5",
              status === "MISSED" ? "bg-terracotta text-paper" : "bg-surface hover:bg-terracottaLight text-ink"
            )}
            onClick={(e) => { e.stopPropagation(); onAttendance(event.id, "MISSED"); }}
          >
            OUT
          </button>
        </div>
      )}
    </div>
  );
}
