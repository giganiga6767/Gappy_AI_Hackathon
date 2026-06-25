import { useParams } from "wouter";
import { useGetCourse, useGetCourseGradeSummary } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { StatPill } from "@/components/shared/StatPill";
import { AttendanceGauge } from "@/components/shared/AttendanceGauge";
import { GradeLedger } from "@/components/courses/GradeLedger";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course, isLoading: isCourseLoading } = useGetCourse(courseId || "");
  const { data: gradeSummary, isLoading: isGradesLoading } = useGetCourseGradeSummary(courseId || "");

  if (isCourseLoading || !course) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span 
              className="w-4 h-4 inline-block border-2 border-ink shadow-brutal-sm"
              style={{ backgroundColor: course.color || '#2D2D2D' }}
            />
            <span className="font-mono text-lg font-bold text-inkLight bg-surface px-2 border-2 border-ink">
              {course.subjectCode}
            </span>
          </div>
          <h1 className="text-4xl font-heading font-extrabold tracking-tighter leading-tight">
            {course.name}
          </h1>
        </div>
        <StatPill label="CREDITS" value={course.creditWeight} variant="default" className="text-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column */}
        <div className="space-y-6">
          <BrutalCard>
            <h3 className="section-label mb-3">COURSE INFO</h3>
            <div className="space-y-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-inkLight block mb-1">FACULTY</span>
                <div className="font-bold text-sm">{course.facultyName || "N/A"}</div>
              </div>
              <div className="h-[2px] bg-inkFaint border-dashed w-full" />
              <div>
                <span className="font-mono text-[10px] font-bold text-inkLight block mb-1">ROOM</span>
                <div className="font-bold text-sm">{course.roomNumber || "N/A"}</div>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard className={course.isAtRisk ? "border-terracotta bg-terracottaLight/20 shadow-brutal-accent" : ""}>
            <h3 className="section-label mb-3">ATTENDANCE</h3>
            <AttendanceGauge 
              effectivePct={course.effectivePct}
              targetPct={course.minAttendancePct}
              attended={course.attended}
              missed={course.missed}
              isAtRisk={course.isAtRisk}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border-2 border-ink bg-surface p-2 text-center">
                <div className="font-mono text-[10px] font-bold text-inkLight">TOTAL</div>
                <div className="font-mono text-xl font-bold">{course.totalClasses}</div>
              </div>
              <div className="border-2 border-ink bg-surface p-2 text-center">
                <div className="font-mono text-[10px] font-bold text-inkLight">CANCELLED</div>
                <div className="font-mono text-xl font-bold">{course.cancelled}</div>
              </div>
            </div>
          </BrutalCard>
        </div>

        {/* Ledger Column */}
        <div className="md:col-span-2">
          {gradeSummary ? (
            <GradeLedger courseId={course.id} summary={gradeSummary} />
          ) : (
            <div className="h-64 bg-surface animate-pulse border-2 border-ink"></div>
          )}
        </div>
      </div>
    </div>
  );
}
