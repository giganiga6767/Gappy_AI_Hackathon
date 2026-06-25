import { usePersona } from "@/context/PersonaContext";
import StudentDashboard from "@/components/student/StudentDashboard";
import ProfessionalDashboard from "@/components/professional/ProfessionalDashboard";

export default function DashboardPage() {
  const { isStudent } = usePersona();
  return isStudent ? <StudentDashboard /> : <ProfessionalDashboard />;
}
