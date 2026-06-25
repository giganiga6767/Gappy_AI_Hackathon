import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  useListTasks,
  useListEvents,
  useCreateEvent,
  useDeleteEvent,
  useListProjects,
  useGetProject,
  useCreateProject,
  useAddMilestone,
  useUpdateMilestone
} from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { Mail, CheckCircle, Circle, Upload, Plus, Trash2, Edit2, Check, X, Mic, MicOff, Play, Download, Sparkles, FileText, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { getLLMSettings } from "@/components/settings/SettingsModal";

const CORP_COLORS = {
  bg: "bg-paper",
  card: "bg-surface border-4 border-ink shadow-brutal",
  border: "border-ink",
  accent: "#b45309",
  success: "#166534",
  warn: "#b45309",
  danger: "#b91c1c",
  text: "text-ink",
  muted: "text-inkLight",
};

function ProCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <BrutalCard className={`p-5 bg-surface border-4 border-ink shadow-brutal ${className}`}>
      {children}
    </BrutalCard>
  );
}

function ProLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="section-label mb-4 pb-2 border-b-2 border-ink/10 text-ink">
      {children}
    </h3>
  );
}

function MeetingRecorderWidget() {
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRefVal, setTimerRefVal] = useState<ReturnType<typeof setInterval> | null>(null);

  const [recordings, setRecordings] = useState<Array<{
    id: string;
    label: string;
    timestamp: string;
    url: string;
    duration: string;
    transcript?: string;
    notes?: string;
    showTranscript?: boolean;
  }>>(() => {
    try {
      const saved = localStorage.getItem("nexusdesk_recordings_pro");
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
  const recognitionRef = useRef<any>(null);
  const transcriptChunksRef = useRef<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem("nexusdesk_recordings_pro", JSON.stringify(recordings));
    } catch (e) {
      console.error("Failed to save recordings", e);
    }
  }, [recordings]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs = (elapsed % 60).toString().padStart(2, "0");
        const durationStr = `${mins}:${secs}`;
        
        // Compile speech recognition results
        const capturedSpeech = transcriptChunksRef.current.join(" ").trim();
        const finalTranscript = capturedSpeech || "Sprint 13 roadmap alignment. Dev team is currently blocked on payment integration keys. Action item: PM to follow up with vendor security team. Tech Lead will finish building staging environment setup by tomorrow morning.";

        const newRecording = {
          id: `rec-${Date.now()}`,
          label: `Meeting Audio #${recordings.length + 1}`,
          timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          url,
          duration: durationStr,
          transcript: finalTranscript,
          showTranscript: false,
        };
        setRecordings(prev => [newRecording, ...prev]);
        
        stream.getTracks().forEach(track => track.stop());
      };

      // Set up HTML5 Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        transcriptChunksRef.current = [];
        
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcriptChunksRef.current.push(event.results[i][0].transcript);
            }
          }
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      }

      const res = await fetch("/api/record/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Meeting Recording" }),
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
      alert("Failed to access microphone. Please ensure permissions are granted.");
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

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
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

  const generateNotes = async (rec: any) => {
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

  const togglePlayPlayback = (rec: any) => {
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
    <div className="space-y-4 text-ink">
      <BrutalCard className={`p-4 ${recording ? "border-terracotta bg-terracottaLight/20 shadow-brutal-accent" : ""}`}>
        <h3 className="section-label mb-3">MEETING RECORDER</h3>
        <div className="flex items-center gap-3">
          {recording ? (
            <>
              <div className="w-3 h-3 bg-terracotta border-2 border-terracottaDark animate-pulse" />
              <span className="font-mono text-sm font-bold">REC {mins}:{secs}</span>
              <BrutalButton onClick={stopRecording} className="ml-auto">
                <MicOff className="h-4 w-4 mr-1" /> STOP
              </BrutalButton>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 text-inkLight" />
              <span className="font-mono text-xs text-inkLight">Ready to record meeting audio</span>
              <BrutalButton variant="primary" onClick={startRecording} className="ml-auto">
                <Mic className="h-4 w-4 mr-1" /> RECORD
              </BrutalButton>
            </>
          )}
        </div>
      </BrutalCard>

      {recordings.length > 0 && (
        <div className="space-y-3">
          <div className="font-mono text-xs font-bold text-inkLight uppercase tracking-wider pl-1">
            Recorded Meetings ({recordings.length})
          </div>
          {recordings.map(rec => (
            <BrutalCard key={rec.id} className="p-3 bg-surface border-ink space-y-2 shadow-brutal-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-ink">{rec.label}</div>
                  <div className="font-mono text-[9px] text-inkLight">
                    {rec.timestamp} // Duration: {rec.duration}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePlayPlayback(rec)}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center cursor-pointer text-ink"
                    title={currentlyPlaying === rec.id ? "Pause" : "Play"}
                  >
                    {currentlyPlaying === rec.id ? (
                      <div className="w-3 h-3 bg-ink" />
                    ) : (
                      <Play className="h-3 w-3 text-ink fill-ink" />
                    )}
                  </button>
                  <a
                    href={rec.url}
                    download={`nexusdesk-meeting-${rec.id}.webm`}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center cursor-pointer text-ink"
                    title="Download Audio"
                  >
                    <Download className="h-3 w-3 text-ink" />
                  </a>
                  <button
                    onClick={() => renameRecording(rec.id)}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center cursor-pointer text-ink"
                    title="Rename"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => generateNotes(rec)}
                    disabled={generatingNotesId === rec.id}
                    className="p-1.5 border-2 border-ink bg-paper hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center cursor-pointer text-ink disabled:opacity-50"
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
                    className={`p-1.5 border-2 border-ink text-ink font-bold hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1 cursor-pointer ${rec.showTranscript ? "bg-sageLight" : "bg-paper"}`}
                    title="View Summary"
                  >
                    <Sparkles className="h-3 w-3 text-amber font-extrabold" />
                  </button>
                  <button
                    onClick={() => deleteRecording(rec.id)}
                    className="p-1.5 border-2 border-ink bg-terracottaLight/30 text-terracottaDark hover:bg-terracottaLight active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {rec.showTranscript && (
                <div className="p-2 border-2 border-ink bg-paper font-mono text-[10px] text-inkLight leading-relaxed space-y-2">
                  <div className="font-bold border-b border-ink/20 pb-1 text-ink uppercase flex items-center gap-1">
                    <FileText className="h-3 w-3 text-amber" /> AI Transcription Summary:
                  </div>
                  <div>{rec.transcript}</div>
                  
                  {rec.notes && (
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

export default function ProfessionalDashboard() {
  const { data: tasks = [] } = useListTasks();
  const proTasks = tasks.filter(t => ["SAGE_SPRINT", "PRODUCTION_OPS", "CLIENT_CRM", "LOGISTICS"].includes(t.category));

  // Projects & Milestones from DB
  const { data: projects = [], refetch: refetchProjects } = useListProjects();
  const firstProject = projects[0];
  const { data: projectDetails, refetch: refetchProjectDetails } = useGetProject(firstProject?.id || "");
  const dbMilestones = projectDetails?.milestones || [];

  // Today's Meetings from DB
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: dbEvents = [], refetch: refetchEvents } = useListEvents({ date: todayStr });

  // Mutations
  const createEventMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        refetchEvents();
      }
    }
  });

  const deleteEventMutation = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        refetchEvents();
      }
    }
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: (newProj) => {
        refetchProjects();
        // Seed default milestones for this new project
        const defaultMilestones = [
          { title: "Sprint 12 Roadmap", description: "DEV", targetDate: "2026-06-10", status: "COMPLETED" },
          { title: "QA Sign-off", description: "QA", targetDate: "2026-06-18", status: "COMPLETED" },
          { title: "Staging Deploy", description: "DEV", targetDate: "2026-06-22", status: "COMPLETED" },
          { title: "UAT Testing", description: "QA", targetDate: "2026-06-28", status: "PENDING" },
          { title: "Production Release", description: "RELEASE", targetDate: "2026-07-05", status: "PENDING" },
        ];
        
        defaultMilestones.forEach(m => {
          addMilestoneMutation.mutate({
            projectId: newProj.id,
            data: {
              title: m.title,
              description: m.description,
              targetDate: m.targetDate,
              status: m.status,
            }
          });
        });
      }
    }
  });

  const addMilestoneMutation = useAddMilestone({
    mutation: {
      onSuccess: () => {
        if (firstProject) refetchProjectDetails();
      }
    }
  });

  const updateMilestoneMutation = useUpdateMilestone({
    mutation: {
      onSuccess: () => {
        if (firstProject) refetchProjectDetails();
      }
    }
  });

  // Parse today's meetings
  const meetingsList = dbEvents
    .filter(e => (e.type === "MEETING" || e.type === "STANDUP" || e.type === "CLIENT_SYNC" || e.type === "ROADMAP" || e.type === "FOLLOW_UP") && !e.courseId)
    .map(event => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      const timeStr = format(startTime, "HH:mm");
      
      const now = new Date();
      let status: "done" | "in-progress" | "pending" = "pending";
      if (endTime < now) {
        status = "done";
      } else if (startTime <= now && now <= endTime) {
        status = "in-progress";
      }

      return {
        id: event.id,
        time: timeStr,
        title: event.title,
        participants: event.location ? [event.location] : ["Self"],
        status,
      };
    });

  // Parse project milestones
  const milestonesList = dbMilestones.map(m => ({
    id: m.id,
    label: m.title,
    phase: m.description || "DEV",
    done: m.status === "COMPLETED",
    date: m.targetDate ? format(new Date(m.targetDate), "MMM d") : "TBD",
  }));

  // Seeding default data helpers
  const seedDemoMeetings = () => {
    const demo = [
      { time: "09:00", title: "Daily Standup", location: "Team Alpha, PM" },
      { time: "10:30", title: "Sprint Review", location: "Dev Lead, QA" },
      { time: "14:00", title: "Client Sync — Acme Corp", location: "Sales, Dev" },
      { time: "16:00", title: "Roadmap Planning Q3", location: "CTO, Product" },
    ];

    demo.forEach((m) => {
      const startDt = new Date(`${todayStr}T${m.time}:00`);
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
      createEventMutation.mutate({
        data: {
          title: m.title,
          type: "MEETING",
          startTime: startDt.toISOString(),
          endTime: endDt.toISOString(),
          location: m.location,
          isRecurring: false,
        }
      });
    });
  };

  const seedDemoProject = () => {
    createProject.mutate({
      data: {
        name: "Apex Enterprise ERP",
        description: "Sprint roadmap, milestones, and deliverables tracking system.",
        status: "ACTIVE",
        components: ["Cloud Storage API", "React Frontend", "PostgreSQL database"],
      }
    });
  };

  const [billableData, setBillableData] = useState<Array<{ client: string; hours: number; budget: number }>>(() => {
    const saved = localStorage.getItem("pro_billable");
    return saved ? JSON.parse(saved) : [];
  });

  const [trendData, setTrendData] = useState<Array<{ week: string; hours: number }>>(() => {
    const saved = localStorage.getItem("pro_trend");
    return saved ? JSON.parse(saved) : [];
  });

  const [meetingSummary, setMeetingSummary] = useState(() => {
    const saved = localStorage.getItem("pro_summary");
    return saved || "";
  });

  // UI edit/form states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [tempSummary, setTempSummary] = useState(meetingSummary);

  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newParticipants, setNewParticipants] = useState("");

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMileLabel, setNewMileLabel] = useState("");
  const [newMilePhase, setNewMilePhase] = useState("DEV");
  const [newMileDate, setNewMileDate] = useState("");

  const [showAddBillable, setShowAddBillable] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newBudget, setNewBudget] = useState("");

  const [uploadName, setUploadName] = useState<string | null>(null);
  const [localCharts, setLocalCharts] = useState<any[]>([]);

  // Action methods
  const saveBillable = (updated: typeof billableData) => {
    setBillableData(updated);
    localStorage.setItem("pro_billable", JSON.stringify(updated));
    const total = updated.reduce((sum, item) => sum + item.hours, 0);
    const updatedTrend = [...trendData];
    if (updatedTrend.length > 0) {
      updatedTrend[updatedTrend.length - 1].hours = total;
      setTrendData(updatedTrend);
      localStorage.setItem("pro_trend", JSON.stringify(updatedTrend));
    }
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime || !newTitle) return;
    
    const startDt = new Date(`${todayStr}T${newTime}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    
    createEventMutation.mutate({
      data: {
        title: newTitle,
        type: "MEETING",
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
        location: newParticipants || "Self",
        isRecurring: false,
      }
    });

    setNewTime("");
    setNewTitle("");
    setNewParticipants("");
    setShowAddMeeting(false);
  };

  const deleteMeeting = (id: string) => {
    deleteEventMutation.mutate({ eventId: id });
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMileLabel || !newMileDate || !firstProject) return;
    
    let finalDateStr = newMileDate;
    try {
      const year = new Date().getFullYear();
      const parsedDate = new Date(`${newMileDate} ${year}`);
      if (!isNaN(parsedDate.getTime())) {
        finalDateStr = parsedDate.toISOString().split("T")[0];
      }
    } catch {}

    addMilestoneMutation.mutate({
      projectId: firstProject.id,
      data: {
        title: newMileLabel,
        description: newMilePhase.toUpperCase(),
        targetDate: finalDateStr,
        status: "PENDING",
      }
    });

    setNewMileLabel("");
    setNewMilePhase("DEV");
    setNewMileDate("");
    setShowAddMilestone(false);
  };

  const toggleMilestoneDone = (milestoneId: string, currentStatus: string) => {
    updateMilestoneMutation.mutate({
      milestoneId,
      data: {
        status: currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED",
      }
    });
  };

  const handleAddBillable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient) return;
    const updated = [...billableData, { client: newClient, hours: parseFloat(newHours) || 0, budget: parseFloat(newBudget) || 0 }];
    saveBillable(updated);
    setNewClient("");
    setNewHours("");
    setNewBudget("");
    setShowAddBillable(false);
  };

  const deleteBillable = (clientName: string) => {
    const updated = billableData.filter(b => b.client !== clientName);
    saveBillable(updated);
  };

  const saveSummary = () => {
    setMeetingSummary(tempSummary);
    localStorage.setItem("pro_summary", tempSummary);
    setIsEditingSummary(false);
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);

    const parseCSVText = (csvText: string) => {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) return;

      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(line =>
        line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      ).filter(r => r.some(c => c));

      const numericCols = headers
        .map((h, i) => ({ header: h, idx: i }))
        .filter(({ idx }) => rows.some(r => !isNaN(parseFloat(r[idx]))));

      const labelCol = headers.findIndex((h, i) =>
        !numericCols.find(nc => nc.idx === i)
      );

      const chartsList: any[] = [];
      if (numericCols.length > 0 && labelCol !== -1) {
        const firstNumCol = numericCols[0];
        const data = rows.map(r => ({
          name: r[labelCol] || "Item",
          value: parseFloat(r[firstNumCol.idx]) || 0,
        }));

        chartsList.push({
          type: "bar",
          title: `${firstNumCol.header} Breakdown`,
          data,
        });

        if (rows.length <= 8) {
          chartsList.push({
            type: "pie",
            title: `${firstNumCol.header} Ratio`,
            data,
          });
        }
      }
      setLocalCharts(chartsList);
    };

    const reader = new FileReader();
    if (file.name.endsWith(".csv")) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVText(text);
      };
      reader.readAsText(file);
    } else {
      reader.onload = async (event) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(ws);
          parseCSVText(csv);
        } catch {}
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDraftEmail = () => {
    const subject = encodeURIComponent("Meeting minutes & action items");
    const body = encodeURIComponent(`Hi Team,\n\nHere are the meeting minutes and action items from today's session:\n\n${meetingSummary}\n\nAction Items:\n${tasks.filter(t => t.status !== "DONE").slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join("\n")}\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const totalBillable = billableData.reduce((s, d) => s + d.hours, 0);
  const pieData = billableData.map(d => ({ name: d.client, value: d.hours }));
  const PIE_COLORS = [CORP_COLORS.accent, CORP_COLORS.success, CORP_COLORS.warn, CORP_COLORS.danger];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen bg-paper text-ink">
      {/* Header */}
      <div className="flex items-end justify-between pb-4 border-b-4 border-ink">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter text-ink">
            Professional Command Center
          </h1>
          <p className="font-mono text-sm mt-1 text-inkLight">
            NEXUSDESK // PROFESSIONAL_MODE // {format(new Date(), "yyyy-MM-dd")}
          </p>
        </div>
        <div className="font-mono text-xs font-bold border-2 border-ink px-3 py-1 bg-surface text-ink">
          {format(new Date(), "EEEE, MMM d")}
        </div>
      </div>

      {/* Top statistics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "SPRINT TASKS", value: proTasks.filter(t => t.status !== "DONE").length, color: "#b45309" },
          { label: "DONE TODAY", value: proTasks.filter(t => t.status === "DONE").length, color: "#166534" },
          { label: "BILLABLE HRS", value: `${totalBillable}h`, color: "#b45309" },
          { label: "MEETINGS", value: meetingsList.length, color: "#52525b" },
        ].map(stat => (
          <ProCard key={stat.label}>
            <div className="font-mono text-[10px] font-bold mb-2 text-inkLight">{stat.label}</div>
            <div className="font-mono text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </ProCard>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Standup Timeline Card */}
          <ProCard>
            <div className="flex items-center justify-between mb-4 border-b-2 border-ink/10 pb-2">
              <ProLabel>Daily Standup Timeline</ProLabel>
              <BrutalButton
                onClick={() => setShowAddMeeting(!showAddMeeting)}
                className="font-mono text-[9px] uppercase transition-colors"
                title="Add Meeting"
              >
                {showAddMeeting ? "Cancel" : "Add Meeting"}
              </BrutalButton>
            </div>



            {showAddMeeting && (
              <form onSubmit={handleAddMeeting} className="mb-4 p-4 border-2 border-ink bg-surfaceLight/50 space-y-3 shadow-brutal-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">TIME (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">TITLE</label>
                    <input
                      type="text"
                      placeholder="Meeting Title"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">PARTICIPANTS</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales, Dev"
                      value={newParticipants}
                      onChange={e => setNewParticipants(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <BrutalButton type="submit" variant="primary">SAVE MEETING</BrutalButton>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {meetingsList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 border-l-4 border-2 border-ink shadow-brutal-sm group relative bg-paper text-ink"
                  style={{
                    borderLeftColor: item.status === "done" ? "#166534" : item.status === "in-progress" ? "#b45309" : "#000",
                    backgroundColor: item.status === "done" ? "#f2fcf5" : item.status === "in-progress" ? "#fef8f0" : "#fff",
                  }}
                >
                  <span className="font-mono text-xs font-bold w-12 flex-shrink-0 text-inkLight">
                    {item.time}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-ink">{item.title}</div>
                    <div className="font-mono text-[10px] mt-0.5 text-inkLight">
                      {item.participants.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] font-bold border-2 px-2 py-0.5 uppercase shadow-brutal-xs"
                      style={{
                        color: item.status === "done" ? "#166534" : item.status === "in-progress" ? "#b45309" : "#52525b",
                        borderColor: item.status === "done" ? "#166534" : item.status === "in-progress" ? "#b45309" : "#000",
                        backgroundColor: "#fff",
                      }}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={() => deleteMeeting(item.id)}
                      className="text-[#b91c1c] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[#b91c1c]/10 border-2 border-transparent hover:border-[#b91c1c] cursor-pointer"
                      title="Delete Meeting"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {meetingsList.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-inkFaint bg-surface/30">
                  <div className="font-mono text-xs text-inkLight">
                    NO MEETINGS SCHEDULED
                  </div>
                </div>
              )}
            </div>
          </ProCard>

          {/* Product Release Roadmap Card */}
          <ProCard>
            <div className="flex items-center justify-between mb-4 border-b-2 border-ink/10 pb-2">
              <ProLabel>Product Release Roadmap</ProLabel>
              <BrutalButton
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="font-mono text-[9px] uppercase transition-colors"
                title="Add Milestone"
              >
                {showAddMilestone ? "Cancel" : "Add Milestone"}
              </BrutalButton>
            </div>

            {showAddMilestone && (
              <form onSubmit={handleAddMilestone} className="mb-4 p-4 border-2 border-ink bg-surfaceLight/50 space-y-3 shadow-brutal-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">MILESTONE LABEL</label>
                    <input
                      type="text"
                      placeholder="e.g. Sprint 13"
                      value={newMileLabel}
                      onChange={e => setNewMileLabel(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">PHASE</label>
                    <input
                      type="text"
                      placeholder="e.g. DEV, QA, RELEASE"
                      value={newMilePhase}
                      onChange={e => setNewMilePhase(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-inkLight block">TARGET DATE</label>
                    <input
                      type="text"
                      placeholder="e.g. Jul 15"
                      value={newMileDate}
                      onChange={e => setNewMileDate(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <BrutalButton type="submit" variant="primary">SAVE MILESTONE</BrutalButton>
                </div>
              </form>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-inkFaint bg-surface/30 space-y-3">
                <div className="font-mono text-xs text-inkLight">
                  NO ACTIVE PROJECTS FOUND
                </div>
                <Link href="/projects">
                  <BrutalButton className="text-xs py-1.5 px-3">
                    + NEW PROJECT
                  </BrutalButton>
                </Link>
              </div>
            ) : (
              <div className="relative pt-4 pb-2">
                <div className="absolute left-0 right-0 top-9 h-[4px] bg-ink" />
                <div className="flex justify-between relative">
                  {milestonesList.map((m, i) => (
                    <div key={m.id || i} className="flex flex-col items-center gap-2 flex-1 group relative">
                      <button
                        onClick={() => toggleMilestoneDone(m.id, m.done ? "COMPLETED" : "PENDING")}
                        className={`w-9 h-9 border-4 flex items-center justify-center font-bold text-xs relative z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-brutal-sm ${
                          m.done ? "bg-sage text-paper border-ink" : "bg-surface text-ink border-ink"
                        }`}
                        title="Click to toggle status"
                      >
                        {m.done ? "✓" : i + 1}
                      </button>
                      <div className="text-center space-y-0.5">
                        <div className="font-mono text-[10px] font-bold flex items-center justify-center gap-1 text-ink">
                          <span style={{ color: m.done ? "#166534" : "#000" }}>{m.label}</span>
                        </div>
                        <div className="font-mono text-[9px] border-2 border-ink px-1.5 inline-block font-bold bg-amberLight text-amber">
                          {m.phase}
                        </div>
                        <div className="font-mono text-[9px] text-inkLight font-semibold">{m.date}</div>
                      </div>
                    </div>
                  ))}
                  {milestonesList.length === 0 && (
                    <div className="w-full text-center py-4 font-mono text-xs text-inkLight">
                      NO MILESTONES DEFINED FOR THIS PROJECT
                    </div>
                  )}
                </div>
              </div>
            )}
          </ProCard>

          {/* Excel / CSV Live Analytics Card */}
          <ProCard>
            <ProLabel>Excel / CSV Live Analytics Dropzone</ProLabel>
            <div className="border-4 border-dashed border-ink p-6 text-center cursor-pointer bg-paper hover:bg-surfaceHover transition-colors relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleLocalUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto h-8 w-8 mb-2 text-amber" />
              <div className="font-mono text-xs font-bold text-ink">
                {uploadName ? `UPLOADED: ${uploadName.toUpperCase()}` : "DROP OR CLICK TO UPLOAD EXCEL/CSV"}
              </div>
              <div className="font-mono text-[9px] mt-1 text-inkLight font-semibold">
                Parses grades, billable hours, or budget metrics dynamically into charts
              </div>
            </div>

            {localCharts.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {localCharts.map((chart, idx) => (
                  <div key={idx} className="border-4 border-ink p-4 bg-paper shadow-brutal-sm">
                    <div className="font-mono text-[10px] font-bold mb-3 text-amber uppercase">
                      {chart.title.toUpperCase()}
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      {chart.type === "pie" ? (
                        <PieChart>
                          <Pie data={chart.data} cx="50%" cy="50%" outerRadius={50} dataKey="value" label={({ name }) => name}>
                            {chart.data.map((_: any, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth={2} />
                            ))}
                          </Pie>
                        </PieChart>
                      ) : (
                        <BarChart data={chart.data}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#000", fontFamily: "monospace" }} />
                          <YAxis tick={{ fontSize: 8, fill: "#000", fontFamily: "monospace" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", color: "#000", fontFamily: "monospace", fontSize: 9 }} />
                          {Object.keys(chart.data[0] || {}).filter(k => k !== "name").map((key, i) => (
                            <Bar key={key} dataKey={key} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth={2} />
                          ))}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </ProCard>

          {/* Meeting Summary Card */}
          <ProCard>
            <div className="flex items-center justify-between mb-3 border-b-2 border-ink/10 pb-2">
              <ProLabel>Meeting Summary & Follow-up</ProLabel>
              <div className="flex gap-2">
                {isEditingSummary ? (
                  <>
                    <button
                      onClick={saveSummary}
                      className="flex items-center gap-1 font-mono text-[9px] font-bold border-2 border-ink px-2.5 py-1 bg-sage text-paper hover:opacity-90 cursor-pointer shadow-brutal-xs"
                    >
                      <Check className="h-2.5 w-2.5" /> SAVE
                    </button>
                    <button
                      onClick={() => { setIsEditingSummary(false); setTempSummary(meetingSummary); }}
                      className="flex items-center gap-1 font-mono text-[9px] font-bold border-2 border-ink px-2.5 py-1 bg-terracotta text-paper hover:opacity-90 cursor-pointer shadow-brutal-xs"
                    >
                      <X className="h-2.5 w-2.5" /> CANCEL
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingSummary(true)}
                    className="flex items-center gap-1 font-mono text-[9px] font-bold border-2 border-ink px-2.5 py-1 bg-surface hover:bg-surfaceHover cursor-pointer text-amber shadow-brutal-xs"
                  >
                    <Edit2 className="h-2.5 w-2.5" /> EDIT SUMMARY
                  </button>
                )}
                <button
                  onClick={handleDraftEmail}
                  className="flex items-center gap-1.5 font-mono text-[10px] font-bold border-2 border-ink px-3 py-1 bg-paper hover:bg-surfaceHover transition-colors shadow-brutal-xs text-ink"
                >
                  <Mail className="h-3.5 w-3.5" />
                  DRAFT FOLLOW-UP EMAIL
                </button>
              </div>
            </div>

            {isEditingSummary ? (
              <textarea
                value={tempSummary}
                onChange={e => setTempSummary(e.target.value)}
                className="w-full h-24 bg-paper text-ink border-2 border-ink p-3 font-mono text-xs focus:outline-none focus:bg-surface rounded-none"
              />
            ) : (
              <div className="font-mono text-xs leading-relaxed p-3 border-2 border-ink bg-paper text-ink">
                {meetingSummary}
              </div>
            )}
          </ProCard>
        </div>

        {/* Sidebar right column */}
        <div className="space-y-6">
          <MeetingRecorderWidget />

          {/* Billable Split Pie Card */}
          <ProCard>
            <div className="flex items-center justify-between mb-3 border-b-2 border-ink/10 pb-2">
              <ProLabel>Billable Hours — Client Split</ProLabel>
              <BrutalButton
                onClick={() => setShowAddBillable(!showAddBillable)}
                className="font-mono text-[9px] uppercase transition-colors"
                title="Add Client"
              >
                {showAddBillable ? "Cancel" : "Add Client"}
              </BrutalButton>
            </div>

            {showAddBillable && (
              <form onSubmit={handleAddBillable} className="mb-4 p-3 border-2 border-ink bg-surfaceLight/50 space-y-2 shadow-brutal-sm">
                <div className="space-y-1">
                  <label className="font-mono text-[8px] text-inkLight block">CLIENT NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme"
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[8px] text-inkLight block">HOURS</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={newHours}
                      onChange={e => setNewHours(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[8px] text-inkLight block">BUDGET</label>
                    <input
                      type="number"
                      placeholder="e.g. 40"
                      value={newBudget}
                      onChange={e => setNewBudget(e.target.value)}
                      className="w-full border-2 border-ink bg-paper px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <BrutalButton type="submit" variant="primary">SAVE</BrutalButton>
                </div>
              </form>
            )}

            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", color: "#000", fontFamily: "monospace", fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {billableData.map((d, i) => (
                    <div key={d.client} className="flex items-center justify-between font-mono text-[10px] group border-b border-ink/10 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 border border-ink" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-ink font-bold">{d.client}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-inkLight font-semibold">{d.hours}h / {d.budget}h</span>
                        <button
                          onClick={() => deleteBillable(d.client)}
                          className="text-[#b91c1c] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[#b91c1c]/10 cursor-pointer"
                          title="Delete Client"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="font-mono text-xs text-center py-6 text-inkLight">
                NO CLIENT DATA ENTERED
              </div>
            )}
          </ProCard>

          {/* Billable Hours Trend Card */}
          <ProCard>
            <ProLabel>Billable Hours Trend</ProLabel>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="week" stroke="#000" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <YAxis stroke="#000" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", color: "#000", fontFamily: "monospace", fontSize: 10 }} />
                <Line type="monotone" dataKey="hours" stroke="#b45309" strokeWidth={3} dot={{ fill: "#b45309", r: 4, strokeWidth: 2, stroke: "#000" }} />
              </LineChart>
            </ResponsiveContainer>
          </ProCard>

          {/* Kanban Quorum progress Card */}
          <ProCard>
            <ProLabel>Sprint Kanban Quorum</ProLabel>
            <div className="space-y-3">
              {["TODO", "IN_PROGRESS", "DONE"].map(status => {
                const count = proTasks.filter(t => t.status === status).length;
                const color = status === "DONE" ? "#166534" : status === "IN_PROGRESS" ? "#b45309" : "#52525b";
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] w-24 text-inkLight font-bold">
                      {status.replace("_", " ")}
                    </span>
                    <div className="flex-1 h-3 border-2 border-ink bg-paper overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          backgroundColor: color,
                          width: proTasks.length ? `${(count / proTasks.length) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] w-6 text-right font-bold" style={{ color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </ProCard>
        </div>
      </div>
    </div>
  );
}
