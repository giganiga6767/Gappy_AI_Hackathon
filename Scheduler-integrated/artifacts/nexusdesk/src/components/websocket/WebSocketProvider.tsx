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
  const [status] = useState<WSStatus>("connected");

  return (
    <WSContext.Provider value={{ status }}>
      {children}
    </WSContext.Provider>
  );
}
