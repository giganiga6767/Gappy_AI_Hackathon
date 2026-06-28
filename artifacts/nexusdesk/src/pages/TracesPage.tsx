import { useState, useEffect } from "react";

interface Conversation {
  id: string;
  agent_name?: string;
  title?: string | null;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text?: string;
  created_at: string;
}

export default function TracesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    } else {
      setMessages([]);
    }
  }, [selectedConvId]);

  const fetchConversations = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/conversations");
      if (!res.ok) throw new Error("Failed to load traces list");
      const data = await res.json();
      // Sort newest first
      const sorted = (data.items || []).sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setConversations(sorted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/agent/conversations/${convId}/messages`);
      if (!res.ok) throw new Error("Failed to load trace messages");
      const data = await res.json();
      // Sort oldest first (chronological conversation flow)
      const sorted = (data.items || []).sort(
        (a: Message, b: Message) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="border-b-2 border-ink pb-2 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-tighter text-ink uppercase">
            Lemma Agent Traces
          </h1>
          <p className="font-mono text-xs text-inkLight mt-0.5">
            Real-time background agent execution logs and LLM reasoning.
          </p>
        </div>
        <button
          onClick={fetchConversations}
          className="py-1.5 px-4 bg-sage border-2 border-ink text-paper font-mono text-[10px] font-bold active:translate-x-[1px] active:translate-y-[1px]"
        >
          🔄 REFRESH
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left column: list of conversations */}
        <div className="w-1/3 border-2 border-ink bg-surface flex flex-col overflow-hidden">
          <div className="p-3 border-b-2 border-ink bg-ink text-paper font-mono text-xs font-bold">
            ACTIVE AGENT RUNS
          </div>

          <div className="flex-1 overflow-y-auto divide-y-2 divide-ink">
            {loadingList ? (
              <div className="p-4 text-center font-mono text-xs text-inkLight">
                Loading traces...
              </div>
            ) : error ? (
              <div className="p-4 text-center font-mono text-xs text-terracotta">
                {error}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-inkLight">
                No agent runs recorded yet.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-4 transition-all block ${
                      isSelected
                        ? "bg-ink text-paper"
                        : "hover:bg-surfaceHover text-ink"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs font-bold uppercase truncate max-w-[200px]">
                        🤖 {conv.agent_name || "Unknown Agent"}
                      </span>
                      <span className={`font-mono text-[9px] ${isSelected ? "text-paper/70" : "text-inkLight"}`}>
                        {new Date(conv.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`font-mono text-[9px] truncate ${isSelected ? "text-paper/50" : "text-inkLight"}`}>
                      ID: {conv.id}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: conversation message logs */}
        <div className="flex-1 border-2 border-ink bg-surface flex flex-col overflow-hidden">
          <div className="p-3 border-b-2 border-ink bg-ink text-paper font-mono text-xs font-bold">
            REASONING & MESSAGE LOGS
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
            {loadingMessages ? (
              <div className="p-4 text-center font-mono text-xs text-inkLight">
                Retrieving messages...
              </div>
            ) : !selectedConvId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="text-3xl mb-2">🔍</div>
                <div className="font-mono text-xs font-bold text-ink mb-1 uppercase">
                  No Trace Selected
                </div>
                <div className="font-mono text-[10px] text-inkLight max-w-xs">
                  Select an agent run from the left panel to inspect the system prompts, outputs, and reasoning steps.
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-inkLight">
                No messages found in this run.
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`border-2 border-ink p-4 space-y-2 ${
                      isAssistant ? "bg-cream" : "bg-paper"
                    }`}
                  >
                    <div className="flex justify-between items-center border-b border-ink/20 pb-1">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 border border-ink ${
                          isAssistant
                            ? "bg-sage text-paper"
                            : "bg-ink text-paper"
                        }`}
                      >
                        {isAssistant ? "🤖 ASSISTANT" : "👤 USER"}
                      </span>
                      <span className="font-mono text-[9px] text-inkLight">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-ink leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-h-[300px] p-2 bg-black/5 border border-ink/10">
                      {msg.text || "Empty message body"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
