import { useState } from "react";
import { format, addDays, subDays, startOfMonth, eachDayOfInterval, endOfMonth } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useListEvents,
  useMarkAttendance,
  useListTasks,
  getListEventsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { StatPill } from "@/components/shared/StatPill";
import { FluidTimeline } from "@/components/dashboard/FluidTimeline";
import { DayNavigator } from "@/components/dashboard/DayNavigator";
import { usePersona } from "@/context/PersonaContext";
import { Mic, MicOff, CheckSquare, Square } from "lucide-react";

function AttendanceHeatmap({ attendancePct, threshold }: { attendancePct: number; threshold: number }) {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });

  const getColor = (day: Date) => {
    const isPast = day <= today;
    if (!isPast) return "bg-surface border-inkFaint";
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (isWeekend) return "bg-inkFaint/20 border-inkFaint";
    const rand = ((day.getDate() * 7 + day.getMonth() * 13) % 100);
    const simulated = attendancePct + (rand - 50) * 0.3;
    if (simulated >= threshold + 5) return "bg-sage border-sageDark";
    if (simulated >= threshold - 5) return "bg-amber border-amber";
    return "bg-terracotta border-terracottaDark";
  };

  const getLegendLabel = (color: string) => {
    if (color.includes("sage")) return "SAFE";
    if (color.includes("amber")) return "NEAR THRESHOLD";
    if (color.includes("terracotta")) return "DANGER";
    return "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {days.map(day => {
          const color = getColor(day);
          return (
            <div
              key={day.toISOString()}
              className={`w-6 h-6 border-2 ${color} flex items-center justify-center`}
              title={`${format(day, "MMM d")} — ${getLegendLabel(color) || "future"}`}
            >
              <span className="font-mono text-[8px] font-bold text-ink/60">{day.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-sage border border-sageDark" />SAFE
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-amber border border-amber" />NEAR
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-terracotta border border-terracottaDark" />DANGER
        </div>
      </div>
    </div>
  );
}

function RecordingWidget() {
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const res = await fetch("/api/record/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Lecture Recording" }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setRecording(true);
        setElapsed(0);
        const t = setInterval(() => setElapsed(e => e + 1), 1000);
        setTimerRef(t);
      }
    } catch {}
  };

  const stopRecording = async () => {
    if (timerRef) clearInterval(timerRef);
    setTimerRef(null);
    setRecording(false);
    if (sessionId) {
      try {
        await fetch("/api/record/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
    }
    setSessionId(null);
    setElapsed(0);
  };

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <BrutalCard className={`p-4 ${recording ? "border-terracotta bg-terracottaLight/20 shadow-brutal-accent" : ""}`}>
      <h3 className="section-label mb-3">LECTURE RECORDER</h3>
      <div className="flex items-center gap-3">
        {recording ? (
          <>
            <div className="w-3 h-3 bg-terracotta border-2 border-terracottaDark animate-pulse" />
            <span className="font-mono text-sm font-bold">REC {mins}:{secs}</span>
            <BrutalButton onClick={stopRecording} className="ml-auto">
              <MicOff className="h-4 w-4 mr-1" /> STOP
            </BrutalButton>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 text-inkLight" />
            <span className="font-mono text-xs text-inkLight">Ready to record class</span>
            <BrutalButton variant="primary" onClick={startRecording} className="ml-auto">
              <Mic className="h-4 w-4 mr-1" /> RECORD
            </BrutalButton>
          </>
        )}
      </div>
    </BrutalCard>
  );
}

