import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: string;
  isCancelled: boolean;
  cancellationNote?: string;
  courseId: string;
}

interface Course {
  id: string;
  subjectCode: string;
  name: string;
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

export default function SessionDetailPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [session, setSession] = useState<Event | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string>("NONE");
  const [resources, setResources] = useState<Resource[]>([]);
  const [actions, setActions] = useState<Task[]>([]);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, [courseId, sessionId]);

  const loadSessionData = async () => {
    try {
      // 1. Fetch course details
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const cData = await courseRes.json();
        setCourse(cData);
      }

      // 2. Fetch session details
      const eventsRes = await fetch(`/api/events`);
      const eventsData: Event[] = eventsRes.ok ? await eventsRes.json() : [];
      const sess = eventsData.find(e => e.id === sessionId);
      if (sess) {
        setSession(sess);

        // Fetch attendance status for session
        const attRes = await fetch(`/api/attendance?courseId=${courseId}`);
        const attData = attRes.ok ? await attRes.json() : [];
        const match = attData.find((a: any) => a.eventId === sessionId);
        setAttendanceStatus(match ? match.status : "NONE");
      }

      // 3. Fetch course resources (Artifacts)
      const resRes = await fetch(`/api/resources`);
      const resData: Resource[] = resRes.ok ? await resRes.json() : [];
      const courseResList = resData.filter(r => r.filePath?.includes(courseId) || resData); // simple course resources matching
      setResources(courseResList.filter(r => r.filePath !== undefined));

      // 4. Fetch course tasks (Actions)
      const tasksRes = await fetch(`/api/tasks`);
      const tasksData: Task[] = tasksRes.ok ? await tasksRes.json() : [];
      const courseTasks = tasksData.filter(t => t.id !== undefined); // filter
      setActions(courseTasks);

      // Auto-load markdown note content if available
      const noteResource = courseResList.find(r => r.type === "NOTE" && r.filePath?.endsWith(".md"));
      if (noteResource && noteResource.filePath) {
        readNoteContent(noteResource.filePath);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const readNoteContent = async (path: string) => {
    try {
      const res = await fetch(`/api/recordings/read?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveNoteContent(data.content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateAttendance = async (status: string) => {
    if (!session) return;
    try {
      await fetch(`/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: sessionId,
          courseId,
          status
        })
      });
      setAttendanceStatus(status);
    } catch (e) {
      console.error(e);
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
      loadSessionData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-6 font-mono text-xs text-inkLight">Loading session...</div>;
  }

  if (!session || !course) {
    return (
      <div className="p-6 text-center space-y-4">
        <h2 className="font-bold text-lg">Session or Course not found</h2>
        <Link href="/courses" className="text-xs font-mono text-sage underline block">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b-2 border-ink pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/courses/${courseId}`} className="font-mono text-xs text-sage underline">
            {course.subjectCode} {course.name}
          </Link>
          <span className="font-mono text-xs text-inkFaint">/</span>
          <span className="font-mono text-xs text-inkLight">SESSION_VIEW</span>
        </div>
        <h1 className="text-lg font-bold text-ink leading-tight">{session.title}</h1>
        <p className="font-mono text-xs text-inkLight mt-0.5">
          {new Date(session.startTime).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          {" // "}
          {new Date(session.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          {" - "}
          {new Date(session.endTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Info & Actions */}
        <div className="space-y-6">
          {/* Attendance Card */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">ATTENDANCE</span>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => updateAttendance("ATTENDED")}
                className={`py-1.5 font-mono text-xs font-bold border-2 border-ink ${
                  attendanceStatus === "ATTENDED" ? "bg-sage text-paper shadow-none" : "bg-paper text-ink active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                ✓ ATTENDED
              </button>
              <button 
                onClick={() => updateAttendance("MISSED")}
                className={`py-1.5 font-mono text-xs font-bold border-2 border-ink ${
                  attendanceStatus === "MISSED" ? "bg-terracotta text-paper shadow-none" : "bg-paper text-ink active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                ✕ MISSED
              </button>
              <button 
                onClick={() => updateAttendance("CANCELLED")}
                className={`py-1.5 font-mono text-xs font-bold border-2 border-ink ${
                  attendanceStatus === "CANCELLED" ? "bg-ink text-paper shadow-none" : "bg-paper text-ink active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                ⊘ CANCELLED
              </button>
            </div>
          </div>

          {/* Artifacts Card */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">SESSION ARTIFACTS</span>
            {resources.length > 0 ? (
              <ul className="space-y-2">
                {resources.map(res => (
                  <li key={res.id} className="text-xs">
                    <a 
                      href={res.url || `/api/recordings/download?path=${encodeURIComponent(res.filePath || "")}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-ink hover:underline font-bold block truncate"
                    >
                      📄 {res.title}
                    </a>
                    <span className="font-mono text-[10px] text-inkLight block uppercase mt-0.5">
                      Type: {res.type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-inkLight">No files associated with this class.</p>
            )}
          </div>
        </div>

        {/* Notes & Actions Reader */}
        <div className="md:col-span-2 space-y-6">
          {/* Notes Reader */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3 min-h-[300px]">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider border-b border-ink pb-1">
              CLASS KNOWLEDGE / NOTES
            </span>
            {activeNoteContent ? (
              <pre className="font-mono text-xs text-ink whitespace-pre-wrap leading-relaxed overflow-x-auto bg-paper p-3 border border-inkFaint">
                {activeNoteContent}
              </pre>
            ) : (
              <p className="text-xs text-inkLight font-mono">
                No lecture notes have been compiled for this class session yet.
              </p>
            )}
          </div>

          {/* Actions List */}
          <div className="bg-surface border-2 border-ink p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">ACTIONS ARISING</span>
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
              <p className="text-xs text-inkLight">No actions recorded for this class.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
