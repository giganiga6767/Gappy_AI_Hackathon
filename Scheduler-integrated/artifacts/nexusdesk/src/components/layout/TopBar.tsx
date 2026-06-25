import { useState } from "react";
import { format } from "date-fns";
import { Settings, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePersona } from "@/context/PersonaContext";
import { useWebSocket } from "@/components/websocket/WebSocketProvider";
import { SettingsModal, getConnectivityStatus } from "@/components/settings/SettingsModal";

export function TopBar() {
  const { user, logout } = useAuth();
  const { mode, toggleMode, isStudent, studentView, setStudentView } = usePersona();
  const { status: wsStatus } = useWebSocket();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const connectivity = getConnectivityStatus();

  const isPro = mode === "professional";

  return (
    <>
      <header
        className={`h-14 border-b-2 flex items-center justify-between px-4 shrink-0 transition-colors duration-300 ${
          isPro ? "bg-[#0f1a2e] border-[#2a4a72]" : "bg-paper border-ink"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`font-mono text-[10px] font-bold uppercase px-2 py-1 border-2 shadow-brutal-sm whitespace-nowrap ${
              isPro
                ? "bg-[#1e3a5f] text-[#64a8d8] border-[#2a4a72]"
                : "bg-ink text-paper border-ink"
            }`}
          >
            {isPro ? "PROFESSIONAL MODE" : "STUDENT MODE"}
          </div>

          <div className={`flex items-center border-2 overflow-hidden shadow-brutal-sm ${isPro ? "border-[#2a4a72]" : "border-ink"}`}>
            <button
              onClick={() => !isStudent && toggleMode()}
              className={`font-mono text-[10px] font-bold px-3 py-1.5 transition-colors ${
                isStudent
                  ? "bg-sage text-paper"
                  : `${isPro ? "text-[#64a8d8] hover:bg-[#1e3a5f]" : "text-ink hover:bg-surfaceHover"} bg-transparent`
              }`}
            >
              STUDENT/PARENT
            </button>
            <div className={`w-[2px] h-5 ${isPro ? "bg-[#2a4a72]" : "bg-ink"}`} />
            <button
              onClick={() => isStudent && toggleMode()}
              className={`font-mono text-[10px] font-bold px-3 py-1.5 transition-colors ${
                isPro
                  ? "bg-[#1e3a5f] text-[#64a8d8]"
                  : "text-ink hover:bg-surfaceHover bg-transparent"
              }`}
            >
              PROFESSIONAL
            </button>
          </div>

          {isStudent && (
            <div className="flex items-center border-2 border-ink overflow-hidden shadow-brutal-sm">
              <button
                onClick={() => setStudentView("student")}
                className={`font-mono text-[10px] font-bold px-2 py-1.5 transition-colors ${
                  studentView === "student" ? "bg-sage text-paper" : "bg-surface text-ink hover:bg-surfaceHover"
                }`}
              >
                STUDENT
              </button>
              <div className="w-[2px] h-5 bg-ink" />
              <button
                onClick={() => setStudentView("parent")}
                className={`font-mono text-[10px] font-bold px-2 py-1.5 transition-colors ${
                  studentView === "parent" ? "bg-amber text-paper" : "bg-surface text-ink hover:bg-surfaceHover"
                }`}
              >
                PARENT
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`font-mono text-[10px] font-bold border-2 px-2 py-1 ${
              isPro
                ? "bg-[#0f1a2e] border-[#2a4a72] text-[#64a8d8]"
                : "bg-surface border-ink text-ink"
            }`}
          >
            {format(new Date(), "MM-dd HH:mm")}
          </div>

          <div
            className={`flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-1 border-2 ${
              connectivity === "custom"
                ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                : isPro
                  ? "border-[#2a4a72] text-[#64a8d8]"
                  : "border-sage text-sage bg-sageLight/20"
            }`}
            title={
              connectivity === "custom"
                ? "Custom Key Active (Local Settings)"
                : "Connected (Server Key Active)"
            }
          >
            <span
              className={`w-2 h-2 inline-block border border-current ${
                connectivity === "custom"
                  ? "bg-[#a855f7]"
                  : wsStatus === "connected"
                    ? "bg-sage"
                    : wsStatus === "connecting"
                      ? "bg-amber"
                      : "bg-terracotta"
              }`}
            />
            {wsStatus === "connecting" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : wsStatus === "connected" ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connectivity === "custom" ? "CUSTOM" : "SERVER"}
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className={`border-2 p-1.5 shadow-brutal-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
              isPro
                ? "bg-[#1e3a5f] border-[#2a4a72] text-[#64a8d8] hover:bg-[#2a4a72]"
                : "bg-surface border-ink"
            }`}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {user && (
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 border-2 flex items-center justify-center font-mono text-[10px] font-bold ${
                  isPro
                    ? "bg-[#1e3a5f] text-[#64a8d8] border-[#2a4a72]"
                    : "bg-ink text-paper border-ink"
                }`}
              >
                {user.avatarInitials}
              </div>
              <button
                onClick={logout}
                className={`border-2 p-1.5 shadow-brutal-sm hover:bg-terracottaLight hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                  isPro ? "bg-[#1e3a5f] border-[#2a4a72] text-[#64a8d8]" : "bg-surface border-ink"
                }`}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
