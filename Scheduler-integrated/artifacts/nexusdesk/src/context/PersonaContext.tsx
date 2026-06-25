import { createContext, useContext, useState, type ReactNode } from "react";

export type PersonaMode = "student" | "professional";

interface PersonaContextValue {
  mode: PersonaMode;
  setMode: (mode: PersonaMode) => void;
  toggleMode: () => void;
  isStudent: boolean;
  isProfessional: boolean;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PersonaMode>(() => {
    return (localStorage.getItem("nexusdesk_persona_mode") as PersonaMode) || "student";
  });

  const setMode = (m: PersonaMode) => {
    localStorage.setItem("nexusdesk_persona_mode", m);
    setModeState(m);
  };

  const toggleMode = () => setMode(mode === "student" ? "professional" : "student");

  return (
    <PersonaContext.Provider value={{
      mode,
      setMode,
      toggleMode,
      isStudent: mode === "student",
      isProfessional: mode === "professional",
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
