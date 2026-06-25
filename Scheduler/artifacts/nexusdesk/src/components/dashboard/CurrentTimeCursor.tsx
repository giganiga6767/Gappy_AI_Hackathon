import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";

const START_HOUR = 7;
const HOUR_HEIGHT_PX = 80;

export function CurrentTimeCursor() {
  const [now, setNow] = useState(new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    // Initial scroll to cursor on mount, slightly delayed
    const timer = setTimeout(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Don't show if outside the timeline range
  if (hours < START_HOUR || hours >= 22) return null;

  const topPx = ((hours + minutes / 60) - START_HOUR) * HOUR_HEIGHT_PX;

  return (
    <div 
      ref={ref}
      className="absolute w-full h-[2px] bg-terracotta z-20 flex items-center"
      style={{ top: topPx, left: 0 }}
      data-testid="current-time-cursor"
    >
      <div className="absolute left-0 bg-terracotta text-paper font-mono text-[10px] font-bold px-1 py-0.5 -mt-[9px]">
        {format(now, "HH:mm")}
      </div>
    </div>
  );
}
