import { useState, useEffect } from "react";
import { Link } from "wouter";

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
  courseId?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  filePath?: string;
  url?: string;
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

export default function TodayPage() {
  const [nextSession, setNextSession] = useState<Event | null>(null);
  const [unfinishedActions, setUnfinishedActions] = useState<Task[]>([]);
  const [recentLearning, setRecentLearning] = useState<Resource[]>([]);
  const [semesterHealth, setSemesterHealth] = useState<Array<{ course: Course; attPct: number; isAtRisk: boolean }>>([]);
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // Fetch events today
        const eventsRes = await fetch(`/api/events?date=${todayStr}`);
        const eventsData: Event[] = eventsRes.ok ? await eventsRes.json() : [];
        
        // Find next session (future event today)
        const now = new Date();
        const futureEvents = eventsData
          .map(e => ({ ...e, start: new Date(e.startTime) }))
          .filter(e => e.start > now)
          .sort((a, b) => a.start.getTime() - b.start.getTime());
        setNextSession(futureEvents[0] || null);

        // Fetch tasks (Actions)
        const tasksRes = await fetch("/api/tasks");
        const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];
        setUnfinishedActions(tasksData.filter(t => t.status !== "DONE").slice(0, 5));

        // Fetch resources (Artifacts)
        const resourcesRes = await fetch("/api/resources");
        const resourcesData: Resource[] = resourcesRes.ok ? await resourcesRes.json() : [];
        // Sort by date descending
        const sortedResources = resourcesData
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentLearning(sortedResources);

        // Fetch courses and calculate attendance health
        const coursesRes = await fetch("/api/courses");
        const coursesData: Course[] = coursesRes.ok ? await coursesRes.json() : [];
        
        const healthList = [];
        for (const c of coursesData) {
          // Fetch attendance for course
          const attRes = await fetch(`/api/attendance?courseId=${c.id}`);
          const attData = attRes.ok ? await attRes.json() : [];
          const present = attData.filter((r: any) => r.status === "ATTENDED").length;
          const missed = attData.filter((r: any) => r.status === "MISSED").length;
          const total = present + missed;
          const attPct = total === 0 ? 100 : Math.round((present / total) * 100);
          healthList.push({
            course: c,
            attPct,
            isAtRisk: attPct < c.minAttendancePct
          });
        }
        setSemesterHealth(healthList);

        // Fetch inbox items
        const inboxRes = await fetch("/api/inbox");
        const inboxData: InboxItem[] = inboxRes.ok ? await inboxRes.json() : [];
        setInboxCount(inboxData.filter(item => item.status !== "applied").length);

      } catch (err) {
        console.error("Error loading today data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleToggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === "DONE" ? "TODO" : "DONE";
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      // Refresh tasks
      const tasksRes = await fetch("/api/tasks");
      const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];
      setUnfinishedActions(tasksData.filter(t => t.status !== "DONE").slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-surface animate-pulse border-2 border-ink"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-48 bg-surface animate-pulse border-2 border-ink"></div>
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
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <span className="font-mono text-xs text-inkLight">NEXUSDESK // DESK_VIEW</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Next Session */}
        <div className="bg-surface border-2 border-ink p-4 flex flex-col justify-between min-h-[160px]">
          <div>
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider mb-2">NEXT SESSION</span>
            {nextSession ? (
              <div>
                <h2 className="text-lg font-bold text-ink leading-tight">{nextSession.title}</h2>
                <p className="font-mono text-xs text-inkLight mt-1">
                  {new Date(nextSession.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  {nextSession.location ? ` @ ${nextSession.location}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-inkLight">No upcoming sessions scheduled for today.</p>
            )}
          </div>
          {nextSession && nextSession.courseId && (
            <Link href={`/courses/${nextSession.courseId}`} className="text-xs font-mono font-bold text-sage underline mt-4 block">
              View course details →
            </Link>
          )}
        </div>

        {/* Card 2: Inbox Status */}
        <div className="bg-surface border-2 border-ink p-4 flex flex-col justify-between min-h-[160px]">
          <div>
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider mb-2">INBOX STATUS</span>
            <p className="text-sm text-ink leading-tight">
              You have <span className="font-mono font-bold text-terracotta">{inboxCount}</span> unprocessed item{inboxCount === 1 ? "" : "s"} waiting in your inbox.
            </p>
          </div>
          <Link href="/inbox" className="text-xs font-mono font-bold text-sage underline mt-4 block">
            Go to Inbox →
          </Link>
        </div>

        {/* Card 3: Unfinished Actions */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">UNFINISHED ACTIONS</span>
          {unfinishedActions.length > 0 ? (
            <ul className="space-y-2">
              {unfinishedActions.map(task => (
                <li key={task.id} className="flex items-start gap-2.5 text-sm">
                  <input 
                    type="checkbox" 
                    checked={task.status === "DONE"} 
                    onChange={() => handleToggleTask(task)}
                    className="mt-0.5 border-2 border-ink focus:ring-0 rounded-none w-4 h-4 text-sage"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block truncate text-ink">{task.title}</span>
                    {task.dueDate && (
                      <span className="font-mono text-xs text-inkLight block mt-0.5">Due: {task.dueDate}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-inkLight">No pending actions. Your desk is clear.</p>
          )}
        </div>

        {/* Card 4: Recent Learning */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">RECENT LEARNING</span>
          {recentLearning.length > 0 ? (
            <ul className="space-y-2">
              {recentLearning.map(res => (
                <li key={res.id} className="text-sm">
                  {res.url ? (
                    <a 
                      href={res.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-ink hover:underline block truncate"
                    >
                      {res.title}
                    </a>
                  ) : (
                    <span className="text-ink block truncate">{res.title}</span>
                  )}
                  <span className="font-mono text-xs text-inkLight block mt-0.5">
                    {res.type} // {new Date(res.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-inkLight">No recent learning materials added.</p>
          )}
        </div>

        {/* Card 5: Semester Health */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4 md:col-span-2">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">SEMESTER HEALTH (ATTENDANCE)</span>
          {semesterHealth.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {semesterHealth.map(({ course, attPct, isAtRisk }) => (
                <div 
                  key={course.id} 
                  className={`border-2 border-ink p-2.5 flex justify-between items-center ${
                    isAtRisk ? "bg-terracotta text-paper border-ink" : "bg-surface text-ink"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs block font-bold truncate">{course.subjectCode}</span>
                    <span className="text-xs block truncate opacity-80">{course.name}</span>
                  </div>
                  <div className="font-mono text-lg font-bold ml-4">
                    {attPct}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-inkLight">No courses found to track health.</p>
          )}
        </div>
      </div>
    </div>
  );
}
