import { useState, useEffect } from "react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameDay, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  isSameMonth 
} from "date-fns";
import { 
  useListEvents, 
  useCreateEvent, 
  useDeleteEvent,
  useListCourses,
  useIngestText,
  useGetActiveSemester
} from "@workspace/api-client-react";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  Sparkles, 
  User, 
  X, 
  Upload, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon,
  Eye,
  EyeOff
} from "lucide-react";

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK">("MONTH");
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  // Add Event Form State
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState("PERSONAL");
  const [addLocation, setAddLocation] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addStartTime, setAddStartTime] = useState("09:00");
  const [addEndTime, setAddEndTime] = useState("10:00");
  const [addCourseId, setAddCourseId] = useState("");

  const { data: courses = [] } = useListCourses();
  const { data: activeSemester } = useGetActiveSemester();

  useEffect(() => {
    if (activeSemester?.startDate) {
      const semStart = new Date(activeSemester.startDate);
      if (currentDate.getMonth() !== semStart.getMonth() || currentDate.getFullYear() !== semStart.getFullYear()) {
        setCurrentDate(semStart);
      }
    }
  }, [activeSemester]);

  // Ingest Uploader Modal Form States
  const [ingestProvider, setIngestProvider] = useState<"ollama" | "antigravity">(() => {
    return (localStorage.getItem("nexusdesk_llm_provider") as any) || "ollama";
  });
  const [ingestApiKey, setIngestApiKey] = useState(() => {
    return localStorage.getItem("nexusdesk_gemini_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [ingestFileName, setIngestFileName] = useState<string | null>(null);
  const [ingestImage, setIngestImage] = useState<string | null>(null);
  
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem("nexusdesk_llm_provider", ingestProvider);
  }, [ingestProvider]);

  useEffect(() => {
    localStorage.setItem("nexusdesk_gemini_api_key", ingestApiKey);
  }, [ingestApiKey]);

  // Date boundaries for Weekly View
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  
  // Date boundaries for Monthly View
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday end

  // Define dates for query
  const queryStart = viewMode === "MONTH" ? gridStart : weekDays[0];
  const queryEnd = viewMode === "MONTH" ? gridEnd : weekDays[6];

  const startDateStr = format(queryStart, "yyyy-MM-dd");
  const endDateStr = format(queryEnd, "yyyy-MM-dd");

  const { data: events = [], isLoading, refetch } = useListEvents({ 
    startDate: startDateStr, 
    endDate: endDateStr 
  });

  const createEventMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        refetch();
        setIsAddOpen(false);
        resetAddForm();
      },
      onError: (err: any) => {
        alert("Failed to create event: " + (err.message || err));
      }
    }
  });

  const deleteEventMutation = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        refetch();
        setIsDetailOpen(false);
        setSelectedEvent(null);
      },
      onError: (err: any) => {
        alert("Failed to delete event: " + (err.message || err));
      }
    }
  });

  const runIngestMutation = useIngestText({
    mutation: {
      onSuccess: (data: any) => {
        setIngestResult(data);
        if (data.success) {
          setIngestText("");
          setIngestFileName(null);
          setIngestImage(null);
          
          if (data.preview?.semester?.startDate) {
            setCurrentDate(new Date(data.preview.semester.startDate));
          }
          
          refetch(); // Reload calendar grid to show AI parsed events!
        }
      },
      onError: (error: any) => {
        setIngestResult({
          success: false,
          action: "ERROR",
          recordsCreated: 0,
          error: error.message || "Failed to parse document"
        });
      }
    }
  });

  const resetAddForm = () => {
    setAddTitle("");
    setAddType("PERSONAL");
    setAddLocation("");
    setAddDate("");
    setAddStartTime("09:00");
    setAddEndTime("10:00");
    setAddCourseId("");
  };

  const resetIngestForm = () => {
    setIngestText("");
    setIngestFileName(null);
    setIngestImage(null);
    setParseError(null);
    setIngestResult(null);
  };

  const handlePrev = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(addMonths(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, -7));
    }
  };

  const handleNext = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openAddModal = (day: Date) => {
    setSelectedDay(day);
    setAddDate(format(day, "yyyy-MM-dd"));
    setIsAddOpen(true);
  };

  const openDetailModal = (event: any) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim() || !addDate) return;

    const startDateTime = new Date(`${addDate}T${addStartTime}:00`);
    const endDateTime = new Date(`${addDate}T${addEndTime}:00`);

    createEventMutation.mutate({
      data: {
        title: addTitle,
        type: addType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: addLocation || undefined,
        courseId: addCourseId || undefined,
      }
    });
  };

  const handleDeleteClick = (eventId: string) => {
    if (confirm("Are you sure you want to delete/remove this event?")) {
      deleteEventMutation.mutate({ eventId });
    }
  };

  // Ingest Uploader Processing
  const handleParsePdf = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setIngestFileName(file.name);
    setIngestImage(null);
    setIngestResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF.js library is not loaded. Check internet connection.");
        }
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let extractedText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          extractedText += pageText + "\n";
        }

        if (!extractedText.trim()) {
          throw new Error("Diagnostic: PDF has no digital text stream. This is a scanned image PDF. Please upload a screenshot (PNG/JPG) of the calendar instead so the vision AI can parse it!");
        }

        setIngestText((prev) => {
          const newText = extractedText.trim();
          return prev ? prev + "\n\n" + newText : newText;
        });
      } catch (err: any) {
        console.error("PDF parse error:", err);
        setParseError(err.message || "Failed to parse PDF file.");
        setIngestFileName(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError("File reading failed.");
      setIsParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleParseImage = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setIngestFileName(file.name);
    setIngestResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setIngestImage(dataUrl);
      setIsParsing(false);
    };
    reader.onerror = () => {
      setParseError("Image reading failed.");
      setIsParsing(false);
    };
    reader.readAsDataURL(file);
  };

  const processUploadedFile = (file: File) => {
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
    const isText = file.type === "text/plain" || file.name.endsWith(".txt");

    if (isPDF) {
      handleParsePdf(file);
    } else if (isImage) {
      handleParseImage(file);
    } else if (isText) {
      setIsParsing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const textVal = event.target?.result as string;
        setIngestText((prev) => prev ? prev + "\n\n" + textVal : textVal);
        setIngestFileName(file.name);
        setIngestImage(null);
        setIsParsing(false);
      };
      reader.readAsText(file);
    } else {
      setParseError("Supported files: PDF, TXT, PNG, JPG, WEBP.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    processUploadedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processUploadedFile(file);
  };

  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestText.trim() && !ingestImage) return;

    setIngestResult(null);
    runIngestMutation.mutate({
      data: {
        rawText: ingestText,
        provider: ingestProvider,
        apiKey: ingestProvider === "antigravity" ? ingestApiKey : undefined,
        scanMode: "universal",
        image: ingestImage || undefined
      }
    });
  };

  // Generate monthly days list
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Exams count within loaded dates
  const exams = events.filter(e => e.type === 'EXAM');

  // Utility to determine if event is AI Ingested
  const isAIEvent = (event: any) => {
    return event.isRecurring || event.type === 'BREAK' || event.type === 'EXAM';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-full space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b-4 border-ink pb-4 gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">PLANNER & CALENDAR</h1>
          <p className="font-mono text-sm text-inkLight mt-1">
            {viewMode === "MONTH" ? "MONTHLY_GRID" : "WEEKLY_TIMELINE"} // {format(currentDate, "MMMM yyyy").toUpperCase()}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* AI calendar ingestion toggle */}
          <BrutalButton 
            onClick={() => setIsIngestOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-terracottaLight text-terracottaDark"
          >
            <Sparkles className="h-4 w-4" /> AI SCAN CALENDAR
          </BrutalButton>

          {/* View Toggles */}
          <div className="flex border-2 border-ink p-1 bg-surface shadow-brutal-sm">
            <button
              onClick={() => setViewMode("MONTH")}
              className={`px-3 py-1 font-mono text-xs font-bold transition-all ${
                viewMode === "MONTH" ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-surfaceHover"
              }`}
            >
              <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> MONTH</span>
            </button>
            <button
              onClick={() => setViewMode("WEEK")}
              className={`px-3 py-1 font-mono text-xs font-bold transition-all ${
                viewMode === "WEEK" ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-surfaceHover"
              }`}
            >
              <span className="flex items-center gap-1.5"><List className="h-3.5 w-3.5" /> WEEK</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            <BrutalButton onClick={handlePrev} className="px-3 py-1.5">{"<"}</BrutalButton>
            <BrutalButton onClick={handleToday} className="px-4 py-1.5 font-mono text-xs">TODAY</BrutalButton>
            <BrutalButton onClick={handleNext} className="px-3 py-1.5">{">"}</BrutalButton>
          </div>

          <BrutalButton 
            variant="primary" 
            onClick={() => openAddModal(new Date())} 
            className="flex items-center gap-1.5 px-4 py-1.5"
          >
            <Plus className="h-4 w-4" /> MARK DOWN EVENT
          </BrutalButton>
        </div>
      </div>

      {/* Countdown Bar for Exams */}
      {exams.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 shrink-0">
          {exams.slice(0, 8).map(exam => {
            const daysLeft = differenceInDays(new Date(exam.startTime), new Date());
            return (
              <div 
                key={exam.id} 
                onClick={() => openDetailModal(exam)}
                className="font-mono text-xs font-bold border-2 border-ink bg-terracottaLight hover:-translate-y-0.5 hover:shadow-brutal-sm cursor-pointer px-3 py-1 whitespace-nowrap transition-all duration-100"
              >
                <span className="text-terracottaDark mr-2">🚨 {exam.courseShortName || 'EXAM'}:</span>
                <span className="text-ink">{exam.title}</span>
                <span className="ml-2 bg-paper border border-ink px-1 text-[10px]">
                  {daysLeft === 0 ? "TODAY" : daysLeft > 0 ? `IN ${daysLeft} DAYS` : "PASSED"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly Calendar View */}
      {viewMode === "MONTH" ? (
        <div className="flex-1 min-h-[600px] border-2 border-ink flex flex-col bg-surface shadow-brutal overflow-hidden">
          {/* Days of Week labels */}
          <div className="grid grid-cols-7 border-b-2 border-ink bg-surface font-mono text-xs font-bold text-center py-2 text-inkLight">
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div className="text-terracotta">SAT</div>
            <div className="text-terracotta">SUN</div>
          </div>

          {/* Month Day Grid */}
          <div className="grid grid-cols-7 flex-1 bg-ink gap-[2px]">
            {monthDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day))
                                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
              
              return (
                <div 
                  key={i} 
                  onClick={() => openAddModal(day)}
                  className={`min-h-[100px] p-1 flex flex-col transition-colors cursor-pointer group ${
                    isToday 
                      ? "bg-paper border-2 border-ink z-10 shadow-brutal-sm" 
                      : isCurrentMonth 
                        ? "bg-paper hover:bg-surfaceHover/50" 
                        : "bg-surfaceHover/30 text-inkLight"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between p-1 font-mono">
                    <span className={`text-xs font-bold ${
                      isToday 
                        ? "bg-ink text-paper px-1.5 py-0.5 rounded-none font-extrabold" 
                        : isCurrentMonth ? "text-ink" : "text-inkLight/50"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold text-inkLight opacity-0 group-hover:opacity-100">
                        {dayEvents.length} EV
                      </span>
                    )}
                  </div>

                  {/* Day Events List */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] p-0.5">
                    {dayEvents.slice(0, 3).map(event => {
                      const isAI = isAIEvent(event);
                      let themeClass = "bg-surface text-ink border-inkLight/40";
                      if (event.type === "EXAM") themeClass = "bg-terracottaLight text-terracottaDark border-terracotta";
                      if (event.type === "LAB") themeClass = "bg-sageLight text-sageDark border-sage";
                      if (event.type === "BREAK") themeClass = "bg-amberLight text-amber border-amber";

                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(event);
                          }}
                          className={`px-1.5 py-0.5 border text-[10px] leading-tight flex items-center justify-between font-mono truncate hover:shadow-brutal-sm transition-all duration-75 ${themeClass}`}
                        >
                          <span className="truncate font-bold">{event.title}</span>
                          {isAI ? (
                            <span title="AI Ingested" className="shrink-0 ml-1"><Sparkles className="h-2.5 w-2.5 text-inkLight" /></span>
                          ) : (
                            <span title="User Added" className="shrink-0 ml-1"><User className="h-2.5 w-2.5 text-inkLight" /></span>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] font-mono font-bold text-center text-inkLight">
                        + {dayEvents.length - 3} MORE
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Weekly View */
        <div className="flex-1 min-h-[600px] border-2 border-ink flex overflow-x-auto bg-surface shadow-brutal">
          {weekDays.map((day, i) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day))
                                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            
            const hasExam = dayEvents.some(e => e.type === 'EXAM');
            const hasLab = dayEvents.some(e => e.type === 'LAB');
            
            const bgClass = hasExam ? "bg-terracottaLight/30" : hasLab ? "bg-sageLight/30" : "bg-paper";
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={i} 
                onClick={() => openAddModal(day)}
                className={`flex-1 min-w-[200px] border-r-2 border-ink last:border-r-0 flex flex-col cursor-pointer hover:bg-surfaceHover/20 ${bgClass}`}
              >
                <div className={`p-3 border-b-2 border-ink text-center ${isToday ? 'bg-ink text-paper' : 'bg-surface'}`}>
                  <div className="font-mono text-[10px] font-bold tracking-widest">{format(day, "EEEE").toUpperCase()}</div>
                  <div className="font-heading text-2xl font-bold mt-1">{format(day, "dd")}</div>
                </div>
                
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {isLoading ? (
                    <div className="h-20 bg-surface/50 animate-pulse border-2 border-ink"></div>
                  ) : dayEvents.length > 0 ? (
                    dayEvents.map(event => {
                      const isAI = isAIEvent(event);
                      return (
                        <div 
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(event);
                          }}
                          className={`p-2 border-2 border-ink text-xs transition-all duration-75 hover:shadow-brutal-sm ${
                            event.type === 'EXAM' 
                              ? 'bg-terracotta text-paper border-terracottaDark' 
                              : event.type === 'LAB'
                                ? 'bg-sageLight text-sageDark border-sage'
                                : 'bg-surface hover:bg-surfaceHover'
                          }`}
                        >
                          <div className="font-mono text-[9px] font-bold mb-1 opacity-80 flex items-center justify-between">
                            <span>
                              {format(new Date(event.startTime), "HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
                            </span>
                            {isAI ? (
                              <span title="AI Ingested" className="shrink-0"><Sparkles className="h-3 w-3" /></span>
                            ) : (
                              <span title="User Added" className="shrink-0"><User className="h-3 w-3" /></span>
                            )}
                          </div>
                          <div className="font-bold leading-tight line-clamp-2">{event.title}</div>
                          {event.location && (
                            <div className="font-mono text-[9px] mt-1 opacity-70 truncate flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center font-mono text-[10px] text-inkLight border-2 border-dashed border-inkFaint opacity-30 m-2">
                      FREE (CLICK TO ADD)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: MARK DOWN EVENT (Add Event) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setIsAddOpen(false); resetAddForm(); }}>
          <BrutalCard className="w-full max-w-md bg-paper border-4 border-ink shadow-brutal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b-2 border-ink p-4 bg-surface">
              <h3 className="font-heading text-xl font-bold flex items-center gap-1.5">
                <CalendarIcon className="h-5 w-5 text-terracotta" /> MARK DOWN EVENT
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); resetAddForm(); }}
                className="p-1 hover:bg-surfaceHover border-2 border-ink shadow-brutal-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-4 font-mono text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-inkLight">EVENT TITLE</label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. EC302 Lab Exam or Study Session"
                  className="w-full border-2 border-ink bg-paper p-2 focus:outline-none focus:bg-surface font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-inkLight">EVENT TYPE</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full border-2 border-ink bg-paper p-2 focus:outline-none font-mono"
                  >
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="EXAM">EXAM</option>
                    <option value="LECTURE">LECTURE</option>
                    <option value="LAB">LAB</option>
                    <option value="TUTORIAL">TUTORIAL</option>
                    <option value="MEETING">MEETING</option>
                    <option value="BREAK">BREAK</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-inkLight">LINKED COURSE</label>
                  <select
                    value={addCourseId}
                    onChange={(e) => setAddCourseId(e.target.value)}
                    className="w-full border-2 border-ink bg-paper p-2 focus:outline-none font-mono"
                  >
                    <option value="">NONE / OPTIONAL</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.shortName} - {course.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-inkLight">LOCATION / ROOM</label>
                <input
                  type="text"
                  value={addLocation}
                  onChange={(e) => setAddLocation(e.target.value)}
                  placeholder="e.g. Room 204 or ECE Seminar Hall"
                  className="w-full border-2 border-ink bg-paper p-2 focus:outline-none focus:bg-surface font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-inkLight">DATE</label>
                <input
                  type="date"
                  required
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full border-2 border-ink bg-paper p-2 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-inkLight">START TIME</label>
                  <input
                    type="time"
                    required
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    className="w-full border-2 border-ink bg-paper p-2 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-inkLight">END TIME</label>
                  <input
                    type="time"
                    required
                    value={addEndTime}
                    onChange={(e) => setAddEndTime(e.target.value)}
                    className="w-full border-2 border-ink bg-paper p-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <BrutalButton 
                  type="button" 
                  onClick={() => { setIsAddOpen(false); resetAddForm(); }} 
                  className="flex-1"
                >
                  CANCEL
                </BrutalButton>
                <BrutalButton 
                  type="submit" 
                  variant="primary" 
                  className="flex-1"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? "SAVING..." : "MARK DOWN"}
                </BrutalButton>
              </div>
            </form>
          </BrutalCard>
        </div>
      )}

      {/* MODAL 2: EVENT DETAILS */}
      {isDetailOpen && selectedEvent && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setIsDetailOpen(false); setSelectedEvent(null); }}>
          <BrutalCard className="w-full max-w-md bg-paper border-4 border-ink shadow-brutal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b-2 border-ink p-4 bg-surface">
              <div className="flex items-center gap-2">
                <BrutalBadge variant={
                  selectedEvent.type === "EXAM" ? "terracotta" :
                  selectedEvent.type === "LAB" ? "sage" :
                  selectedEvent.type === "BREAK" ? "amber" : "default"
                }>
                  {selectedEvent.type}
                </BrutalBadge>
                {isAIEvent(selectedEvent) ? (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-sage">
                    <Sparkles className="h-3 w-3" /> AI INGESTED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-inkLight">
                    <User className="h-3 w-3" /> MANUAL EVENT
                  </span>
                )}
              </div>
              <button 
                onClick={() => { setIsDetailOpen(false); setSelectedEvent(null); }}
                className="p-1 hover:bg-surfaceHover border-2 border-ink shadow-brutal-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 font-mono text-sm">
              <div>
                <h4 className="text-xs font-bold text-inkLight uppercase">Event Title</h4>
                <p className="text-lg font-bold text-ink">{selectedEvent.title}</p>
              </div>

              {selectedEvent.courseShortName && (
                <div>
                  <h4 className="text-xs font-bold text-inkLight uppercase">Associated Course</h4>
                  <p className="font-bold text-ink">{selectedEvent.courseShortName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-inkLight uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time Schedule
                  </h4>
                  <div className="text-xs font-bold text-ink mt-0.5">
                    {format(new Date(selectedEvent.startTime), "MMM dd, yyyy")}
                    <span className="block text-[10px] text-inkLight mt-0.5">
                      {format(new Date(selectedEvent.startTime), "HH:mm")} - {format(new Date(selectedEvent.endTime), "HH:mm")}
                    </span>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <h4 className="text-xs font-bold text-inkLight uppercase flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </h4>
                    <p className="text-xs font-bold text-ink mt-0.5 truncate">{selectedEvent.location}</p>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <h4 className="text-xs font-bold text-inkLight uppercase">Description</h4>
                  <p className="text-xs text-ink bg-surface border border-ink/40 p-2 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-ink/20 flex gap-2">
                <BrutalButton 
                  onClick={() => handleDeleteClick(selectedEvent.id)}
                  className="flex-1 border-terracotta text-terracotta hover:bg-terracottaLight/30 flex items-center justify-center gap-1.5 py-2"
                  disabled={deleteEventMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" /> REMOVE EVENT
                </BrutalButton>
                <BrutalButton 
                  onClick={() => { setIsDetailOpen(false); setSelectedEvent(null); }}
                  className="flex-1 py-2"
                >
                  CLOSE
                </BrutalButton>
              </div>
            </div>
          </BrutalCard>
        </div>
      )}

      {/* MODAL 3: DIRECT AI SYNC CALENDAR FILE UPLOADER */}
      {isIngestOpen && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" onClick={() => { setIsIngestOpen(false); resetIngestForm(); }}>
          <BrutalCard className="w-full max-w-2xl bg-paper border-4 border-ink shadow-brutal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b-2 border-ink p-4 bg-surface">
              <h3 className="font-heading text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-terracotta animate-pulse" /> AI ACADEMIC CALENDAR SYNC
              </h3>
              <button 
                onClick={() => { setIsIngestOpen(false); resetIngestForm(); }}
                className="p-1 hover:bg-surfaceHover border-2 border-ink shadow-brutal-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Provider selection & API Key inside the calendar view */}
              <BrutalCard className="p-3 bg-surface border-2 border-ink text-xs font-mono">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-inkLight block">SELECT AI PARSER PROVIDER</span>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setIngestProvider("ollama")}
                        className={`flex-1 font-bold py-1.5 border-2 border-ink transition-all ${
                          ingestProvider === "ollama" ? "bg-sage text-paper shadow-brutal-sm -translate-x-[1px]" : "bg-paper text-ink"
                        }`}
                      >
                        OLLAMA (LOCAL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngestProvider("antigravity")}
                        className={`flex-1 font-bold py-1.5 border-2 border-ink transition-all ${
                          ingestProvider === "antigravity" ? "bg-terracotta text-paper shadow-brutal-sm -translate-x-[1px]" : "bg-paper text-ink"
                        }`}
                      >
                        ANTIGRAVITY (GEMINI)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-inkLight block">
                      {ingestProvider === "antigravity" ? "GEMINI DEVELOPER API KEY" : "LOCAL ENDPOINT"}
                    </span>
                    {ingestProvider === "antigravity" ? (
                      <div className="relative mt-1">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={ingestApiKey}
                          onChange={(e) => setIngestApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full border-2 border-ink bg-paper p-1.5 pr-8 focus:outline-none focus:bg-surface font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-2 text-inkLight hover:text-ink"
                        >
                          {showApiKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="http://localhost:11434"
                        className="w-full border-2 border-ink bg-surfaceHover p-1.5 font-mono text-inkLight cursor-not-allowed mt-1"
                      />
                    )}
                  </div>
                </div>
              </BrutalCard>

              {/* Ingestion Dropzone */}
              <form onSubmit={handleIngestSubmit} className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`p-6 border-b-2 border-ink border-dashed flex flex-col items-center justify-center text-center transition-colors duration-150 cursor-pointer ${
                    isDragOver ? "bg-terracottaLight/30 text-ink border-terracotta" : "bg-paper/50 hover:bg-paper/80 text-inkLight"
                  }`}
                  onClick={() => document.getElementById("calendar-file-upload")?.click()}
                >
                  <input
                    id="calendar-file-upload"
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {isParsing ? (
                    <div className="space-y-2 py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ink mx-auto" />
                      <p className="font-mono text-xs font-bold text-ink">READING FILE CONTENT...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-surface border-2 border-ink inline-block shadow-brutal-sm">
                        <Upload className="h-6 w-6 text-ink" />
                      </div>
                      <p className="font-mono text-xs font-bold text-ink">
                        DRAG & DROP TIMETABLE / ACADEMIC CALENDAR (PDF, TXT, PNG, JPG)
                      </p>
                      <p className="font-mono text-[10px]">
                        Scanned/Image PDFs: If your PDF contains scanned images, please upload a screenshot (PNG/JPG) of the calendar page directly instead!
                      </p>
                    </div>
                  )}
                </div>

                {/* Parse Error Display with Diagnostics */}
                {parseError && (
                  <div className="p-3 bg-terracottaLight/20 text-terracotta border-2 border-ink flex items-start gap-2 font-mono text-xs leading-relaxed">
                    <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block uppercase tracking-wider mb-0.5">Parse Warning</span>
                      <span>{parseError}</span>
                    </div>
                    <button type="button" onClick={() => setParseError(null)} className="p-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* File Attachment status bar */}
                {ingestFileName && (
                  <div className="p-2 px-3 bg-sageLight/30 text-sageDark border-2 border-ink flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      {ingestImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      <span className="font-bold truncate max-w-sm">{ingestFileName.toUpperCase()}</span>
                      <span>({ingestImage ? "IMAGE ATTACHED" : "TEXT EXTRACTED"})</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setIngestFileName(null); setIngestImage(null); }}
                      className="p-0.5 border border-ink shadow-brutal-sm hover:bg-sageLight/50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {ingestImage && (
                  <div className="p-2 border-2 border-ink bg-paper/50 flex flex-col items-center">
                    <span className="font-mono text-[9px] font-bold text-inkLight block mb-1">IMAGE ATTACHMENT PREVIEW</span>
                    <div className="border-2 border-ink max-h-[150px] overflow-hidden bg-paper relative">
                      <img src={ingestImage} alt="Ingest preview" className="max-h-[140px] object-contain" />
                    </div>
                  </div>
                )}

                {/* Optional Instructions Textbox */}
                <textarea
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  placeholder={ingestImage ? "Add custom context (e.g., 'Autumn semester starting July 2026', or 'Extract class timings only') or leave blank..." : "Add calendar details or syllabus items directly as text if you don't have a file..."}
                  className="w-full h-[100px] p-3 bg-paper font-mono text-xs border-2 border-ink focus:outline-none focus:bg-surface resize-none"
                  disabled={runIngestMutation.isPending || isParsing}
                />

                {/* Submit buttons */}
                <div className="flex justify-between items-center font-mono text-xs pt-2">
                  <span className="text-inkLight">{ingestText.length} CHARACTERS</span>
                  <div className="flex gap-2">
                    <BrutalButton 
                      type="button" 
                      onClick={() => { setIsIngestOpen(false); resetIngestForm(); }}
                    >
                      CLOSE
                    </BrutalButton>
                    <BrutalButton
                      type="submit"
                      variant="primary"
                      className="px-6 flex items-center gap-1.5"
                      disabled={runIngestMutation.isPending || isParsing || (!ingestText.trim() && !ingestImage)}
                    >
                      {runIngestMutation.isPending ? "PARSING TIMETABLE..." : "START AI SYNC"}
                    </BrutalButton>
                  </div>
                </div>
              </form>

              {/* Ingestion Sync Results */}
              {ingestResult && (
                <BrutalCard className={`p-4 border-2 ${ingestResult.success ? "border-sage bg-sageLight/10 shadow-brutal-sage" : "border-terracotta bg-terracottaLight/10 shadow-brutal-accent"}`}>
                  <h4 className="font-heading text-md font-bold uppercase tracking-wider mb-2">Ingestion Ingress Log</h4>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`font-mono font-bold text-sm ${ingestResult.success ? 'text-sage' : 'text-terracotta'}`}>
                      {ingestResult.success ? "SYNC SUCCESSFUL" : "SYNC FAILED"}
                    </span>
                    <BrutalBadge variant={ingestResult.success ? "sage" : "terracotta"}>
                      {ingestResult.action}
                    </BrutalBadge>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {ingestResult.recordsCreated > 0 && (
                      <div className="flex justify-between border-b border-ink/10 pb-1">
                        <span>Database Records Created:</span>
                        <span className="font-bold">{ingestResult.recordsCreated}</span>
                      </div>
                    )}
                    {ingestResult.error && (
                      <div className="p-2 border border-ink text-terracotta bg-paper font-bold leading-normal">
                        {ingestResult.error}
                      </div>
                    )}

                    {ingestResult.preview && Object.keys(ingestResult.preview).length > 0 && (
                      <div className="pt-2">
                        <span className="font-bold text-inkLight block mb-1">Entities Parsed:</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-paper p-2 border border-ink max-h-[150px] overflow-y-auto">
                          {ingestResult.preview.semester && (
                            <div>🎓 Semester: <span className="font-bold">{ingestResult.preview.semester.name}</span></div>
                          )}
                          {ingestResult.preview.courses?.length > 0 && (
                            <div>📚 Courses: <span className="font-bold">{ingestResult.preview.courses.length} items</span></div>
                          )}
                          {ingestResult.preview.schedules?.length > 0 && (
                            <div>🕒 Timetable: <span className="font-bold">{ingestResult.preview.schedules.length} periods</span></div>
                          )}
                          {ingestResult.preview.calendarEvents?.length > 0 && (
                            <div>📅 Calendar: <span className="font-bold">{ingestResult.preview.calendarEvents.length} events</span></div>
                          )}
                          {ingestResult.preview.tasks?.length > 0 && (
                            <div>📋 Tasks: <span className="font-bold">{ingestResult.preview.tasks.length} actions</span></div>
                          )}
                          {ingestResult.preview.mutation && (
                            <div className="col-span-2 text-amber-600 font-bold border-t border-ink/10 pt-1 mt-1">
                              ⚡ Schedule Mutation Applied: {ingestResult.preview.mutation.action}
                              {ingestResult.preview.mutation.subjectCode && ` (${ingestResult.preview.mutation.subjectCode})`}
                              {ingestResult.preview.mutation.date && ` on ${ingestResult.preview.mutation.date}`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </BrutalCard>
              )}

            </div>
          </BrutalCard>
        </div>
      )}
    </div>
  );
}
