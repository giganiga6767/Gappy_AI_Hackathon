import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { SiGoogle, SiGithub } from "react-icons/si";
import { Zap, UserCheck } from "lucide-react";

export default function LoginPage() {
  const { loginAsGuest, loginWithGoogle, loginWithGitHub, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"student" | "professional">(() => {
    return (localStorage.getItem("nexusdesk_persona_mode") as any) || "student";
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("auth=google") || hash.includes("auth=github")) {
      const params = new URLSearchParams(hash.slice(1));
      const userStr = params.get("user");
      if (userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          localStorage.setItem("nexusdesk_auth_user", JSON.stringify(user));
          
          const preRole = localStorage.getItem("nexusdesk_pre_login_role");
          if (preRole) {
            localStorage.setItem("nexusdesk_persona_mode", preRole);
            localStorage.removeItem("nexusdesk_pre_login_role");
          }
          
          window.location.hash = "";
          window.location.reload();
        } catch {}
      }
    }
  }, []);

  const handleGuestLogin = () => {
    localStorage.setItem("nexusdesk_persona_mode", selectedRole);
    loginAsGuest();
  };

  const handleGoogleLogin = () => {
    localStorage.setItem("nexusdesk_pre_login_role", selectedRole);
    loginWithGoogle();
  };

  const handleGitHubLogin = () => {
    localStorage.setItem("nexusdesk_pre_login_role", selectedRole);
    loginWithGitHub();
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-ink">
      <div className="w-full max-w-md space-y-6">
        <div className="border-b-4 border-ink pb-6 text-center">
          <h1 className="text-5xl font-heading font-extrabold tracking-tighter uppercase text-ink">
            NexusDesk
          </h1>
          <p className="font-mono text-sm text-inkLight mt-2 tracking-widest uppercase">
            Academic Command Center // NITK
          </p>
          <div className="mt-3 font-mono text-xs text-inkFaint border-2 border-ink inline-block px-3 py-1 bg-surface">
            v0.1.0 // BUILD_2026
          </div>
        </div>

        <BrutalCard className="p-6 space-y-4 bg-surface">
          <div className="space-y-1 border-b-2 border-ink pb-3 mb-2">
            <h2 className="font-heading text-xl font-bold uppercase">Sign In</h2>
            <p className="font-mono text-xs text-inkLight">Choose your workspace and login method</p>
          </div>

          <div className="space-y-2 pb-3 border-b-2 border-ink mb-1">
            <label className="font-mono text-[10px] font-bold text-inkLight block uppercase tracking-wider">
              1. Choose your Workspace:
            </label>
            <div className="flex border-4 border-ink shadow-brutal-sm">
              <button
                type="button"
                onClick={() => setSelectedRole("student")}
                className={`flex-1 font-mono text-xs font-bold py-3 transition-colors ${
                  selectedRole === "student"
                    ? "bg-sage text-paper border-r-4 border-ink"
                    : "bg-paper text-ink hover:bg-surfaceHover border-r-4 border-ink"
                }`}
              >
                NITK STUDENT
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("professional")}
                className={`flex-1 font-mono text-xs font-bold py-3 transition-colors ${
                  selectedRole === "professional"
                    ? "bg-amber text-paper"
                    : "bg-paper text-ink hover:bg-surfaceHover"
                }`}
              >
                PROFESSIONAL
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[10px] font-bold text-inkLight block uppercase tracking-wider">
              2. Authenticate:
            </label>
            <button
              onClick={handleGuestLogin}
              className="w-full flex items-center gap-3 border-4 border-ink bg-ink text-paper font-bold px-5 py-4 shadow-brutal hover:shadow-brutal-sm hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
            >
              <Zap className="h-5 w-5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-mono text-sm font-bold uppercase tracking-wide">Quick Dev Bypass — Guest Mode</div>
                <div className="font-mono text-[10px] font-normal opacity-70 mt-0.5">
                  Instant access to the selected workspace. No credentials needed.
                </div>
              </div>
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-[2px] bg-ink" />
              <span className="font-mono text-[10px] font-bold text-inkLight">OR SIGN IN WITH</span>
              <div className="flex-1 h-[2px] bg-ink" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 border-2 border-ink bg-paper text-ink font-bold px-4 py-3 shadow-brutal hover:shadow-brutal-sm hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-100"
              >
                <SiGoogle className="h-4 w-4 text-terracotta" />
                <span className="font-mono text-sm font-bold">Google</span>
              </button>
              <button
                onClick={handleGitHubLogin}
                className="flex items-center justify-center gap-2 border-2 border-ink bg-paper text-ink font-bold px-4 py-3 shadow-brutal hover:shadow-brutal-sm hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-100"
              >
                <SiGithub className="h-4 w-4" />
                <span className="font-mono text-sm font-bold">GitHub</span>
              </button>
            </div>
          </div>

          <p className="font-mono text-[10px] text-inkFaint text-center leading-relaxed pt-2">
            OAuth fallbacks automatically to a demo login bypass if server keys are missing.
          </p>
        </BrutalCard>

        <BrutalCard className="p-4 bg-amberLight border-amber">
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-amber flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-mono text-xs font-bold text-ink uppercase">Demo Instructions</div>
              <ul className="font-mono text-[10px] text-inkLight space-y-1 list-disc list-inside">
                <li>Choose your Workspace (NITK Student or Professional) *before* signing in</li>
                <li>Click "Quick Dev Bypass" for instant login (recommended for judges)</li>
                <li>Navigate to INGEST and click "Load Demo Session" to seed realistic database records</li>
                <li>To switch workspaces, log out and select the other workspace option here</li>
              </ul>
            </div>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}
