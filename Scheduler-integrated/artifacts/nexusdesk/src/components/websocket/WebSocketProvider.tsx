import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

type WSStatus = "connecting" | "connected" | "disconnected";

interface WSContextValue {
  status: WSStatus;
}

const WSContext = createContext<WSContextValue>({ status: "disconnected" });

export function useWebSocket() {
  return useContext(WSContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const wasConnectedRef = useRef(false);
  const toastShownRef = useRef(false);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/sync`;

    setStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        setStatus("connected");
        if (wasConnectedRef.current && toastShownRef.current) {
          toast({ title: "Live Sync Connected", description: "Real-time task updates active." });
          toastShownRef.current = false;
        }
        wasConnectedRef.current = true;
      };

      ws.onclose = () => {
        setStatus("disconnected");
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setStatus("disconnected");
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
    retryCountRef.current += 1;

    if (retryCountRef.current === 2 && wasConnectedRef.current) {
      toastShownRef.current = true;
      toast({
        title: "Reconnecting to live sync...",
        description: `Retrying in ${Math.round(delay / 1000)}s`,
      });
    }

    retryTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  useEffect(() => {
    connect();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return (
    <WSContext.Provider value={{ status }}>
      {children}
    </WSContext.Provider>
  );
}
