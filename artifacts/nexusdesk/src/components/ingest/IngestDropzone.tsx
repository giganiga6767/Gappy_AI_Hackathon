import { useState, useEffect } from "react";
import { useIngestText } from "@workspace/api-client-react";
import type { IngestResult } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalButton } from "../shared/BrutalButton";
import { BrutalBadge } from "../shared/BrutalBadge";
import { FileText, Upload, Sparkles, Eye, EyeOff, X, AlertCircle, Image as ImageIcon } from "lucide-react";

export function IngestDropzone() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);
  
  // Settings / Ingest configuration
  const [provider, setProvider] = useState<"ollama" | "antigravity">(() => {
    return (localStorage.getItem("nexusdesk_llm_provider") as any) || "ollama";
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("nexusdesk_gemini_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  
  // File and Ingest parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null); // base64 data url for images

  useEffect(() => {
    localStorage.setItem("nexusdesk_llm_provider", provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem("nexusdesk_gemini_api_key", apiKey);
  }, [apiKey]);

  const ingest = useIngestText({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        if (data.success) {
          setText("");
          setFileName(null);
          setImage(null);
        }
      },
      onError: (error: any) => {
        setResult({
          success: false,
          action: "ERROR",
          recordsCreated: 0,
          error: error.message || "Failed to ingest data"
        });
      }
    }
  });

  const handleParsePdf = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    setImage(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF.js library is not yet loaded in your browser. Please try again in a few seconds.");
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
          throw new Error("PDF was parsed but no text was extracted (might be scanned images).");
        }

        setText((prev) => {
          const newText = extractedText.trim();
          return prev ? prev + "\n\n" + newText : newText;
        });
      } catch (err: any) {
        console.error("PDF parse error:", err);
        setParseError(err.message || "Failed to parse PDF file.");
        setFileName(null);
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
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      setIsParsing(false);
    };
    reader.onerror = () => {
      setParseError("Image reading failed.");
      setIsParsing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
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
        setText((prev) => prev ? prev + "\n\n" + textVal : textVal);
        setFileName(file.name);
        setImage(null);
        setIsParsing(false);
      };
      reader.readAsText(file);
    } else {
      setParseError("Only PDF, TXT, and Image (PNG, JPG, WEBP) files are supported.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !image) return;
    
    setResult(null);
    ingest.mutate({
      data: {
        rawText: text,
        provider,
        apiKey: provider === "antigravity" ? apiKey : undefined,
        scanMode: "universal",
        image: image || undefined
      }
    });
  };

  const handleClear = () => {
    setText("");
    setFileName(null);
    setImage(null);
    setParseError(null);
  };

  return (
    <div className="space-y-6">
      {/* LLM & API Configuration Panel */}
      <BrutalCard className="p-4 bg-surface border-2 border-ink">
        <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-terracotta" /> LLM COGNITIVE ENGINE CONFIG
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block font-mono text-xs font-bold text-inkLight">PROVIDER SELECTION</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProvider("ollama")}
                className={`flex-1 font-mono text-xs font-bold py-2 border-2 border-ink transition-all duration-100 ${
                  provider === "ollama"
                    ? "bg-sage text-paper shadow-brutal-sm -translate-x-[2px] -translate-y-[2px]"
                    : "bg-paper text-ink hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                OLLAMA (LOCAL llama3)
              </button>
              <button
                type="button"
                onClick={() => setProvider("antigravity")}
                className={`flex-1 font-mono text-xs font-bold py-2 border-2 border-ink transition-all duration-100 ${
                  provider === "antigravity"
                    ? "bg-terracotta text-paper shadow-brutal-sm -translate-x-[2px] -translate-y-[2px]"
                    : "bg-paper text-ink hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                ANTIGRAVITY (GEMINI CLOUD)
              </button>
            </div>
            <p className="font-mono text-[10px] text-inkLight leading-normal">
              {provider === "ollama" 
                ? "Processes text locally via 'llama3'. Image uploads switch models automatically to 'llama3.2-vision' for visual scans."
                : "Antigravity uses high-speed Gemini 2.5 Flash. Full text + visual multimodal support."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-xs font-bold text-inkLight">
              {provider === "antigravity" ? "GEMINI DEVELOPER API KEY" : "LOCAL ENDPOINT (READ-ONLY)"}
            </label>
            {provider === "antigravity" ? (
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full border-2 border-ink bg-paper p-2 pr-10 focus:outline-none focus:bg-surface font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-2.5 text-inkLight hover:text-ink"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <input
                type="text"
                disabled
                value="http://localhost:11434"
                className="w-full border-2 border-ink bg-surfaceHover p-2 focus:outline-none font-mono text-sm text-inkLight cursor-not-allowed"
              />
            )}
            <p className="font-mono text-[10px] text-inkLight leading-normal">
              {provider === "antigravity"
                ? "Your API key is saved locally in your browser cache. Never share this key."
                : "Endpoint URL specified in your system environment configuration."}
            </p>
          </div>
        </div>
      </BrutalCard>

      {/* Main Drag & Drop / Input area */}
      <BrutalCard className="p-0 overflow-hidden bg-surface">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="p-4 border-b-2 border-ink flex justify-between items-center bg-surface">
            <h3 className="section-label mb-0 border-none pb-0">DOCUMENT INGEST DROPZONE</h3>
            <div className="flex gap-2">
              <BrutalBadge variant={provider === "antigravity" ? "terracotta" : "sage"}>
                {provider === "antigravity" ? "ANTIGRAVITY PRO" : "LOCAL OLLAMA"}
              </BrutalBadge>
            </div>
          </div>

          {/* Drag & Drop Overlay/Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-6 border-b-2 border-ink border-dashed flex flex-col items-center justify-center text-center transition-colors duration-150 relative cursor-pointer ${
              isDragOver 
                ? "bg-terracottaLight/30 text-ink border-terracotta" 
                : "bg-paper/50 hover:bg-paper/80 text-inkLight"
            }`}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {isParsing ? (
              <div className="space-y-2 py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ink mx-auto" />
                <p className="font-mono text-xs font-bold text-ink">READING UPLOADED FILE...</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="p-3 bg-surface border-2 border-ink inline-block shadow-brutal-sm hover:-translate-x-[1px] hover:-translate-y-[1px]">
                  <Upload className="h-6 w-6 text-ink" />
                </div>
                <p className="font-mono text-xs font-bold text-ink">
                  DRAG & DROP TIMETABLE / CALENDAR (PDF, TXT, JPG, PNG)
                </p>
                <p className="font-mono text-[10px]">
                  Or click here to browse files. Timetables can be text documents, screenshots, or PDF files.
                </p>
              </div>
            )}
          </div>

          {/* Ingest Error Display */}
          {parseError && (
            <div className="p-3 bg-terracottaLight/20 text-terracotta border-b-2 border-ink flex items-center gap-2 font-mono text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{parseError}</span>
              <button type="button" className="ml-auto" onClick={() => setParseError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Filename status bar */}
          {fileName && (
            <div className="p-2 px-4 bg-sageLight/30 text-sageDark border-b-2 border-ink flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                {image ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="font-bold">{fileName.toUpperCase()}</span>
                <span>({image ? "IMAGE ATTACHED" : "TEXT EXTRACTED"})</span>
              </div>
              <button 
                type="button" 
                onClick={handleClear}
                className="hover:bg-sageLight/50 p-0.5 border border-ink shadow-brutal-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Image Thumbnail Preview Block */}
          {image && (
            <div className="p-4 border-b-2 border-ink bg-paper/50 flex flex-col items-center">
              <span className="font-mono text-[10px] font-bold text-inkLight block mb-2 align-self-start">IMAGE PREVIEW</span>
              <div className="border-4 border-ink shadow-brutal max-w-md overflow-hidden bg-paper relative group">
                <img src={image} alt="Ingest preview" className="max-h-[200px] object-contain" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setFileName(null); }}
                  className="absolute top-2 right-2 bg-paper hover:bg-terracottaLight border-2 border-ink p-1 shadow-brutal-sm"
                >
                  <X className="h-3 w-3 text-ink" />
                </button>
              </div>
            </div>
          )}

          {/* Text Editor area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={image ? "Optional: Add extra context or specify custom instructions alongside your image timetable..." : "Document text will appear here automatically when parsed, or you can paste syllabus text, timetable raw copy, natural language notes, and holidays lists directly here..."}
            className="h-[200px] p-4 bg-paper font-mono text-sm resize-y focus:outline-none placeholder:text-inkFaint border-none"
            disabled={ingest.isPending || isParsing}
          />
          
          {/* Submit footer */}
          <div className="p-4 border-t-2 border-ink bg-surface flex justify-between items-center">
            <div className="font-mono text-xs text-inkLight flex gap-4">
              <span>{text.length} CHARACTERS</span>
              {(text.trim() || image) && (
                <button 
                  type="button" 
                  onClick={handleClear} 
                  className="font-bold underline text-terracotta hover:text-ink"
                >
                  CLEAR ALL
                </button>
              )}
            </div>
            <BrutalButton 
              type="submit" 
              variant="primary"
              disabled={ingest.isPending || isParsing || (!text.trim() && !image)}
              className="px-6 flex items-center gap-2"
            >
              {ingest.isPending ? "COGNITIVE SCAN IN PROGRESS..." : "UNIVERSAL SCAN & POPULATE"}
            </BrutalButton>
          </div>
        </form>
      </BrutalCard>

      {/* Results Card */}
      {result && (
        <BrutalCard className={result.success ? "border-sage bg-sageLight/20 shadow-brutal-sage" : "border-terracotta bg-terracottaLight/20 shadow-brutal-accent"}>
          <h3 className="section-label mb-4">COGNITIVE ENGINE INGESTION SUMMARY</h3>
          
          <div className="flex items-center gap-4 mb-4">
            <div className={`font-heading text-2xl font-bold ${result.success ? 'text-sage' : 'text-terracotta'}`}>
              {result.success ? "SUCCESS" : "FAILED"}
            </div>
            <BrutalBadge variant={result.success ? "sage" : "terracotta"}>
              {result.action}
            </BrutalBadge>
          </div>

          <div className="space-y-3 font-mono text-sm">
            <div className="flex border-b-2 border-ink border-dashed pb-2">
              <span className="w-48 font-bold text-inkLight">RECORDS CREATED / SYNCED</span>
              <span className="font-bold">{result.recordsCreated}</span>
            </div>
            {result.confidence && (
              <div className="flex border-b-2 border-ink border-dashed pb-2">
                <span className="w-48 font-bold text-inkLight">PARSER CONFIDENCE</span>
                <span>{(result.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
            {result.error && (
              <div className="p-3 bg-terracottaLight/30 border-2 border-ink text-terracotta font-bold">
                <span className="block text-xs uppercase tracking-wider mb-1">Error Message</span>
                <span>{result.error}</span>
              </div>
            )}
            {result.preview && Object.keys(result.preview).length > 0 && (
              <div className="pt-2">
                <span className="font-bold text-inkLight block mb-2">EXTRACTED STRUCTURAL ENTITIES</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                  
                  {/* Semester Info */}
                  {(result.preview as any).semester && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Semester Created</span>
                      <div className="mt-1 space-y-1">
                        <div>Name: <span className="font-bold">{(result.preview as any).semester.name}</span></div>
                        <div>Range: <span>{(result.preview as any).semester.startDate} to {(result.preview as any).semester.endDate}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Courses parsed */}
                  {(result.preview as any).courses && (result.preview as any).courses.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Courses Identified ({(result.preview as any).courses.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {(result.preview as any).courses.map((c: any, index: number) => (
                          <li key={index} className="truncate">
                            <span className="font-bold">{c.subjectCode}</span>: {c.name} {c.roomNumber && `(${c.roomNumber})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Schedules parsed */}
                  {(result.preview as any).schedules && (result.preview as any).schedules.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Timetable Classes ({(result.preview as any).schedules.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {(result.preview as any).schedules.map((s: any, index: number) => (
                          <li key={index} className="truncate">
                            Day {s.dayOfWeek}: <span className="font-bold">{s.subjectCode || s.title}</span> ({s.startHour.toString().padStart(2, '0')}:{s.startMinute.toString().padStart(2, '0')})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Holidays/Exams Calendar events parsed */}
                  {(result.preview as any).calendarEvents && (result.preview as any).calendarEvents.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Academic Events ({(result.preview as any).calendarEvents.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {(result.preview as any).calendarEvents.map((e: any, index: number) => (
                          <li key={index} className="truncate text-terracotta">
                            <span className="font-bold">[{e.type}]</span> {e.title} ({e.startDate})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tasks parsed */}
                  {(result.preview as any).tasks && (result.preview as any).tasks.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Action Items/Tasks ({(result.preview as any).tasks.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {(result.preview as any).tasks.map((t: any, index: number) => (
                          <li key={index} className="truncate">
                            <span className="font-bold">[{t.priority}]</span> {t.title} {t.dueDate && `(Due ${t.dueDate})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mutation parsed */}
                  {(result.preview as any).mutation && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs col-span-1 md:col-span-2">
                      <span className="font-bold block border-b border-ink pb-1 uppercase text-amber-600">⚡ SCHEDULE MUTATION APPLIED</span>
                      <div className="mt-2 space-y-1 font-mono text-ink text-xs">
                        <div>Action: <span className="font-bold">{(result.preview as any).mutation.action}</span></div>
                        {(result.preview as any).mutation.subjectCode && (
                          <div>Course: <span className="font-bold">{(result.preview as any).mutation.subjectCode}</span></div>
                        )}
                        {(result.preview as any).mutation.date && (
                          <div>Target Date: <span>{(result.preview as any).mutation.date}</span></div>
                        )}
                        {(result.preview as any).mutation.attendanceStatus && (
                          <div>Attendance Status: <span className="font-bold text-sage">{(result.preview as any).mutation.attendanceStatus}</span></div>
                        )}
                        {(result.preview as any).mutation.taskTitle && (
                          <div>Task to Complete: <span className="font-bold text-terracotta">{(result.preview as any).mutation.taskTitle}</span></div>
                        )}
                        {(result.preview as any).mutation.holidayTitle && (
                          <div>Holiday Title: <span className="font-bold text-terracotta">{(result.preview as any).mutation.holidayTitle}</span></div>
                        )}
                        {(result.preview as any).mutation.newDate && (
                          <div>Rescheduled to: <span className="font-bold">{(result.preview as any).mutation.newDate} at {(result.preview as any).mutation.newStartTime || "9:00"}</span></div>
                        )}
                        {(result.preview as any).mutation.cancellationNote && (
                          <div>Note: <span className="italic text-inkLight">{(result.preview as any).mutation.cancellationNote}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </BrutalCard>
      )}
    </div>
  );
}
