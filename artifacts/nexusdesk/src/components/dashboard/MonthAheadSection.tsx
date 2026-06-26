import { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfDay, differenceInCalendarDays } from "date-fns";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EventItem {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  courseId?: string;
}

interface TaskItem {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
}

interface CourseItem {
  id: string;
  subjectCode: string;
  name: string;
  effectivePct?: number;
  minAttendancePct: number;
}

function getLoadColor(score: number): string {
  if (score === 0) return "bg-paper text-ink border-ink";
  if (score <= 2) return "bg-amberLight text-ink border-amber";
  if (score <= 4) return "bg-terracottaLight text-ink border-terracotta";
  return "bg-terracotta text-paper border-terracotta";
}

function examBadgeColor(days: number): "terracotta" | "amber" | "sage" {
  if (days <= 3) return "terracotta";
  if (days <= 7) return "amber";
  return "sage";
}

export function MonthAheadSection() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = startOfDay(new Date());
        const end = addDays(today, 30);
        const [eventsRes, tasksRes, coursesRes] = await Promise.all([
          fetch(`/api/events?startDate=${today.toISOString()}&endDate=${end.toISOString()}`),
          fetch("/api/tasks"),
          fetch("/api/courses"),
        ]);
        const eventsData: EventItem[] = eventsRes.ok ? await eventsRes.json() : [];
        const tasksData: TaskItem[] = tasksRes.ok ? await tasksRes.json() : [];
        const coursesData: CourseItem[] = coursesRes.ok ? await coursesRes.json() : [];
        setEvents(eventsData);
        setTasks(tasksData);
        setCourses(coursesData);
        const names: Record<string, string> = {};
        coursesData.forEach((c) => {
          names[c.id] = c.subjectCode;
        });
        setCourseNames(names);
      } catch (err) {
        console.error("MonthAhead load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = startOfDay(new Date());
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(today, i)), [today]);

  const exams = useMemo(
    () =>
      events
        .filter((e) => e.type === "EXAM")
        .map((e) => ({ ...e, day: startOfDay(new Date(e.startTime)) }))
        .sort((a, b) => a.day.getTime() - b.day.getTime()),
    [events]
  );

  const upcomingExams = exams.filter((e) => e.day >= today).slice(0, 3);

  const hasAtRiskCourse = courses.some(
    (c) => (c.effectivePct ?? 100) < c.minAttendancePct
  );

  const computeScore = (day: Date): number => {
    const dayStr = format(day, "yyyy-MM-dd");
    let score = 0;

    for (const exam of exams) {
      if (format(exam.day, "yyyy-MM-dd") === dayStr) score += 3;
      else {
        const proximity = Math.abs(differenceInCalendarDays(day, exam.day));
        if (proximity <= 2 && proximity > 0) score += 2;
      }
    }

    for (const ev of events) {
      if (format(new Date(ev.startTime), "yyyy-MM-dd") !== dayStr) continue;
      if (["LECTURE", "LAB", "TUTORIAL"].includes(ev.type)) score += 1;
    }

    for (const task of tasks) {
      if (task.dueDate === dayStr && task.status !== "DONE") score += 1;
    }

    if (hasAtRiskCourse) score += 2;

    return score;
  };

  const getDayDetails = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayEvents = events.filter(
      (e) => format(new Date(e.startTime), "yyyy-MM-dd") === dayStr
    );
    const dayTasks = tasks.filter((t) => t.dueDate === dayStr && t.status !== "DONE");
    const nearestExam = exams.find((e) => e.day >= day);
    const daysToExam = nearestExam ? differenceInCalendarDays(nearestExam.day, day) : null;

    return { dayEvents, dayTasks, nearestExam, daysToExam };
  };

  const weekHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const gridOffset = (days[0].getDay() + 6) % 7;
  const gridCells: (Date | null)[] = [
    ...Array(gridOffset).fill(null),
    ...days,
  ];
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  if (loading) {
    return (
      <BrutalCard className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </BrutalCard>
    );
  }

  return (
    <BrutalCard className="space-y-4">
      <h3 className="font-bold uppercase tracking-tight">Month Ahead</h3>

      {upcomingExams.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b-2 border-dashed border-inkFaint">
          {upcomingExams.map((exam) => {
            const daysLeft = differenceInCalendarDays(exam.day, today);
            return (
              <BrutalBadge key={exam.id} variant={examBadgeColor(daysLeft)}>
                {exam.title} — {daysLeft} days
              </BrutalBadge>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {weekHeaders.map((h) => (
          <div key={h} className="font-mono text-[10px] font-bold text-center text-inkLight py-1">
            {h}
          </div>
        ))}
        {gridCells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-12" />;
          const score = computeScore(day);
          const hasExam = exams.some((e) => format(e.day, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
          const { dayEvents, dayTasks, nearestExam, daysToExam } = getDayDetails(day);

          return (
            <Popover key={day.toISOString()}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`h-12 border-2 p-1 text-left relative transition-all hover:shadow-brutal-sm ${getLoadColor(score)}`}
                >
                  <span className="font-mono text-xs font-bold">{format(day, "d")}</span>
                  {hasExam && (
                    <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-terracotta border border-ink" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 border-2 border-ink bg-paper p-3 font-mono text-xs space-y-2">
                <p className="font-bold">{format(day, "EEE, MMM d")}</p>
                {dayEvents.length > 0 && (
                  <div>
                    <p className="font-bold text-inkLight mb-1">SESSIONS</p>
                    {dayEvents.map((e) => (
                      <p key={e.id}>
                        {e.type} — {courseNames[e.courseId || ""] || e.title} —{" "}
                        {format(new Date(e.startTime), "HH:mm")}
                      </p>
                    ))}
                  </div>
                )}
                {dayTasks.length > 0 && (
                  <div>
                    <p className="font-bold text-inkLight mb-1">TASKS DUE</p>
                    {dayTasks.map((t) => (
                      <p key={t.id}>{t.title}</p>
                    ))}
                  </div>
                )}
                {nearestExam && daysToExam !== null && (
                  <p className="text-terracotta font-bold">
                    Nearest: {nearestExam.title} ({daysToExam} days)
                  </p>
                )}
                {dayEvents.length === 0 && dayTasks.length === 0 && !nearestExam && (
                  <p className="text-inkLight">Light day</p>
                )}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </BrutalCard>
  );
}
