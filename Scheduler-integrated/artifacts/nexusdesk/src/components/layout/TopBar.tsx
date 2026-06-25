import { useState } from "react";
import { format } from "date-fns";
import { Settings, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePersona } from "@/context/PersonaContext";
import { useWebSocket } from "@/components/websocket/WebSocketProvider";
import { SettingsModal, getConnectivityStatus } from "@/components/settings/SettingsModal";

export function TopBar() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = usePersona();
  const { status: wsStatus } = useWebSocket();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const connectivity = getConnectivityStatus();

  const isPro = mode === "professional";

  return (
    <>
      <header className="h-14 border-b-4 border-ink flex items-center justify-between px-4 shrink-0 bg-paper">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`font-mono text-[10px] font-bold uppercase px-2 py-1 border-2 border-ink shadow-brutal-sm whitespace-nowrap ${
              isPro
                ? "bg-amber text-paper"
                : "bg-ink text-paper"
            }`}
          >
            {isPro ? "PROFESSIONAL WORKSPACE" : "STUDENT WORKSPACE"}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="font-mono text-[10px] font-bold border-2 border-ink px-2 py-1 bg-surface text-ink">
            {format(new Date(), "MM-dd HH:mm")}
          </div>

          <div
            className={`flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-1 border-2 border-ink ${
              connectivity === "custom"
                ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
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
            className="border-2 border-ink bg-surface p-1.5 shadow-brutal-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-ink"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {user && (
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 border-2 border-ink flex items-center justify-center font-mono text-[10px] font-bold bg-ink text-paper">
                {user.avatarInitials}
              </div>
              <button
                onClick={logout}
                className="border-2 border-ink bg-surface p-1.5 shadow-brutal-sm hover:bg-terracottaLight hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-ink"
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
