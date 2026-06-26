import { Link } from "wouter";
import { CourseWithStats } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { AttendanceGauge } from "../shared/AttendanceGauge";
import { BrutalBadge } from "../shared/BrutalBadge";

interface CourseCardProps {
  course: CourseWithStats;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.id}`}>
      <BrutalCard className="hover:cursor-pointer flex flex-col h-full group hover:bg-surfaceHover">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="w-3 h-3 inline-block border-2 border-ink"
                style={{ backgroundColor: course.color || '#2D2D2D' }}
              />
              <span className="font-mono text-sm font-bold text-inkLight">
                {course.subjectCode}
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold leading-tight group-hover:underline">
              {course.name}
            </h3>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <BrutalBadge>{course.creditWeight} CR</BrutalBadge>
            {course.isAtRisk && <BrutalBadge variant="terracotta">AT RISK</BrutalBadge>}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t-2 border-ink border-dashed">
          <div className="flex justify-between font-mono text-[10px] font-bold text-inkLight mb-2">
            <span>ATTENDANCE</span>
            <span>TARGET: {course.minAttendancePct}%</span>
          </div>
          <AttendanceGauge 
            effectivePct={course.effectivePct}
            targetPct={course.minAttendancePct}
            attended={course.attended}
            missed={course.missed}
            isAtRisk={course.isAtRisk}
          />
        </div>
        
        {course.canSkip > 0 && !course.isAtRisk && (
          <div className="mt-3 font-mono text-[10px] font-bold text-sageDark bg-sageLight/50 p-1 text-center border-2 border-ink border-dashed">
            CAN SKIP {course.canSkip} MORE CLASSES
          </div>
        )}
        
        {course.mustAttend > 0 && course.isAtRisk && (
          <div className="mt-3 font-mono text-[10px] font-bold text-terracottaDark bg-terracottaLight/50 p-1 text-center border-2 border-ink border-dashed">
            MUST ATTEND NEXT {course.mustAttend} CLASSES
          </div>
        )}
      </BrutalCard>
    </Link>
  );
}
