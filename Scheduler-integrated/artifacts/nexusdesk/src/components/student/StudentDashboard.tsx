import { useState, useRef, useEffect } from "react";
import { format, addDays, subDays, startOfMonth, eachDayOfInterval, endOfMonth } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useListEvents,
  useMarkAttendance,
  useListTasks,
  getListEventsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { StatPill } from "@/components/shared/StatPill";
import { FluidTimeline } from "@/components/dashboard/FluidTimeline";
import { DayNavigator } from "@/components/dashboard/DayNavigator";
import { usePersona } from "@/context/PersonaContext";
import { Mic, MicOff, CheckSquare, Square, Play, Download, Trash2, Sparkles, FileText, Edit2, Loader2 } from "lucide-react";
import { getLLMSettings } from "@/components/settings/SettingsModal";

function AttendanceHeatmap({ attendancePct, threshold }: { attendancePct: number; threshold: number }) {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });

  const getColor = (day: Date) => {
    const isPast = day <= today;
    if (!isPast) return "bg-surface border-inkFaint";
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (isWeekend) return "bg-inkFaint/20 border-inkFaint";
    const rand = ((day.getDate() * 7 + day.getMonth() * 13) % 100);
    const simulated = attendancePct + (rand - 50) * 0.3;
    if (simulated >= threshold + 5) return "bg-sage border-sageDark";
    if (simulated >= threshold - 5) return "bg-amber border-amber";
    return "bg-terracotta border-terracottaDark";
  };

  const getLegendLabel = (color: string) => {
    if (color.includes("sage")) return "SAFE";
    if (color.includes("amber")) return "NEAR THRESHOLD";
    if (color.includes("terracotta")) return "DANGER";
    return "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {days.map(day => {
          const color = getColor(day);
          return (
            <div
              key={day.toISOString()}
              className={`w-6 h-6 border-2 ${color} flex items-center justify-center`}
              title={`${format(day, "MMM d")} — ${getLegendLabel(color) || "future"}`}
            >
              <span className="font-mono text-[8px] font-bold text-ink/60">{day.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-sage border border-sageDark" />SAFE
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-amber border border-amber" />NEAR
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <div className="w-3 h-3 bg-terracotta border border-terracottaDark" />DANGER
        </div>
      </div>
    </div>
  );
}

interface RecordingItem {
  id: string;
  label: string;
  timestamp: string;
  url: string;
  duration: string;
  transcript?: string;
  notes?: string;
  showTranscript?: boolean;
  processing?: boolean;
}

function RecordingWidget() {
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRefVal, setTimerRefVal] = useState<ReturnType<typeof setInterval> | null>(null);

  const [recordings, setRecordings] = useState<RecordingItem[]>(() => {
    try {
      const saved = localStorage.getItem("nexusdesk_recordings_student");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [generatingNotesId, setGeneratingNotesId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeTracksRef = useRef<MediaStreamTrack[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [recordMode, setRecordMode] = useState<"mic" | "zoom">("mic");

  useEffect(() => {
    try {
      localStorage.setItem("nexusdesk_recordings_student", JSON.stringify(recordings));
    } catch (e) {
      console.error("Failed to save recordings", e);
    }
  }, [recordings]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      let finalStream: MediaStream;

      if (recordMode === "zoom") {
        // 1. Get system/screen audio (must capture video too for getDisplayMedia to work)
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 },
          audio: true
        });

        // 2. Get mic audio
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micErr) {
          console.warn("Could not capture microphone, recording system audio only.", micErr);
        }

        // 3. Merge them using Web Audio API
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        const tracks: MediaStreamTrack[] = [...screenStream.getTracks()];

        if (screenStream.getAudioTracks().length > 0) {
          const systemSource = audioCtx.createMediaStreamSource(screenStream);
          systemSource.connect(dest);
        } else {
          alert("Warning: Share system audio was not checked. Only screen video is captured (audio might be silent).");
        }

        if (micStream) {
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(dest);
          tracks.push(...micStream.getTracks());
        }

        activeTracksRef.current = tracks;
        finalStream = dest.stream;
      } else {
        // Microphone only
        finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeTracksRef.current = finalStream.getTracks();
      }

      const mediaRecorder = new MediaRecorder(finalStream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Clean up tracks
        activeTracksRef.current.forEach(track => track.stop());
        activeTracksRef.current = [];
        
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        
        const minsStr = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secsStr = (elapsed % 60).toString().padStart(2, "0");
        const durationStr = `${minsStr}:${secsStr}`;

        const tempId = `rec-${Date.now()}`;
        const newRecording: RecordingItem = {
          id: tempId,
          label: `${recordMode === "zoom" ? "Zoom Session" : "Lecture Recording"} #${recordings.length + 1}`,
          timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          url,
          duration: durationStr,
          transcript: "Transcribing and formatting notes via Gemini...",
          showTranscript: true,
          processing: true,
        };

        setRecordings(prev => [newRecording, ...prev]);

        // Convert file to Base64 to upload to backend
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const settings = getLLMSettings();
            const res = await fetch("/api/record/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Audio,
                label: newRecording.label,
                isOnline: recordMode === "zoom",
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
              }),
            });
            const data = await res.json();
            if (data.success && data.notes) {
              setRecordings(prev => prev.map(r => r.id === tempId ? {
                ...r,
                transcript: data.notes,
                notes: data.notes,
                processing: false
              } : r));
            } else {
              throw new Error(data.error || "Failed processing audio.");
            }
          } catch (err: any) {
            console.error(err);
            setRecordings(prev => prev.map(r => r.id === tempId ? {
              ...r,
              transcript: `Transcription/Notes failed: ${err.message || err}`,
              processing: false
            } : r));
          }
        };
      };

      const res = await fetch("/api/record/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: recordMode === "zoom" ? "Zoom Session" : "Lecture Recording" }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setRecording(true);
        setElapsed(0);
        mediaRecorder.start();
        const t = setInterval(() => setElapsed(e => e + 1), 1000);
        setTimerRefVal(t);
      }
    } catch (err) {
      alert("Failed to initiate audio capture. Ensure microphone and system sharing permissions are granted.");
      console.error(err);
    }
  };

  const stopRecording = async () => {
    if (timerRefVal) clearInterval(timerRefVal);
    setTimerRefVal(null);
    setRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (sessionId) {
      try {
        await fetch("/api/record/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
    }
    setSessionId(null);
    setElapsed(0);
  };

  const renameRecording = (id: string) => {
    const newLabel = prompt("Enter new name for the recording:");
    if (newLabel && newLabel.trim()) {
      setRecordings(prev => prev.map(r => r.id === id ? { ...r, label: newLabel.trim() } : r));
    }
  };

  const generateNotes = async (rec: RecordingItem) => {
    if (!rec.transcript) return;
    setGeneratingNotesId(rec.id);
    try {
      const settings = getLLMSettings();
      const res = await fetch("/api/record/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: rec.transcript,
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
        }),
      });
      const data = await res.json();
      if (data.success && data.notes) {
        // Download Notes as File
        const blob = new Blob([data.notes], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${rec.label.toLowerCase().replace(/\s+/g, "-")}-notes.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, notes: data.notes } : r));
      } else {
        alert(data.error || "Failed to generate notes.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGeneratingNotesId(null);
    }
  };

  const togglePlayPlayback = (rec: RecordingItem) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    
    if (currentlyPlaying === rec.id) {
      audioPlayerRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      audioPlayerRef.current.src = rec.url;
      audioPlayerRef.current.play();
      setCurrentlyPlaying(rec.id);
      audioPlayerRef.current.onended = () => {
        setCurrentlyPlaying(null);
      };
    }
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (currentlyPlaying === id) {
      audioPlayerRef.current?.pause();
      setCurrentlyPlaying(null);
    }
  };

  const toggleTranscript = (id: string) => {
    setRecordings(prev => prev.map(r => r.id === id ? { ...r, showTranscript: !r.showTranscript } : r));
  };

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="space-y-4">
      <BrutalCard className={`p-4 ${recording ? "border-terracotta bg-terracottaLight/20 shadow-brutal-accent" : ""}`}>
        <h3 className="section-label mb-3">LECTURE RECORDER</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {recording ? (
            <>
              <div className="w-3 h-3 bg-terracotta border-2 border-terracottaDark animate-pulse" />
              <span className="font-mono text-sm font-bold">
                REC ({recordMode === "zoom" ? "ZOOM + MIC" : "MIC ONLY"}) {mins}:{secs}
              </span>
              <BrutalButton onClick={stopRecording} className="sm:ml-auto">
                <MicOff className="h-4 w-4 mr-1" /> STOP
              </BrutalButton>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-inkLight" />
                <select
                  value={recordMode}
                  onChange={(e) => setRecordMode(e.target.value as any)}
                  className="font-mono text-[10px] font-bold border-2 border-ink bg-surface px-2 py-1 outline-none cursor-pointer focus:bg-surfaceHover"
                >
                  <option value="mic">🎙️ MICROPHONE ONLY</option>
                  <option value="zoom">🖥️ ZOOM / SYSTEM AUDIO + MIC</option>
                </select>
              </div>
              <span className="font-mono text-xs text-inkLight hidden md:inline">Select source and hit record</span>
              <BrutalButton variant="primary" onClick={startRecording} className="sm:ml-auto">
                <Mic className="h-4 w-4 mr-1" /> RECORD
              </BrutalButton>
            </>
          )}
        </div>
      </BrutalCard>

      {recordings.length > 0 && (
        <div className="space-y-3">
          <div className="font-mono text-xs font-bold text-inkLight uppercase tracking-wider pl-1">
            Recorded Sessions ({recordings.length})
          </div>
          {recordings.map(rec => (
            <BrutalCard key={rec.id} className="p-3 bg-surface border-ink space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-ink flex items-center gap-2">
                    {rec.label}
                    {rec.processing && (
                      <span className="font-mono text-[8px] px-1 py-0.5 border border-amber bg-amber/10 text-amber animate-pulse font-bold">
                        AI PROCESSING
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[9px] text-inkLight">
                    {rec.timestamp} // Duration: {rec.duration}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePlayPlayback(rec)}
                    disabled={rec.processing}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                    title={currentlyPlaying === rec.id ? "Pause" : "Play"}
                  >
                    {currentlyPlaying === rec.id ? (
                      <div className="w-3 h-3 bg-ink" />
                    ) : (
                      <Play className="h-3 w-3 text-ink fill-ink" />
                    )}
                  </button>
                  <a
                    href={rec.processing ? "#" : rec.url}
                    onClick={(e) => rec.processing && e.preventDefault()}
                    download={`nexusdesk-lecture-${rec.id}.webm`}
                    className={`p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center ${rec.processing ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Download File"
                  >
                    <Download className="h-3 w-3 text-ink" />
                  </a>
                  <button
                    onClick={() => renameRecording(rec.id)}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center text-ink"
                    title="Rename"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => generateNotes(rec)}
                    disabled={generatingNotesId === rec.id || rec.processing}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center text-ink disabled:opacity-50"
                    title="Generate Doc Notes"
                  >
                    {generatingNotesId === rec.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3 text-sage" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleTranscript(rec.id)}
                    disabled={rec.processing}
                    className={`p-1.5 border-2 border-ink text-ink font-bold hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1 disabled:opacity-50 ${rec.showTranscript ? "bg-sageLight" : "bg-paper"}`}
                    title="Transcribe Notes"
                  >
                    <Sparkles className="h-3 w-3 text-amber font-extrabold" />
                  </button>
                  <button
                    onClick={() => deleteRecording(rec.id)}
                    className="p-1.5 border-2 border-ink bg-terracottaLight/30 text-terracottaDark hover:bg-terracottaLight active:translate-x-[1px] active:translate-y-[1px]"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {rec.showTranscript && (
                <div className="p-2 border-2 border-ink bg-paper font-mono text-[10px] text-inkLight leading-relaxed space-y-2">
                  <div className="font-bold border-b border-ink/20 pb-1 text-ink uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber" /> AI Transcription Note:
                  </div>
                  <div>
                    {rec.processing ? (
                      <div className="flex items-center gap-2 text-amber py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Running Cloud Gemini / Local Whisper transcription on the backend...</span>
                      </div>
                    ) : (
                      rec.transcript
                    )}
                  </div>
                  
                  {!rec.processing && rec.notes && (
                    <div className="mt-2 pt-2 border-t border-ink/20 space-y-1">
                      <div className="font-bold text-sage uppercase flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Generated Notes:
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-[9px] bg-surface p-2 border border-ink overflow-x-auto max-h-48 text-ink">{rec.notes}</pre>
                    </div>
                  )}
                </div>
              )}
            </BrutalCard>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data: summary } = useGetDashboardSummary();
  const { data: events = [], isLoading: isEventsLoading } = useListEvents({ date: dateStr });
  const { data: tasks = [] } = useListTasks();

  const [attendanceThreshold, setAttendanceThreshold] = useState(75);

  const markAttendance = useMarkAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const handleAttendance = (eventId: string, status: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.courseId) return;
    markAttendance.mutate({ data: { eventId, courseId: event.courseId, status } });
  };

  const overallPct = summary?.overallAttendancePct ?? 0;
  const safeToSkip = Math.max(0, Math.floor(
    ((overallPct / 100) * (summary?.todayEventCount ?? 20) - (attendanceThreshold / 100) * (summary?.todayEventCount ?? 20))
  ));

  const studentTasks = tasks.filter(t => ["HOMEWORK_SCHOOL", "EXTRACURRICULAR", "EXAM_PREP", "PERSONAL"].includes(t.category));
  const pendingTasks = studentTasks.filter(t => t.status !== "DONE");
  const todoPct = studentTasks.length ? Math.round((studentTasks.filter(t => t.status === "DONE").length / studentTasks.length) * 100) : 0;

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">
            Command Center
          </h1>
          <p className="font-mono text-sm text-inkLight mt-1">
            STUDENT // ACADEMIC_DASHBOARD
          </p>
        </div>
        <div className="font-mono text-sm font-bold border-2 border-ink px-3 py-1 bg-surface">
          {format(date, "EEEE, MMM d")}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">
              TODAY'S CLASSES
            </span>
            <div className="text-3xl font-mono font-bold mt-2">{summary.todayEventCount}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <BrutalBadge variant="sage">{summary.todayAttended || 0} IN</BrutalBadge>
              <BrutalBadge variant="terracotta">{summary.todayMissed || 0} OUT</BrutalBadge>
            </div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">AT RISK</span>
            <div className="text-3xl font-mono font-bold mt-2 text-terracotta">
              {summary.attendanceAtRiskCount}
            </div>
            <div className="font-mono text-[10px] text-inkLight">courses below threshold</div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between">
            <span className="font-mono text-xs font-bold text-inkLight">
              PENDING TASKS
            </span>
            <div className="text-3xl font-mono font-bold mt-2 text-amber">
              {pendingTasks.length}
            </div>
            <div className="font-mono text-[10px] text-inkLight">{todoPct}% complete</div>
          </BrutalCard>

          <BrutalCard className="flex flex-col justify-between bg-ink text-paper">
            <span className="font-mono text-xs font-bold text-inkFaint">OVERALL ATTENDANCE</span>
            <div className="text-3xl font-mono font-bold mt-2">{overallPct.toFixed(1)}%</div>
            <div className={`font-mono text-[10px] ${overallPct >= attendanceThreshold ? "text-sageLight" : "text-terracottaLight"}`}>
              {overallPct >= attendanceThreshold ? "ABOVE THRESHOLD" : "BELOW THRESHOLD"}
            </div>
          </BrutalCard>
        </div>
      )}

      {summary?.upcomingExams && summary.upcomingExams.length > 0 && (
        <div className="bg-terracottaLight border-2 border-terracotta p-3 flex items-center gap-4 shadow-brutal-accent">
          <span className="font-mono text-sm font-bold bg-terracotta text-paper px-2 py-1">EXAM ALERT</span>
          <span className="font-bold font-mono text-sm">{summary.upcomingExams.length} exam(s) in the next 14 days</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-label mb-0 border-none pb-0">TODAY'S TIMELINE</h2>
            <DayNavigator date={date} onChange={setDate} />
          </div>

          {isEventsLoading ? (
            <div className="h-[500px] bg-surface animate-pulse border-2 border-ink" />
          ) : (
            <FluidTimeline events={events} onAttendance={handleAttendance} date={date} />
          )}
        </div>

        <div className="space-y-4">
          <BrutalCard>
            <h3 className="section-label mb-3">ATTENDANCE TRACKER</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-inkLight">CURRENT</span>
                <span className={`font-mono text-xl font-bold ${overallPct >= attendanceThreshold ? "text-sage" : "text-terracotta"}`}>
                  {overallPct.toFixed(1)}%
                </span>
              </div>

              <div className="h-4 border-2 border-ink bg-surface relative overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${overallPct >= attendanceThreshold ? "bg-sage" : "bg-terracotta"}`}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-ink"
                  style={{ left: `${attendanceThreshold}%` }}
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[10px] font-bold text-inkLight mb-1">
                  <span>THRESHOLD: {attendanceThreshold}%</span>
                  <span className={safeToSkip > 0 ? "text-sage" : "text-terracotta"}>
                    {safeToSkip > 0 ? `${safeToSkip} SAFE TO SKIP` : "CANNOT SKIP"}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={attendanceThreshold}
                  onChange={e => setAttendanceThreshold(Number(e.target.value))}
                  className="w-full h-2 accent-ink cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[9px] text-inkFaint mt-0.5">
                  <span>50%</span><span>75%</span><span>85%</span><span>100%</span>
                </div>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard>
            <h3 className="section-label mb-3">ATTENDANCE RISK CALENDAR</h3>
            <AttendanceHeatmap attendancePct={overallPct} threshold={attendanceThreshold} />
          </BrutalCard>

          <BrutalCard>
            <h3 className="section-label mb-3">
              HOMEWORK CHECKLIST
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {pendingTasks.slice(0, 8).map(task => (
                <div key={task.id} className="flex items-start gap-2 font-mono text-xs border-b border-inkFaint pb-1.5">
                  <div className={`w-3 h-3 border-2 border-ink mt-0.5 flex-shrink-0 ${task.status === "IN_PROGRESS" ? "bg-amber" : "bg-surface"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{task.title}</div>
                    {task.dueDate && (
                      <div className="text-inkLight text-[9px]">Due {format(new Date(task.dueDate), "MMM d")}</div>
                    )}
                  </div>
                  <BrutalBadge variant={task.priority === "HIGH" || task.priority === "CRITICAL" ? "terracotta" : "default"} className="text-[8px] px-1">
                    {task.priority}
                  </BrutalBadge>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="font-mono text-xs text-inkLight text-center py-4">ALL TASKS COMPLETE</div>
              )}
            </div>
          </BrutalCard>

          <RecordingWidget />
        </div>
      </div>
    </div>
  );
}
