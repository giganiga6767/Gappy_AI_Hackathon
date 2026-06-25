import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetDashboardSummary, 
  useListEvents, 
  useMarkAttendance,
  getListEventsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";

import { BrutalCard } from "@/components/shared/BrutalCard";
import { StatPill } from "@/components/shared/StatPill";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { FluidTimeline } from "@/components/dashboard/FluidTimeline";
import { DayNavigator } from "@/components/dashboard/DayNavigator";

export default function DashboardPage() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  
  const queryClient = useQueryClient();
  
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: events = [], isLoading: isEventsLoading } = useListEvents({ date: dateStr });
  
  const markAttendance = useMarkAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const handleAttendance = (eventId: string, status: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.courseId) return;
    
    markAttendance.mutate({
      data: {
        eventId,
        courseId: event.courseId,
        status
      }
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">Command Center</h1>
          <p className="font-mono text-sm text-inkLight mt-1">NEXUS_DESK // DASHBOARD</p>
        </div>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">TODAY'S CLASSES</span>
            <div className="text-3xl font-mono font-bold mt-2">{summary.todayEventCount}</div>
            <div className="flex gap-2 mt-2">
              <BrutalBadge variant="sage">{summary.todayAttended || 0} IN</BrutalBadge>
              <BrutalBadge variant="terracotta">{summary.todayMissed || 0} OUT</BrutalBadge>
            </div>
          </BrutalCard>
          
          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">AT RISK COURSES</span>
            <div className="text-3xl font-mono font-bold mt-2 text-terracotta">
              {summary.attendanceAtRiskCount}
            </div>
          </BrutalCard>
          
          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">PENDING TASKS</span>
            <div className="text-3xl font-mono font-bold mt-2 text-amber">
              {summary.pendingTaskCount}
            </div>
          </BrutalCard>
          
          <BrutalCard className="flex flex-col justify-between bg-ink text-paper">
            <span className="font-mono text-xs font-bold text-inkFaint">OVERALL ATTENDANCE</span>
            <div className="text-3xl font-mono font-bold mt-2 text-paper">
              {(summary.overallAttendancePct || 0).toFixed(1)}%
            </div>
          </BrutalCard>
        </div>
      )}

      {/* Upcoming Exams Warning */}
      {summary?.upcomingExams && summary.upcomingExams.length > 0 && (
        <div className="bg-terracottaLight border-2 border-terracotta p-4 flex items-center justify-between shadow-brutal-accent">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-bold bg-terracotta text-paper px-2 py-1">WARNING</span>
            <span className="font-bold">{summary.upcomingExams.length} Exams upcoming in the next 14 days</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-label mb-0 border-none pb-0">TIMELINE</h2>
            <DayNavigator date={date} onChange={setDate} />
          </div>
          
          {isEventsLoading ? (
            <div className="h-[600px] bg-surface animate-pulse border-2 border-ink"></div>
          ) : (
            <FluidTimeline 
              events={events} 
              onAttendance={handleAttendance}
              date={date}
            />
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <h2 className="section-label">QUICK STATS</h2>
          
          <BrutalCard>
            <h3 className="font-bold mb-4">TODAY'S DIGEST</h3>
            <div className="space-y-3">
              <StatPill label="DATE" value={format(date, "MMM dd")} className="w-full" />
              <StatPill label="EVENTS" value={events.length} className="w-full" />
              <StatPill label="CLASSES" value={events.filter(e => e.type === 'LECTURE' || e.type === 'LAB').length} className="w-full" />
            </div>
          </BrutalCard>
        </div>
        
      </div>
    </div>
  );
}
