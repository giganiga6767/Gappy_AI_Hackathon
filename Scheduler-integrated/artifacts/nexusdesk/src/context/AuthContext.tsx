import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "guest" | "google" | "github";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginAsGuest: () => void;
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  logout: () => void;
}

const GUEST_USER: AuthUser = {
  id: "guest-001",
  name: "Guest User",
  email: "guest@nexusdesk.local",
  avatarInitials: "GU",
  role: "guest",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("nexusdesk_auth_user");
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  const persist = (u: AuthUser | null) => {
    if (u) localStorage.setItem("nexusdesk_auth_user", JSON.stringify(u));
    else localStorage.removeItem("nexusdesk_auth_user");
    setUser(u);
  };

  const loginAsGuest = useCallback(() => {
    persist(GUEST_USER);
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const loginWithGitHub = useCallback(() => {
    window.location.href = "/api/auth/github";
  }, []);

  const logout = useCallback(() => {
    persist(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loginAsGuest, loginWithGoogle, loginWithGitHub, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
