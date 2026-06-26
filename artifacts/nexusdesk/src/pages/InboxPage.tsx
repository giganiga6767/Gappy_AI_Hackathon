import { useState, useEffect, useRef } from "react";

interface InboxItem {
  id: string;
  title: string;
  type: string;
  status: string;
  filePath?: string;
  rawText?: string;
  analysis?: string;
  createdAt: string;
}

interface ExtractedSemester {
  name: string;
  startDate: string;
  endDate: string;
}

interface ExtractedCourse {
  subjectCode: string;
  name: string;
  shortName: string;
  creditWeight: number;
  facultyName?: string;
  roomNumber?: string;
}

interface ExtractedSession {
  subjectCode?: string;
  title: string;
  type: string;
  date?: string;
  dayOfWeek?: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  location?: string;
}

interface ExtractedAction {
  title: string;
  description?: string;
  category: string;
  priority: string;
  dueDate?: string;
  subjectCode?: string;
}

interface ExtractedPayload {
  semester?: ExtractedSemester;
  courses: ExtractedCourse[];
  sessions: ExtractedSession[];
  artifacts: any[];
  actions: ExtractedAction[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_TYPES = ["LECTURE", "LAB", "TUTORIAL", "EXAM", "SEMINAR", "BREAK", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const CATEGORIES = ["ACADEMICS", "PERSONAL", "PROJECT", "ADMIN"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function StructuredPreview({
  payload,
  onChange,
  onApply,
  applying,
}: {
  payload: ExtractedPayload;
  onChange: (p: ExtractedPayload) => void;
  onApply: () => void;
  applying: boolean;
}) {
  const update = (patch: Partial<ExtractedPayload>) => onChange({ ...payload, ...patch });

  return (
    <div className="space-y-5">
      {/* Semester */}
      {payload.semester && (
        <section>
          <div className="font-mono text-[10px] font-bold text-inkLight uppercase tracking-wider border-b border-ink pb-1 mb-3">
            SEMESTER
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="font-mono text-[9px] font-bold block mb-1">NAME</label>
              <input
                type="text"
                value={payload.semester.name}
                onChange={(e) =>
                  update({ semester: { ...payload.semester!, name: e.target.value } })
                }
                className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold block mb-1">START DATE</label>
              <input
                type="date"
                value={payload.semester.startDate}
                onChange={(e) =>
                  update({ semester: { ...payload.semester!, startDate: e.target.value } })
                }
                className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold block mb-1">END DATE</label>
              <input
                type="date"
                value={payload.semester.endDate}
                onChange={(e) =>
                  update({ semester: { ...payload.semester!, endDate: e.target.value } })
                }
                className="w-full border-2 border-ink bg-paper p-1.5 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </section>
      )}

      {/* Courses */}
      {payload.courses.length > 0 && (
        <section>
          <div className="font-mono text-[10px] font-bold text-inkLight uppercase tracking-wider border-b border-ink pb-1 mb-3">
            COURSES ({payload.courses.length})
          </div>
          <div className="space-y-2">
            {payload.courses.map((c, i) => (
              <div key={i} className="border-2 border-ink bg-paper p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                <button
                  onClick={() => update({ courses: payload.courses.filter((_, j) => j !== i) })}
                  className="absolute top-1 right-1 font-mono text-[10px] font-bold text-terracotta hover:bg-terracottaLight px-1"
                >
                  ✕
                </button>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">CODE</label>
                  <input
                    type="text"
                    value={c.subjectCode}
                    onChange={(e) => {
                      const courses = [...payload.courses];
                      courses[i] = { ...c, subjectCode: e.target.value };
                      update({ courses });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-mono text-[9px] font-bold block mb-1">COURSE NAME</label>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => {
                      const courses = [...payload.courses];
                      courses[i] = { ...c, name: e.target.value };
                      update({ courses });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">CREDITS</label>
                  <input
                    type="number"
                    value={c.creditWeight}
                    onChange={(e) => {
                      const courses = [...payload.courses];
                      courses[i] = { ...c, creditWeight: Number(e.target.value) };
                      update({ courses });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                {c.facultyName !== undefined && (
                  <div>
                    <label className="font-mono text-[9px] font-bold block mb-1">FACULTY</label>
                    <input
                      type="text"
                      value={c.facultyName || ""}
                      onChange={(e) => {
                        const courses = [...payload.courses];
                        courses[i] = { ...c, facultyName: e.target.value };
                        update({ courses });
                      }}
                      className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}
                {c.roomNumber !== undefined && (
                  <div>
                    <label className="font-mono text-[9px] font-bold block mb-1">ROOM</label>
                    <input
                      type="text"
                      value={c.roomNumber || ""}
                      onChange={(e) => {
                        const courses = [...payload.courses];
                        courses[i] = { ...c, roomNumber: e.target.value };
                        update({ courses });
                      }}
                      className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions */}
      {payload.sessions.length > 0 && (
        <section>
          <div className="font-mono text-[10px] font-bold text-inkLight uppercase tracking-wider border-b border-ink pb-1 mb-3">
            SESSIONS ({payload.sessions.length})
          </div>
          <div className="space-y-2">
            {payload.sessions.map((s, i) => (
              <div key={i} className="border-2 border-ink bg-paper p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                <button
                  onClick={() => update({ sessions: payload.sessions.filter((_, j) => j !== i) })}
                  className="absolute top-1 right-1 font-mono text-[10px] font-bold text-terracotta hover:bg-terracottaLight px-1"
                >
                  ✕
                </button>
                <div className="sm:col-span-2">
                  <label className="font-mono text-[9px] font-bold block mb-1">TITLE</label>
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => {
                      const sessions = [...payload.sessions];
                      sessions[i] = { ...s, title: e.target.value };
                      update({ sessions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">TYPE</label>
                  <select
                    value={s.type}
                    onChange={(e) => {
                      const sessions = [...payload.sessions];
                      sessions[i] = { ...s, type: e.target.value };
                      update({ sessions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">CODE</label>
                  <input
                    type="text"
                    value={s.subjectCode || ""}
                    onChange={(e) => {
                      const sessions = [...payload.sessions];
                      sessions[i] = { ...s, subjectCode: e.target.value };
                      update({ sessions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                {s.dayOfWeek !== undefined ? (
                  <div>
                    <label className="font-mono text-[9px] font-bold block mb-1">DAY (RECURRING)</label>
                    <select
                      value={s.dayOfWeek}
                      onChange={(e) => {
                        const sessions = [...payload.sessions];
                        sessions[i] = { ...s, dayOfWeek: Number(e.target.value) };
                        update({ sessions });
                      }}
                      className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                    >
                      {DAY_NAMES.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-mono text-[9px] font-bold block mb-1">DATE</label>
                    <input
                      type="date"
                      value={s.date || ""}
                      onChange={(e) => {
                        const sessions = [...payload.sessions];
                        sessions[i] = { ...s, date: e.target.value };
                        update({ sessions });
                      }}
                      className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">START TIME</label>
                  <input
                    type="time"
                    value={`${pad(s.startHour)}:${pad(s.startMinute)}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      const sessions = [...payload.sessions];
                      sessions[i] = { ...s, startHour: h, startMinute: m };
                      update({ sessions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">END TIME</label>
                  <input
                    type="time"
                    value={`${pad(s.endHour)}:${pad(s.endMinute)}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      const sessions = [...payload.sessions];
                      sessions[i] = { ...s, endHour: h, endMinute: m };
                      update({ sessions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      {payload.actions.length > 0 && (
        <section>
          <div className="font-mono text-[10px] font-bold text-inkLight uppercase tracking-wider border-b border-ink pb-1 mb-3">
            ACTIONS / TASKS ({payload.actions.length})
          </div>
          <div className="space-y-2">
            {payload.actions.map((a, i) => (
              <div key={i} className="border-2 border-ink bg-paper p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                <button
                  onClick={() => update({ actions: payload.actions.filter((_, j) => j !== i) })}
                  className="absolute top-1 right-1 font-mono text-[10px] font-bold text-terracotta hover:bg-terracottaLight px-1"
                >
                  ✕
                </button>
                <div className="sm:col-span-2">
                  <label className="font-mono text-[9px] font-bold block mb-1">TITLE</label>
                  <input
                    type="text"
                    value={a.title}
                    onChange={(e) => {
                      const actions = [...payload.actions];
                      actions[i] = { ...a, title: e.target.value };
                      update({ actions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">PRIORITY</label>
                  <select
                    value={a.priority}
                    onChange={(e) => {
                      const actions = [...payload.actions];
                      actions[i] = { ...a, priority: e.target.value };
                      update({ actions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[9px] font-bold block mb-1">DUE DATE</label>
                  <input
                    type="date"
                    value={a.dueDate || ""}
                    onChange={(e) => {
                      const actions = [...payload.actions];
                      actions[i] = { ...a, dueDate: e.target.value };
                      update({ actions });
                    }}
                    className="w-full border border-ink bg-paper p-1 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!payload.semester && payload.courses.length === 0 && payload.sessions.length === 0 && payload.actions.length === 0 && (
        <p className="text-sm text-inkLight font-mono text-center py-4">
          Nothing was extracted. Try running Understand again, or edit the raw text and retry.
        </p>
      )}

      <button
        onClick={onApply}
        disabled={applying}
        className="w-full py-2.5 bg-sage border-2 border-ink text-paper font-mono text-xs font-bold shadow-brutal active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
      >
        {applying ? "APPLYING..." : "✅ APPLY TO DATABASE"}
      </button>
    </div>
  );
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captureType, setCaptureType] = useState<"text" | "file" | "record">("text");

  const [recordSource, setRecordSource] = useState<"mic" | "screen" | "tab" | "both">("mic");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const extraTracksRef = useRef<MediaStreamTrack[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<ExtractedPayload | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [provider, setProvider] = useState(() => localStorage.getItem("llm_provider") || "gemini");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error("Failed to load inbox:", e);
    } finally {
      setLoading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const buildRecordingStream = async (source: "mic" | "screen" | "tab" | "both"): Promise<MediaStream> => {
    if (source === "mic") {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (source === "screen" || source === "tab") {
      const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      extraTracksRef.current = ds.getVideoTracks();
      const at = ds.getAudioTracks();
      if (at.length === 0) {
        ds.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        throw new Error(
          source === "tab"
            ? 'No tab audio. In the share dialog, pick a browser tab and enable "Share tab audio".'
            : 'No system audio. In the share dialog, enable "Share system audio" or "Share audio".'
        );
      }
      return new MediaStream(at);
    }
    const [mic, ds] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }),
    ]);
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(mic).connect(dest);
    const dsAudio = ds.getAudioTracks();
    if (dsAudio.length > 0) ctx.createMediaStreamSource(new MediaStream(dsAudio)).connect(dest);
    extraTracksRef.current = [...mic.getTracks(), ...ds.getTracks()];
    return dest.stream;
  };

  const startRecording = async () => {
    setRecordError(null);
    setRecordedBlob(null);
    audioChunksRef.current = [];
    extraTracksRef.current = [];
    try {
      const stream = await buildRecordingStream(recordSource);
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mr.onstop = () => {
        setRecordedBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        extraTracksRef.current.forEach((t) => t.stop());
        audioCtxRef.current?.close();
        extraTracksRef.current = [];
        audioCtxRef.current = null;
      };
      mr.start();
      setIsRecording(true);
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError" ? "Permission denied." : (err?.message || "Could not start recording.");
      setRecordError(msg);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      title: title || `Capture ${new Date().toLocaleString()}`,
      type: captureType === "record" ? "audio" : captureType,
    };

    if (captureType === "text") {
      if (!textInput.trim()) return;
      body.rawText = textInput;
    } else if (captureType === "file" && selectedFile) {
      body.fileBase64 = await blobToBase64(selectedFile);
      body.fileName = selectedFile.name;
      body.type = selectedFile.type.startsWith("image/") ? "image" : selectedFile.type === "application/pdf" ? "pdf" : "audio";
    } else if (captureType === "record" && recordedBlob) {
      body.fileBase64 = await blobToBase64(recordedBlob);
      body.fileName = "voice_capture.webm";
    } else {
      return;
    }

    const res = await fetch("/api/inbox/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setTitle("");
      setTextInput("");
      setSelectedFile(null);
      setRecordedBlob(null);
      fetchItems();
    } else {
      alert("Failed to capture item.");
    }
  };

  const handleUnderstand = async (item: InboxItem) => {
    setProcessingId(item.id);
    setPreviewId(null);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const res = await fetch(`/api/inbox/${item.id}/understand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        const parsed: ExtractedPayload = {
          semester: data.analysis?.semester,
          courses: data.analysis?.courses || [],
          sessions: data.analysis?.sessions || [],
          artifacts: data.analysis?.artifacts || [],
          actions: data.analysis?.actions || [],
        };
        setPreviewPayload(parsed);
        setPreviewId(item.id);
        fetchItems();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error processing item.");
    } finally {
      setProcessingId(null);
    }
  };

  const openPreview = (item: InboxItem) => {
    try {
      const parsed = JSON.parse(item.analysis || "{}");
      setPreviewPayload({
        semester: parsed.semester,
        courses: parsed.courses || [],
        sessions: parsed.sessions || [],
        artifacts: parsed.artifacts || [],
        actions: parsed.actions || [],
      });
      setPreviewId(item.id);
      setApplyError(null);
      setApplySuccess(null);
    } catch {
      alert("Cannot parse stored analysis. Try Understand again.");
    }
  };

  const handleApply = async () => {
    if (!previewId || !previewPayload) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const res = await fetch(`/api/inbox/${previewId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewPayload),
      });
      if (res.ok) {
        setApplySuccess("✅ Applied successfully! Data committed to database.");
        setPreviewId(null);
        setPreviewPayload(null);
        fetchItems();
      } else {
        const err = await res.json();
        setApplyError(`Failed: ${err.error || "Unknown error"}`);
      }
    } catch {
      setApplyError("Network error during apply.");
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item from the inbox?")) return;
    const res = await fetch(`/api/inbox/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (previewId === id) { setPreviewId(null); setPreviewPayload(null); }
      fetchItems();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-ink pb-2">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-tighter text-ink uppercase">Inbox</h1>
          <p className="font-mono text-xs text-inkLight mt-0.5">Capture → Understand → Preview → Apply</p>
        </div>
        <span className="font-mono text-xs text-inkLight">NEXUSDESK // INGEST_PIPELINE</span>
      </div>

      {/* LLM Settings */}
      <div className="bg-surface border-2 border-ink p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <label className="font-bold block mb-1">AI PROVIDER</label>
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value); localStorage.setItem("llm_provider", e.target.value); }}
            className="border-2 border-ink p-1 w-full bg-paper focus:outline-none text-xs"
          >
            <option value="gemini">Gemini (Cloud — needs API key)</option>
            <option value="ollama">Ollama (Local — no API key)</option>
          </select>
        </div>
        <div>
          <label className="font-bold block mb-1">GEMINI API KEY</label>
          <input
            type="password"
            placeholder="Paste key for cloud extraction..."
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("gemini_api_key", e.target.value); }}
            className="border-2 border-ink p-1 w-full bg-paper focus:outline-none text-xs"
          />
        </div>
      </div>

      {/* Grid: Capture + Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Capture Panel */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">CAPTURE INPUT</span>

          <div className="flex border-b-2 border-ink">
            {(["text", "file", "record"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCaptureType(t)}
                className={`flex-1 py-1.5 font-mono text-xs font-bold border-r-2 last:border-r-0 border-ink ${
                  captureType === t ? "bg-ink text-paper" : "hover:bg-surfaceHover"
                }`}
              >
                {t === "text" ? "TEXT" : t === "file" ? "FILE" : "RECORD"}
              </button>
            ))}
          </div>

          <form onSubmit={handleCapture} className="space-y-3">
            <div>
              <label className="font-mono text-[10px] font-bold block mb-1">TITLE</label>
              <input
                type="text"
                placeholder="e.g. CS301 Syllabus, Lecture 4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-2 border-ink p-2 w-full bg-paper text-sm focus:outline-none"
              />
            </div>

            {captureType === "text" && (
              <div>
                <label className="font-mono text-[10px] font-bold block mb-1">PASTE TEXT</label>
                <textarea
                  rows={6}
                  placeholder="Paste timetable, syllabus, class notes, or reschedule message..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="border-2 border-ink p-2 w-full bg-paper text-sm focus:outline-none"
                />
              </div>
            )}

            {captureType === "file" && (
              <div>
                <label className="font-mono text-[10px] font-bold block mb-1">SELECT FILE</label>
                <input
                  type="file"
                  accept="image/*,application/pdf,audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="border-2 border-ink p-2 w-full bg-paper text-xs focus:outline-none file:mr-3 file:py-1 file:px-2 file:border-2 file:border-ink file:bg-surface file:text-xs file:font-mono file:font-bold"
                />
              </div>
            )}

            {captureType === "record" && (
              <div className="border-2 border-ink bg-paper p-3 space-y-3">
                {/* Source picker */}
                <div>
                  <div className="font-mono text-[9px] font-bold text-inkLight mb-1.5 uppercase tracking-wider">Audio Source</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "mic",    label: "🎤 Microphone",   hint: "In-person lecture" },
                        { id: "screen", label: "🖥️ Zoom / Meet",  hint: "Meeting window" },
                        { id: "tab",    label: "🌐 Browser Tab",  hint: "YouTube / online video" },
                        { id: "both",   label: "🎤+🖥️ Both",     hint: "Hybrid — mic + meeting" },
                      ] as const
                    ).map((src) => (
                      <button
                        key={src.id}
                        type="button"
                        disabled={isRecording}
                        onClick={() => { setRecordSource(src.id); setRecordError(null); }}
                        className={[
                          "border-2 py-1.5 px-2 font-mono text-[10px] font-bold text-left",
                          recordSource === src.id
                            ? "border-ink bg-ink text-paper"
                            : "border-ink bg-surface text-ink hover:bg-surfaceHover",
                          isRecording ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                        title={src.hint}
                      >
                        {src.label}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-inkLight mt-1">
                    {{
                      mic:    "Records your microphone (physical classroom)",
                      screen: "Browser asks what to share — pick Zoom/Meet window, enable system audio",
                      tab:    "Browser asks what to share — pick a tab, enable 'Share tab audio'",
                      both:   "Mic + meeting audio mixed (two share prompts will appear)",
                    }[recordSource]}
                  </p>
                </div>

                {/* Error */}
                {recordError && (
                  <div className="border-2 border-terracotta bg-terracottaLight/10 p-2 font-mono text-[10px] font-bold text-terracotta">
                    ⚠ {recordError}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-3 pt-1">
                  {isRecording ? (
                    <button type="button" onClick={stopRecording}
                      className="border-2 border-ink bg-terracotta text-paper font-mono text-xs font-bold px-4 py-2">
                      ■ STOP
                    </button>
                  ) : (
                    <button type="button" onClick={startRecording}
                      className="border-2 border-ink bg-sage text-paper font-mono text-xs font-bold px-4 py-2">
                      ● REC
                    </button>
                  )}
                  <span className="font-mono text-xs font-bold text-ink">
                    {isRecording ? "🔴 RECORDING..." : recordedBlob ? "🎙️ CAPTURED" : "READY"}
                  </span>
                </div>
              </div>
            )}

            <button type="submit"
              className="w-full py-2 bg-ink text-paper font-mono text-xs font-bold border-2 border-ink active:translate-x-[1px] active:translate-y-[1px]">
              📥 CAPTURE INTO INBOX
            </button>
          </form>
        </div>

        {/* Queue Panel */}
        <div className="bg-surface border-2 border-ink p-4 space-y-3">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">QUEUED CAPTURES</span>
          {loading ? (
            <p className="text-xs font-mono text-inkLight">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-inkLight font-mono">No captures pending. Desk clear.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="border-2 border-ink p-3 bg-paper space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm truncate text-ink">{item.title}</h4>
                      <span className="font-mono text-[10px] text-inkLight">
                        {item.type.toUpperCase()} // {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 border border-ink ml-2 flex-shrink-0 uppercase ${
                      item.status === "applied" ? "bg-sageLight text-sageDark" :
                      item.status === "understood" ? "bg-amberLight text-amber" :
                      "bg-surface text-inkLight"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-dashed border-inkFaint">
                    {item.status === "captured" ? (
                      <button
                        onClick={() => handleUnderstand(item)}
                        disabled={processingId !== null}
                        className="flex-1 py-1 bg-sage border border-ink text-paper font-mono text-[10px] font-bold disabled:opacity-50"
                      >
                        {processingId === item.id ? "THINKING..." : "🧠 UNDERSTAND"}
                      </button>
                    ) : (
                      <button
                        onClick={() => openPreview(item)}
                        className="flex-1 py-1 bg-amberLight border border-ink text-ink font-mono text-[10px] font-bold"
                      >
                        🔎 PREVIEW & APPLY
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="py-1 px-2 bg-terracotta border border-ink text-paper font-mono text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Structured Preview */}
      {previewId && previewPayload && (
        <div className="bg-surface border-2 border-ink p-5 space-y-4">
          <div className="flex justify-between items-center border-b-2 border-ink pb-2">
            <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
              PREVIEW & EDIT EXTRACTED DATA
            </span>
            <button
              onClick={() => { setPreviewId(null); setPreviewPayload(null); }}
              className="font-mono text-xs font-bold text-terracotta hover:underline"
            >
              Close
            </button>
          </div>

          <p className="font-mono text-[10px] text-inkLight">
            Review the AI-extracted entities below. Edit or delete items before committing to the database.
          </p>

          {applyError && (
            <div className="bg-terracottaLight border-2 border-terracotta p-3 font-mono text-xs text-terracottaDark">
              {applyError}
            </div>
          )}
          {applySuccess && (
            <div className="bg-sageLight border-2 border-sage p-3 font-mono text-xs text-sageDark">
              {applySuccess}
            </div>
          )}

          <StructuredPreview
            payload={previewPayload}
            onChange={setPreviewPayload}
            onApply={handleApply}
            applying={applying}
          />
        </div>
      )}
    </div>
  );
}
