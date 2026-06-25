import { useMemo } from "react";
import type { EventWithAttendance } from "@workspace/api-client-react";
import { TimelineEvent } from "./TimelineEvent";
import { CurrentTimeCursor } from "./CurrentTimeCursor";

interface FluidTimelineProps {
  events: EventWithAttendance[];
  onAttendance: (eventId: string, status: string) => void;
  date: Date;
}

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT_PX = 80;

export function FluidTimeline({ events, onAttendance, date }: FluidTimelineProps) {
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT_PX;
  
  const hours = useMemo(() => {
    return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  }, []);

  return (
    <div className="relative w-full border-2 border-ink bg-surface overflow-hidden" style={{ height: totalHeight }}>
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none">
        {hours.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT_PX;
          return (
            <div 
              key={`grid-${hour}`} 
              className="absolute w-full border-t border-inkFaint border-dashed"
              style={{ top }}
            />
          );
        })}
      </div>
      
      {/* Time Labels */}
      <div className="absolute top-0 bottom-0 left-0 w-[64px] border-r-2 border-ink bg-paper z-10">
        {hours.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT_PX;
          return (
            <div 
              key={`label-${hour}`}
              className="absolute w-full text-center font-mono text-[10px] font-bold text-inkLight -mt-2"
              style={{ top }}
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          );
        })}
      </div>

      {/* Events */}
      <div className="absolute inset-0 z-10">
        {events.map((event) => {
          const startDate = new Date(event.startTime);
          const startHour = startDate.getHours();
          const startMin = startDate.getMinutes();
          
          // Filter out events that don't fall in range or are on wrong day
          if (startHour < START_HOUR || startHour >= END_HOUR) return null;
          
          const duration = event.durationMinutes || 60;
          
          const top = ((startHour + startMin / 60) - START_HOUR) * HOUR_HEIGHT_PX;
          const height = (duration / 60) * HOUR_HEIGHT_PX;
          
          return (
            <TimelineEvent 
              key={event.id}
              event={event}
              onAttendance={onAttendance}
              style={{ top, height }}
            />
          );
        })}
        
        {/* Current Time Cursor - only show if date is today */}
        {new Date().toDateString() === date.toDateString() && (
          <CurrentTimeCursor />
        )}
      </div>
    </div>
  );
}
