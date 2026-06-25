import { useListCourses } from "@workspace/api-client-react";
import { CourseCard } from "@/components/courses/CourseCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { EmptyState } from "@/components/shared/EmptyState";

export default function CoursesPage() {
  const { data: courses, isLoading } = useListCourses();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">COURSES</h1>
          <p className="font-mono text-sm text-inkLight mt-1">ACADEMIC_TERM // ACTIVE_REGISTRATIONS</p>
        </div>
        <BrutalButton variant="primary">+ ADD COURSE</BrutalButton>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-surface animate-pulse border-2 border-ink"></div>
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState 
          label="NO COURSES REGISTERED" 
          actionLabel="SETUP SEMESTER"
          onAction={() => {}} 
        />
      )}
    </div>
  );
}