export default function StudentDashboard() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const { isParentView, studentView } = usePersona();

  const { data: summary } = useGetDashboardSummary();
  const { data: events = [], isLoading: isEventsLoading } = useListEvents({ date: dateStr });
  const { data: tasks = [] } = useListTasks();

  const [attendanceThreshold, setAttendanceThreshold] = useState(75);

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
    markAttendance.mutate({ data: { eventId, courseId: event.courseId, status } });
  };

  const overallPct = summary?.overallAttendancePct ?? 0;
  const safeToSkip = Math.max(0, Math.floor(
    ((overallPct / 100) * (summary?.todayEventCount ?? 20) - (attendanceThreshold / 100) * (summary?.todayEventCount ?? 20))
  ));

  const pendingTasks = tasks.filter(t => t.status !== "DONE");
  const todoPct = tasks.length ? Math.round((tasks.filter(t => t.status === "DONE").length / tasks.length) * 100) : 0;

  const viewLabel = isParentView ? "Child's Progress" : "My Dashboard";

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {studentView === "parent" && (
              <span className="font-mono text-xs font-bold bg-amber text-paper border-2 border-ink px-2 py-0.5">
                PARENT VIEW
              </span>
            )}
          </div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">
            {isParentView ? "Child's Command Center" : "Command Center"}
          </h1>
          <p className="font-mono text-sm text-inkLight mt-1">
            {isParentView ? "PARENT // TRACKING_PROGRESS" : "STUDENT // ACADEMIC_DASHBOARD"}
          </p>
        </div>
        <div className="font-mono text-sm font-bold border-2 border-ink px-3 py-1 bg-surface">
          {format(date, "EEEE, MMM d")}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">
              {isParentView ? "TODAY'S CLASSES" : "TODAY'S CLASSES"}
            </span>
            <div className="text-3xl font-mono font-bold mt-2">{summary.todayEventCount}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <BrutalBadge variant="sage">{summary.todayAttended || 0} IN</BrutalBadge>
              <BrutalBadge variant="terracotta">{summary.todayMissed || 0} OUT</BrutalBadge>
            </div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">AT RISK</span>
            <div className="text-3xl font-mono font-bold mt-2 text-terracotta">
              {summary.attendanceAtRiskCount}
            </div>
            <div className="font-mono text-[10px] text-inkLight">courses below threshold</div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">
              {isParentView ? "PENDING TASKS" : "PENDING TASKS"}
            </span>
            <div className="text-3xl font-mono font-bold mt-2 text-amber">
              {summary.pendingTaskCount}
            </div>
            <div className="font-mono text-[10px] text-inkLight">{todoPct}% complete</div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between bg-ink text-paper">
            <span className="font-mono text-xs font-bold text-inkFaint">OVERALL ATTENDANCE</span>
            <div className="text-3xl font-mono font-bold mt-2">{overallPct.toFixed(1)}%</div>
            <div className={`font-mono text-[10px] ${overallPct >= attendanceThreshold ? "text-sageLight" : "text-terracottaLight"}`}>
              {overallPct >= attendanceThreshold ? "ABOVE THRESHOLD" : "BELOW THRESHOLD"}
            </div>
          </BrutalCard>
        </div>
      )}

      {summary?.upcomingExams && summary.upcomingExams.length > 0 && (
        <div className="bg-terracottaLight border-2 border-terracotta p-3 flex items-center gap-4 shadow-brutal-accent">
          <span className="font-mono text-sm font-bold bg-terracotta text-paper px-2 py-1">EXAM ALERT</span>
          <span className="font-bold font-mono text-sm">{summary.upcomingExams.length} exam(s) in the next 14 days</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-label mb-0 border-none pb-0">TODAY'S TIMELINE</h2>
            <DayNavigator date={date} onChange={setDate} />
          </div>

          {isEventsLoading ? (
            <div className="h-[500px] bg-surface animate-pulse border-2 border-ink" />
          ) : (
            <FluidTimeline events={events} onAttendance={handleAttendance} date={date} />
          )}
        </div>

        <div className="space-y-4">
          <BrutalCard>
            <h3 className="section-label mb-3">ATTENDANCE TRACKER</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-inkLight">CURRENT</span>
                <span className={`font-mono text-xl font-bold ${overallPct >= attendanceThreshold ? "text-sage" : "text-terracotta"}`}>
                  {overallPct.toFixed(1)}%
                </span>
              </div>

              <div className="h-4 border-2 border-ink bg-surface relative overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${overallPct >= attendanceThreshold ? "bg-sage" : "bg-terracotta"}`}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-ink"
                  style={{ left: `${attendanceThreshold}%` }}
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[10px] font-bold text-inkLight mb-1">
                  <span>THRESHOLD: {attendanceThreshold}%</span>
                  <span className={safeToSkip > 0 ? "text-sage" : "text-terracotta"}>
                    {safeToSkip > 0 ? `${safeToSkip} SAFE TO SKIP` : "CANNOT SKIP"}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={attendanceThreshold}
                  onChange={e => setAttendanceThreshold(Number(e.target.value))}
                  className="w-full h-2 accent-ink cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[9px] text-inkFaint mt-0.5">
                  <span>50%</span><span>75%</span><span>85%</span><span>100%</span>
                </div>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard>
            <h3 className="section-label mb-3">ATTENDANCE RISK CALENDAR</h3>
            <AttendanceHeatmap attendancePct={overallPct} threshold={attendanceThreshold} />
          </BrutalCard>

          <BrutalCard>
            <h3 className="section-label mb-3">
              {isParentView ? "CHILD'S HOMEWORK CHECKLIST" : "HOMEWORK CHECKLIST"}
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {pendingTasks.slice(0, 8).map(task => (
                <div key={task.id} className="flex items-start gap-2 font-mono text-xs border-b border-inkFaint pb-1.5">
                  <div className={`w-3 h-3 border-2 border-ink mt-0.5 flex-shrink-0 ${task.status === "IN_PROGRESS" ? "bg-amber" : "bg-surface"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{task.title}</div>
                    {task.dueDate && (
                      <div className="text-inkLight text-[9px]">Due {format(new Date(task.dueDate), "MMM d")}</div>
                    )}
                  </div>
                  <BrutalBadge variant={task.priority === "HIGH" || task.priority === "CRITICAL" ? "terracotta" : "default"} className="text-[8px] px-1">
                    {task.priority}
                  </BrutalBadge>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="font-mono text-xs text-inkLight text-center py-4">ALL TASKS COMPLETE</div>
              )}
            </div>
          </BrutalCard>

          <RecordingWidget />
        </div>
      </div>
    </div>
  );
}
