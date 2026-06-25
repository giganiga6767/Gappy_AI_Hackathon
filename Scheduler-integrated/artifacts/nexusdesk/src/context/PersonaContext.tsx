import { createContext, useContext, useState, type ReactNode } from "react";

export type PersonaMode = "student" | "professional";
export type StudentView = "student" | "parent";

interface PersonaContextValue {
  mode: PersonaMode;
  studentView: StudentView;
  setMode: (mode: PersonaMode) => void;
  setStudentView: (view: StudentView) => void;
  toggleMode: () => void;
  isStudent: boolean;
  isProfessional: boolean;
  isParentView: boolean;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PersonaMode>(() => {
    return (localStorage.getItem("nexusdesk_persona_mode") as PersonaMode) || "student";
  });

  const [studentView, setStudentViewState] = useState<StudentView>(() => {
    return (localStorage.getItem("nexusdesk_student_view") as StudentView) || "student";
  });

  const setMode = (m: PersonaMode) => {
    localStorage.setItem("nexusdesk_persona_mode", m);
    setModeState(m);
  };

  const setStudentView = (v: StudentView) => {
    localStorage.setItem("nexusdesk_student_view", v);
    setStudentViewState(v);
  };

  const toggleMode = () => setMode(mode === "student" ? "professional" : "student");

  return (
    <PersonaContext.Provider value={{
      mode,
      studentView,
      setMode,
      setStudentView,
      toggleMode,
      isStudent: mode === "student",
      isProfessional: mode === "professional",
      isParentView: mode === "student" && studentView === "parent",
    }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within PersonaProvider");
  return ctx;
}
