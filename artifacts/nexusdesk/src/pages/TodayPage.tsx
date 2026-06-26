import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
  courseId?: string;
  courseShortName?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface Course {
  id: string;
  subjectCode: string;
  name: string;
  minAttendancePct: number;
}

interface InboxItem {
  id: string;
  title: string;
  status: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-terracotta text-paper",
  HIGH: "bg-amberLight text-ink border-amber",
  MEDIUM: "bg-surface text-ink",
  LOW: "bg-surface text-inkLight",
};

export default function TodayPage() {
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [unfinishedActions, setUnfinishedActions] = useState<Task[]>([]);
  const [semesterHealth, setSemesterHealth] = useState<
    Array<{ course: Course; attPct: number; isAtRisk: boolean }>
  >([]);
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      const [eventsRes, tasksRes, coursesRes, inboxRes] = await Promise.all([
        fetch(`/api/events?date=${todayStr}`),
        fetch("/api/tasks"),
        fetch("/api/courses"),
        fetch("/api/inbox"),
      ]);

      const eventsData: Event[] = eventsRes.ok ? await eventsRes.json() : [];
      setTodayEvents(eventsData);

      const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];
      setUnfinishedActions(tasksData.filter((t) => t.status !== "DONE").slice(0, 6));

      const coursesData: Course[] = coursesRes.ok ? await coursesRes.json() : [];
      const healthList = await Promise.all(
        coursesData.map(async (c) => {
          const attRes = await fetch(`/api/attendance?courseId=${c.id}`);
          const attData = attRes.ok ? await attRes.json() : [];
          const present = attData.filter((r: any) => r.status === "ATTENDED").length;
          const missed = attData.filter((r: any) => r.status === "ABSENT" || r.status === "MISSED").length;
          const total = present + missed;
          const attPct = total === 0 ? 100 : Math.round((present / total) * 100);
          return { course: c, attPct, isAtRisk: attPct < c.minAttendancePct };
        })
      );
      setSemesterHealth(healthList);

      const inboxData: InboxItem[] = inboxRes.ok ? await inboxRes.json() : [];
      setInboxCount(inboxData.filter((item) => item.status !== "applied").length);
    } catch (err) {
      console.error("Error loading today data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUnfinishedActions((prev) =>
      prev
        .map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        .filter((t) => t.status !== "DONE")
    );
  };

  const handleLoadDemo = async () => {
    if (!confirm("This will replace ALL existing data with demo data. Continue?")) return;
    setDemoLoading(true);
    setDemoMessage(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDemoMessage(
          `✅ Demo loaded: ${data.summary.courses} courses, ${data.summary.events} events, ${data.summary.attendanceRecords} attendance records, ${data.summary.tasks} tasks.`
        );
        setLoading(true);
        await loadData();
      } else {
        setDemoMessage(`❌ Failed: ${data.error}`);
      }
    } catch (e) {
      setDemoMessage("❌ Error connecting to API.");
    } finally {
      setDemoLoading(false);
    }
  };

  const now = new Date();
  const currentEvent = todayEvents.find(
    (e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now
  );
  const upcomingEvents = todayEvents
    .filter((e) => new Date(e.startTime) > now)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-surface animate-pulse border-2 border-ink" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-48 bg-surface animate-pulse border-2 border-ink" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-ink pb-2">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-tighter text-ink uppercase">Today</h1>
          <p className="font-mono text-xs text-inkLight mt-0.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-inkLight hidden sm:block">NEXUSDESK // DESK_VIEW</span>
          <button
            onClick={handleLoadDemo}
            disabled={demoLoading}
            className="px-3 py-1.5 bg-amber text-paper font-mono text-xs font-bold border-2 border-ink shadow-brutal-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
          >
            {demoLoading ? "LOADING..." : "🎲 LOAD DEMO DATA"}
          </button>
        </div>
      </div>

      {/* Demo feedback */}
      {demoMessage && (
        <div className="bg-sageLight border-2 border-ink p-3 font-mono text-xs text-ink">
          {demoMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Today's Sessions */}
        <div className="bg-surface border-2 border-ink p-4 space-y-3">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">
            TODAY'S SESSIONS
          </span>
          {currentEvent && (
            <div className="border-2 border-sage bg-sageLight p-3">
              <span className="font-mono text-[10px] font-bold text-sageDark block mb-1">
                🟢 NOW IN PROGRESS
              </span>
              <h2 className="font-bold text-sm text-ink">{currentEvent.title}</h2>
              <p className="font-mono text-xs text-inkLight mt-0.5">
                {new Date(currentEvent.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {new Date(currentEvent.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {currentEvent.location ? ` @ ${currentEvent.location}` : ""}
              </p>
            </div>
          )}
          {upcomingEvents.length > 0 ? (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b border-dashed border-inkFaint pb-1.5 last:border-0 last:pb-0">
                  <div>
                    <span className="text-sm font-bold text-ink block">{e.title}</span>
                    <span className="font-mono text-xs text-inkLight">
                      {new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {e.location ? ` @ ${e.location}` : ""}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-paper border border-ink px-1.5 py-0.5 uppercase font-bold">
                    {e.type}
                  </span>
                </li>
              ))}
            </ul>
          ) : !currentEvent ? (
            <p className="text-sm text-inkLight">No sessions scheduled for today.</p>
          ) : null}
          {todayEvents.length > 0 && (
            <Link href="/planner" className="font-mono text-xs font-bold text-sage underline block">
              View full calendar →
            </Link>
          )}
        </div>

        {/* Card 2: Inbox Status */}
        <div className="bg-surface border-2 border-ink p-4 flex flex-col justify-between min-h-[160px]">
          <div>
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider mb-2">
              INBOX STATUS
            </span>
            {inboxCount > 0 ? (
              <p className="text-sm text-ink">
                <span className="font-mono font-bold text-terracotta text-lg">{inboxCount}</span>{" "}
                unprocessed item{inboxCount === 1 ? "" : "s"} waiting.
              </p>
            ) : (
              <p className="text-sm text-inkLight">Inbox clear. Nothing pending.</p>
            )}
          </div>
          <Link href="/inbox" className="font-mono text-xs font-bold text-sage underline mt-4 block">
            Go to Inbox →
          </Link>
        </div>

        {/* Card 3: Unfinished Actions */}
        <div className="bg-surface border-2 border-ink p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">
              PENDING ACTIONS
            </span>
            <Link href="/tasks" className="font-mono text-xs text-sage underline">
              all tasks →
            </Link>
          </div>
          {unfinishedActions.length > 0 ? (
            <ul className="space-y-2">
              {unfinishedActions.map((task) => (
                <li key={task.id} className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.status === "DONE"}
                    onChange={() => handleToggleTask(task)}
                    className="mt-0.5 border-2 border-ink focus:ring-0 w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block truncate text-ink">{task.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.dueDate && (
                        <span className="font-mono text-[10px] text-inkLight">
                          Due: {task.dueDate}
                        </span>
                      )}
                      <span
                        className={`font-mono text-[9px] font-bold px-1 border border-ink uppercase ${
                          PRIORITY_COLORS[task.priority] || "bg-surface text-ink"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-inkLight">No pending actions. Desk clear.</p>
          )}
        </div>

        {/* Card 4: Semester Health */}
        <div className="bg-surface border-2 border-ink p-4 space-y-3">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">
            ATTENDANCE HEALTH
          </span>
          {semesterHealth.length > 0 ? (
            <ul className="space-y-2">
              {semesterHealth.map(({ course, attPct, isAtRisk }) => (
                <li
                  key={course.id}
                  className={`flex justify-between items-center border-2 border-ink px-3 py-2 ${
                    isAtRisk ? "bg-terracotta text-paper" : "bg-paper text-ink"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold block truncate">
                      {course.subjectCode}
                    </span>
                    <span className="text-[11px] opacity-80 truncate block">{course.name}</span>
                  </div>
                  <div className="font-mono font-bold text-lg ml-4 flex-shrink-0">
                    {attPct}%
                    {isAtRisk && (
                      <span className="ml-1 font-mono text-[10px] font-bold opacity-80">⚠</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-inkLight mb-3">No courses yet.</p>
              <button
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="px-4 py-2 bg-ink text-paper font-mono text-xs font-bold border-2 border-ink"
              >
                🎲 Load Demo Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
