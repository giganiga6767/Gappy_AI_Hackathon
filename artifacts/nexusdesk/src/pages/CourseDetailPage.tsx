import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";

interface Course {
  id: string;
  subjectCode: string;
  name: string;
  creditWeight: number;
  minAttendancePct: number;
  facultyName?: string;
  roomNumber?: string;
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  filePath?: string;
  url?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Event[]>([]);
  const [artifacts, setArtifacts] = useState<Resource[]>([]);
  const [actions, setActions] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState({ attended: 0, missed: 0, pct: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      // 1. Course Details
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const cData = await courseRes.json();
        setCourse(cData);
      }

      // 2. Course Sessions (events matching this courseId)
      const eventsRes = await fetch("/api/events");
      const eventsData: Event[] = eventsRes.ok ? await eventsRes.json() : [];
      // Filter for events matching this course code/id
      const courseEvents = eventsData.filter((e: any) => e.courseId === courseId);
      setSessions(courseEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));

      // Calculate attendance
      const attRes = await fetch(`/api/attendance?courseId=${courseId}`);
      const attData = attRes.ok ? await attRes.json() : [];
      const attended = attData.filter((r: any) => r.status === "ATTENDED").length;
      const missed = attData.filter((r: any) => r.status === "MISSED").length;
      const total = attended + missed;
      const pct = total === 0 ? 100 : Math.round((attended / total) * 100);
      setAttendance({ attended, missed, pct });

      // 3. Course Artifacts (resources)
      const resRes = await fetch("/api/resources");
      const resData: Resource[] = resRes.ok ? await resRes.json() : [];
      const courseResources = resData.filter((r: any) => r.courseId === courseId);
      setArtifacts(courseResources);

      // 4. Course Actions (tasks)
      const tasksRes = await fetch("/api/tasks");
      const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];
      const courseTasks = tasksData.filter((t: any) => t.linkedCourseId === courseId);
      setActions(courseTasks);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === "DONE" ? "TODO" : "DONE";
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      loadCourseData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-6 font-mono text-xs text-inkLight">Loading course...</div>;
  }

  if (!course) {
    return <div className="p-6 font-mono text-xs text-terracotta">Course not found.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b-2 border-ink pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/courses" className="font-mono text-xs text-sage underline">
            Courses
          </Link>
          <span className="font-mono text-xs text-inkFaint">/</span>
          <span className="font-mono text-xs text-inkLight bg-surface border border-ink px-1.5 font-bold">
            {course.subjectCode}
          </span>
        </div>
        <h1 className="text-lg font-bold text-ink leading-tight">{course.name}</h1>
        <p className="font-mono text-xs text-inkLight mt-0.5">Credits: {course.creditWeight} // Min Attendance: {course.minAttendancePct}%</p>
      </div>

      {/* Grid: Course Info and Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column */}
        <div className="space-y-6">
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">COURSE INFO</span>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-mono text-[9px] text-inkLight block">FACULTY</span>
                <span className="font-bold text-ink">{course.facultyName || "N/A"}</span>
              </div>
              <div>
                <span className="font-mono text-[9px] text-inkLight block">ROOM / LOCATION</span>
                <span className="font-bold text-ink">{course.roomNumber || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className={`border-2 border-ink p-4 space-y-3 ${attendance.pct < course.minAttendancePct ? "bg-terracotta text-paper" : "bg-surface text-ink"}`}>
            <span className="font-mono text-xs font-bold block uppercase tracking-wider">ATTENDANCE HEALTH</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold">{attendance.pct}%</span>
              <span className="font-mono text-[10px] opacity-80">
                {attendance.attended} Present / {attendance.missed} Missed
              </span>
            </div>
          </div>
        </div>

        {/* Sessions, Artifacts, and Actions Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Sessions List */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">SESSIONS</span>
            {sessions.length > 0 ? (
              <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {sessions.map(sess => (
                  <li key={sess.id} className="text-xs">
                    <Link 
                      href={`/courses/${courseId}/session/${sess.id}`}
                      className="font-bold text-ink hover:underline block truncate"
                    >
                      📅 {sess.title}
                    </Link>
                    <span className="font-mono text-[10px] text-inkLight block mt-0.5">
                      {new Date(sess.startTime).toLocaleDateString()} @ {new Date(sess.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-inkLight">No sessions found for this course.</p>
            )}
          </div>

          {/* Artifacts List */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">COURSE ARTIFACTS</span>
            {artifacts.length > 0 ? (
              <ul className="space-y-2">
                {artifacts.map(art => (
                  <li key={art.id} className="text-xs">
                    <a 
                      href={art.url || `/api/recordings/download?path=${encodeURIComponent(art.filePath || "")}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-ink hover:underline font-bold block truncate"
                    >
                      📄 {art.title}
                    </a>
                    <span className="font-mono text-[10px] text-inkLight block mt-0.5">
                      Type: {art.type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-inkLight">No learning artifacts uploaded.</p>
            )}
          </div>

          {/* Actions List */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">ACTIONS</span>
            {actions.length > 0 ? (
              <ul className="space-y-2">
                {actions.map(task => (
                  <li key={task.id} className="flex items-start gap-2.5 text-xs">
                    <input 
                      type="checkbox" 
                      checked={task.status === "DONE"} 
                      onChange={() => handleToggleTask(task)}
                      className="mt-0.5 border-2 border-ink focus:ring-0 rounded-none w-3.5 h-3.5 text-sage"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs block truncate text-ink">{task.title}</span>
                      {task.dueDate && (
                        <span className="font-mono text-[10px] text-inkLight block mt-0.5">Due: {task.dueDate}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-inkLight">No actions pending.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
