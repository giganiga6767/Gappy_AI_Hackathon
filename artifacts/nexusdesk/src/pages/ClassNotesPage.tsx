import { useState, useEffect, useRef } from "react";
import { useListCourses } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { 
  Mic, Square, Play, Pause, Upload, BookOpen, 
  FileText, CheckSquare, Volume2, Download, 
  Loader2, Sparkles, Clock, Trash2, Eye 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PipelineResult {
  success: boolean;
  notes: string;
  tasksCreated: number;
  resourcesCreated: number;
  audioUrl: string;
  notesUrl: string;
}

interface SavedNoteResource {
  id: string;
  title: string;
  filePath: string;
  url: string;
  type: string;
  courseId: string;
  courseName: string;
  courseCode: string;
}

export default function ClassNotesPage() {
  const { data: courses = [], isLoading: isLoadingCourses } = useListCourses();
  const { toast } = useToast();

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [useLocalWhisper, setUseLocalWhisper] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem("nexusdesk_gemini_api_key") || "";
  });

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // File Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Pipeline execution state
  const [statusStep, setStatusStep] = useState<"idle" | "transcribing" | "generating" | "saving" | "complete">("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);

  // Saved Notes list
  const [savedNotes, setSavedNotes] = useState<SavedNoteResource[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  const [activeNoteTitle, setActiveNoteTitle] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch previously saved class notes
  const fetchSavedNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const response = await fetch("/api/resources");
      if (response.ok) {
        const data = await response.json();
        // Filter resources that are notes (Markdown) or have filePath ending with .notes.md
        const notes = data.filter((r: any) => 
          r.type === "NOTE" && r.filePath && r.filePath.endsWith(".notes.md")
        );
        setSavedNotes(notes);
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchSavedNotes();
  }, []);

  // Timer for recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Start Mic Recording
  const startRecording = async () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // chunk every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
      toast({
        title: "Microphone Active",
        description: "Recording class session audio..."
      });
    } catch (err: any) {
      console.error("Failed to access microphone:", err);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check system permissions.",
        variant: "destructive"
      });
    }
  };

  // Pause Recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Handle uploaded audio file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setAudioBlob(null);
      setAudioUrl(null);
      // Auto-set session name from file name if empty
      if (!sessionName) {
        const cleanName = file.name.split(".")[0].replace(/[_-]/g, " ");
        setSessionName(cleanName);
      }
    }
  };

  // Convert blob/file to base64
  const toBase64 = (blob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        // strip prefix "data:audio/webm;base64," or similar
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Run the Pipeline
  const runPipeline = async () => {
    const targetAudio = audioBlob || uploadedFile;
    if (!targetAudio) {
      toast({
        title: "Missing Audio",
        description: "Please record or upload audio first.",
        variant: "destructive"
      });
      return;
    }
    if (!selectedCourseId) {
      toast({
        title: "Select Course",
        description: "Please link this session to a course.",
        variant: "destructive"
      });
      return;
    }
    if (!sessionName.trim()) {
      toast({
        title: "Session Name Required",
        description: "Please provide a name for this session.",
        variant: "destructive"
      });
      return;
    }

    setStatusStep("transcribing");
    setPipelineError(null);
    setResult(null);

    try {
      const base64Audio = await toBase64(targetAudio);
      const fileName = uploadedFile ? uploadedFile.name : "recording.webm";

      const payload = {
        audio: base64Audio,
        fileName,
        courseId: selectedCourseId,
        sessionName: sessionName.trim(),
        useLocalWhisper,
        geminiApiKey: geminiApiKey || undefined,
        geminiModel: localStorage.getItem("nexusdesk_gemini_model") || "gemini-2.5-flash"
      };

      const response = await fetch("/api/record/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Failed to process audio");
      }

      // Transition loading indicator
      setStatusStep("generating");
      await new Promise(r => setTimeout(r, 1000));
      setStatusStep("saving");
      
      const data: PipelineResult = await response.json();
      
      setStatusStep("complete");
      setResult(data);
      toast({
        title: "Pipeline Completed!",
        description: `Generated notes and created ${data.tasksCreated} tasks successfully.`
      });
      fetchSavedNotes();
    } catch (err: any) {
      console.error(err);
      setPipelineError(err.message || "Failed to run the notes pipeline");
      setStatusStep("idle");
    }
  };

  // View note markdown
  const readNote = async (note: SavedNoteResource) => {
    try {
      const res = await fetch(`/api/recordings/read?path=${encodeURIComponent(note.filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveNoteContent(data.content);
        setActiveNoteTitle(note.title);
      } else {
        toast({
          title: "Error reading note",
          description: "Could not open markdown notes file.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error reading note:", err);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete these notes?")) return;
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "DELETE"
      });
      if (res.status === 204) {
        toast({
          title: "Deleted",
          description: "Resource deleted successfully."
        });
        fetchSavedNotes();
        if (activeNoteTitle) {
          setActiveNoteContent(null);
          setActiveNoteTitle("");
        }
      }
    } catch (err) {
      console.error("Error deleting notes:", err);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remains = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remains.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">CLASS RECORDER & PIPELINE</h1>
          <p className="font-mono text-sm text-inkLight mt-1">NEXUS_DESK // AUDIO_INTEGRATOR</p>
        </div>
        <BrutalBadge variant="default" className="text-sm font-mono">
          STATUS: {statusStep.toUpperCase()}
        </BrutalBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recording Controls & Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          
          <BrutalCard className="bg-paper border-2 border-ink">
            <h3 className="section-label mb-4 flex items-center gap-2">
              <Mic className="h-5 w-5 text-terracotta" /> SESSION INTEGRATION CONFIG
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-inkLight block">SELECT TARGET COURSE</label>
                  <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    required
                    className="w-full border-2 border-ink bg-surface p-2 font-mono text-sm"
                  >
                    <option value="">SELECT COURSE...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.subjectCode} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-inkLight block">SESSION / LECTURE NAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lecture 4: Analog Modulation"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                    className="w-full border-2 border-ink bg-surface p-2 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Advanced engine override */}
              <div className="border-t-2 border-dashed border-inkFaint pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox"
                    id="whisper-local"
                    checked={useLocalWhisper}
                    onChange={(e) => setUseLocalWhisper(e.target.checked)}
                    className="w-4 h-4 border-2 border-ink bg-surface rounded-none"
                  />
                  <label htmlFor="whisper-local" className="font-mono text-xs font-bold text-ink hover:cursor-pointer select-none">
                    RUN WHISPER LOCALLY (OFFLINE CPU)
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] font-bold text-inkLight block">GEMINI API STUDIO KEY OVERRIDE</label>
                  <input 
                    type="password"
                    placeholder="AIzaSy... (Leave empty to use .env key)"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem("nexusdesk_gemini_api_key", e.target.value);
                    }}
                    className="w-full border-2 border-ink bg-surface px-2 py-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </BrutalCard>

          {/* Recording & File Input Card */}
          <BrutalCard className="bg-surface border-2 border-ink p-6">
            <h3 className="section-label mb-4 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-sage" /> AUDIO CAPTURE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Browser Recorder panel */}
              <div className="border-2 border-ink p-4 bg-paper flex flex-col items-center justify-center text-center space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-inkLight">
                  Live Mic Recording
                </div>

                <div className="font-mono text-4xl font-extrabold tracking-widest text-ink">
                  {formatTime(recordingSeconds)}
                </div>

                {isRecording && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-terracotta rounded-full animate-ping" />
                    <span className="font-mono text-[10px] font-bold text-terracotta">RECORDING ACTIVE</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {!isRecording ? (
                    <BrutalButton variant="primary" onClick={startRecording} className="flex items-center gap-2">
                      <Mic className="h-4 w-4" /> START RECORD
                    </BrutalButton>
                  ) : (
                    <>
                      <BrutalButton variant="default" onClick={pauseRecording} className="flex items-center gap-1 font-mono text-xs">
                        {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        {isPaused ? "RESUME" : "PAUSE"}
                      </BrutalButton>
                      <BrutalButton variant="primary" onClick={stopRecording} className="flex items-center gap-1 font-mono text-xs">
                        <Square className="h-3 w-3" /> STOP
                      </BrutalButton>
                    </>
                  )}
                </div>

                {audioUrl && (
                  <div className="w-full pt-2 border-t-2 border-ink/10">
                    <audio src={audioUrl} controls className="w-full" />
                  </div>
                )}
              </div>

              {/* File Upload panel */}
              <div className="border-2 border-ink p-4 bg-paper flex flex-col items-center justify-center text-center space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-inkLight">
                  Or Upload Lecture File
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-inkFaint p-6 w-full cursor-pointer hover:bg-surfaceHover">
                  <Upload className="h-8 w-8 text-inkLight mb-2" />
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    id="audio-file-uploader"
                  />
                  <label htmlFor="audio-file-uploader" className="font-mono text-xs font-bold text-sage underline hover:cursor-pointer">
                    CHOOSE AUDIO FILE
                  </label>
                  {uploadedFile && (
                    <div className="font-mono text-[10px] font-bold text-ink mt-2 truncate max-w-full">
                      FILE: {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Run Pipeline Button */}
            <div className="mt-6 flex justify-end">
              <BrutalButton 
                variant="primary" 
                onClick={runPipeline} 
                disabled={statusStep !== "idle" && statusStep !== "complete"}
                className="w-full md:w-auto text-lg flex items-center gap-2 shadow-brutal"
              >
                {statusStep !== "idle" && statusStep !== "complete" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {statusStep.toUpperCase()} PIPELINE...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" /> RUN AUDIO NOTES PIPELINE
                  </>
                )}
              </BrutalButton>
            </div>
          </BrutalCard>

          {/* Running Progress Loader & Logs */}
          {statusStep !== "idle" && statusStep !== "complete" && (
            <BrutalCard className="bg-ink text-paper border-2 border-ink p-6 font-mono space-y-4">
              <h3 className="text-md font-bold text-paper flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-terracotta" /> PIPELINE EXECUTION IN PROGRESS
              </h3>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${statusStep === "transcribing" ? "text-terracotta font-bold" : "text-paper/60"}`}>
                  <span>[STAGE 1]</span>
                  <span>Audio Transcription (Whisper AI / Gemini Cloud API)</span>
                  {statusStep === "transcribing" && <span className="animate-pulse">● Processing...</span>}
                </div>
                <div className={`flex items-center gap-2 ${statusStep === "generating" ? "text-terracotta font-bold" : "text-paper/60"}`}>
                  <span>[STAGE 2]</span>
                  <span>Gemini Note-Taker: Parsing raw transcript, cleaning structure & layout</span>
                  {statusStep === "generating" && <span className="animate-pulse">● Running...</span>}
                </div>
                <div className={`flex items-center gap-2 ${statusStep === "saving" ? "text-terracotta font-bold" : "text-paper/60"}`}>
                  <span>[STAGE 3]</span>
                  <span>Parsing action items, inserting Tasks and Course Resources into Database</span>
                  {statusStep === "saving" && <span className="animate-pulse">● Saving...</span>}
                </div>
              </div>
            </BrutalCard>
          )}

          {/* Error Message */}
          {pipelineError && (
            <BrutalCard className="bg-terracottaLight/20 border-terracotta p-4 text-ink">
              <h4 className="font-mono text-sm font-bold text-terracotta uppercase mb-1">PIPELINE ERROR OCCURRED</h4>
              <p className="font-mono text-xs leading-relaxed">{pipelineError}</p>
            </BrutalCard>
          )}

          {/* Result Notes / Task Preview */}
          {statusStep === "complete" && result && (
            <BrutalCard className="bg-sageLight/10 border-sage p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-sage pb-2">
                <h3 className="font-heading text-lg font-bold text-sage">PIPELINE EXECUTION COMPLETED</h3>
                <div className="flex gap-2">
                  <BrutalBadge variant="default">TASKS CREATED: {result.tasksCreated}</BrutalBadge>
                  <BrutalBadge variant="default">RESOURCES: {result.resourcesCreated}</BrutalBadge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-ink p-3 bg-paper">
                  <div className="font-mono text-xs font-bold mb-2">DOWNLOAD FILES</div>
                  <div className="space-y-2">
                    <a href={result.notesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-xs text-sage underline font-bold">
                      <Download className="h-4 w-4" /> Download Markdown Notes (.md)
                    </a>
                    <a href={result.audioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-xs text-sage underline font-bold">
                      <Download className="h-4 w-4" /> Download Original Audio (.webm)
                    </a>
                  </div>
                </div>

                <div className="border-2 border-ink p-3 bg-paper flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold mb-1">AUTOMATION STATUS</div>
                    <p className="font-mono text-[10px] text-inkLight">
                      The note transcript has been cleaned. Tasks have been added directly to your Todo checklist.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <BrutalButton variant="primary" onClick={() => {
                      setActiveNoteContent(result.notes);
                      setActiveNoteTitle(`${sessionName} Notes`);
                    }} className="text-xs">
                      <BookOpen className="h-3 w-3" /> READ FULL NOTES
                    </BrutalButton>
                  </div>
                </div>
              </div>
            </BrutalCard>
          )}

        </div>

        {/* Saved Notes Sidebar Column */}
        <div className="space-y-6">
          <BrutalCard className="bg-paper border-2 border-ink">
            <h3 className="section-label mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-sage" /> SAVED CLASS NOTES
            </h3>

            {isLoadingNotes ? (
              <div className="space-y-2">
                <div className="h-10 bg-surface animate-pulse border-2 border-ink" />
                <div className="h-10 bg-surface animate-pulse border-2 border-ink" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {savedNotes.map((note) => (
                  <div key={note.id} className="border-2 border-ink p-3 bg-surface hover:bg-surfaceHover flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[9px] font-extrabold bg-ink text-paper px-2 py-0.5 border border-ink mb-1 inline-block">
                          {note.courseCode}
                        </span>
                        <button 
                          onClick={() => deleteNote(note.id)}
                          className="text-inkLight hover:text-terracotta font-mono text-[10px] font-bold"
                          title="Delete notes"
                        >
                          [X]
                        </button>
                      </div>
                      <h4 className="font-bold text-xs leading-snug line-clamp-2">{note.title}</h4>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-inkFaint border-dashed">
                      <span className="font-mono text-[9px] text-inkLight flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> NOTES.MD
                      </span>
                      <button 
                        onClick={() => readNote(note)}
                        className="font-mono text-[10px] text-sage hover:underline flex items-center gap-1 font-bold"
                      >
                        <Eye className="h-3 w-3" /> READ
                      </button>
                    </div>
                  </div>
                ))}

                {savedNotes.length === 0 && (
                  <div className="text-center font-mono text-xs text-inkLight py-8 border-2 border-dashed border-inkFaint bg-surface/50">
                    NO NOTES FOUND. RECORD OR PROCESS SESSION AUDIO TO GENERATE THEM.
                  </div>
                )}
              </div>
            )}
          </BrutalCard>
        </div>

      </div>

      {/* Markdown Notes Viewer Modal */}
      {activeNoteContent && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <BrutalCard className="bg-paper border-4 border-ink w-full max-w-3xl max-h-[85vh] flex flex-col shadow-brutal-accent">
            <div className="flex items-center justify-between border-b-4 border-ink p-4 bg-sageLight/10 shrink-0">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight">{activeNoteTitle}</h2>
              <button 
                onClick={() => {
                  setActiveNoteContent(null);
                  setActiveNoteTitle("");
                }} 
                className="font-mono text-sm font-extrabold hover:text-terracotta border-2 border-ink px-2 py-0.5 bg-surface hover:-translate-x-[1px] hover:-translate-y-[1px]"
              >
                [CLOSE]
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed space-y-4 bg-paper whitespace-pre-wrap select-text">
              {activeNoteContent}
            </div>

            <div className="border-t-4 border-ink p-4 bg-surface shrink-0 flex justify-end">
              <BrutalButton variant="primary" onClick={() => {
                setActiveNoteContent(null);
                setActiveNoteTitle("");
              }}>
                DISMISS
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      )}

    </div>
  );
}
