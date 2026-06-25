import { useState } from "react";
import { useIngestText } from "@workspace/api-client-react";
import type { IngestResult } from "@workspace/api-client-react";
import { BrutalCard } from "../shared/BrutalCard";
import { BrutalButton } from "../shared/BrutalButton";
import { BrutalBadge } from "../shared/BrutalBadge";
import { FileText, Upload, Sparkles, X, AlertCircle, Image as ImageIcon, Play, BarChart2 } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getLLMSettings } from "@/components/settings/SettingsModal";

const CHART_COLORS = ["#C4614A", "#6B7F52", "#B8872A", "#4A5568", "#5A5A5A", "#7B5EA7"];

interface ChartData {
  type: "pie" | "bar";
  title: string;
  data: { name: string; value: number }[];
}

function parseExcelCSV(content: string | ArrayBuffer, isCSV: boolean): { markdown: string; charts: ChartData[] } {
  let csvText = "";
  if (typeof content === "string") {
    csvText = content;
  } else {
    csvText = new TextDecoder().decode(content);
  }

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { markdown: "", charts: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line =>
    line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
  ).filter(r => r.some(c => c));

  let markdown = `| ${headers.join(" | ")} |\n`;
  markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
  rows.forEach(row => {
    markdown += `| ${headers.map((_, i) => row[i] || "").join(" | ")} |\n`;
  });

  const charts: ChartData[] = [];

  const numericCols = headers
    .map((h, i) => ({ header: h, idx: i }))
    .filter(({ idx }) => rows.some(r => !isNaN(parseFloat(r[idx]))));

  const labelCol = headers.findIndex((h, i) =>
    !numericCols.find(nc => nc.idx === i) &&
    rows.some(r => r[i] && r[i].length > 0)
  );

  if (numericCols.length > 0 && labelCol >= 0) {
    const firstNumCol = numericCols[0];
    const pieData = rows
      .map(r => ({ name: r[labelCol] || "?", value: parseFloat(r[firstNumCol.idx]) || 0 }))
      .filter(d => d.name && !isNaN(d.value) && d.value > 0)
      .slice(0, 8);

    if (pieData.length > 1) {
      charts.push({ type: "pie", title: `${firstNumCol.header} Distribution`, data: pieData });
    }

    if (numericCols.length >= 2) {
      const barData = rows
        .map(r => {
          const obj: { name: string; [key: string]: string | number } = { name: r[labelCol] || "?" };
          numericCols.slice(0, 3).forEach(nc => {
            obj[nc.header] = parseFloat(r[nc.idx]) || 0;
          });
          return obj;
        })
        .filter(d => d.name)
        .slice(0, 10);

      if (barData.length > 0) {
        charts.push({
          type: "bar",
          title: `${headers[labelCol]} Comparison`,
          data: barData as { name: string; value: number }[],
        });
      }
    }
  }

  return { markdown, charts };
}

const DEMO_PAYLOAD = `NEXUSDESK DEMO SESSION LOADED

Semester: Monsoon Semester 2026 (Jul 1 – Nov 30, 2026)

Courses:
- EC301 Analog Circuits (Prof. Sharma, Room: ECE-101, Credits: 4)
- EC302 Digital Signal Processing (Prof. Gupta, Room: ECE-205, Credits: 3)
- MA201 Engineering Mathematics III (Prof. Rao, Room: MATH-301, Credits: 4)
- CS301 Data Structures (Prof. Nair, Room: CS-102, Credits: 3)
- EC303 Control Systems (Prof. Kumar, Room: ECE-302, Credits: 3)

Timetable:
- EC301: Monday, Wednesday, Friday 09:00-10:00 ECE-101
- EC302: Tuesday, Thursday 10:00-11:00 ECE-205
- MA201: Monday, Wednesday 11:00-12:00 MATH-301
- CS301: Tuesday, Thursday 14:00-15:00 CS-102
- EC303: Wednesday, Friday 15:00-16:00 ECE-302
- EC301 Lab: Saturday 09:00-12:00 Lab-1

Calendar Events:
- Mid-sem exams: Aug 15–22, 2026
- End-sem exams: Nov 10–20, 2026
- Dussehra break: Oct 2–5, 2026

Tasks:
- Submit EC301 Analog Assignment (HIGH, due Jul 10)
- Read DSP Chapter 3-4 (MEDIUM, due Jul 8)
- MA201 Problem Set 2 (CRITICAL, due Jul 7)
- Lab Report EC303 (HIGH, due Jul 15)
- Study for MA201 Quiz (HIGH, due Jul 12)
`;

export function IngestDropzone() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);

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
          error: error.message || "Failed to ingest data",
        });
      },
    },
  });

  const handleParsePdf = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    setImage(null);
    setResult(null);
    setCharts([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js not loaded. Please try again in a few seconds.");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let extractedText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          extractedText += tc.items.map((item: any) => item.str).join(" ") + "\n";
        }
        if (!extractedText.trim()) throw new Error("PDF parsed but no text extracted (may be scanned).");
        setText(prev => prev ? prev + "\n\n" + extractedText.trim() : extractedText.trim());
      } catch (err: any) {
        setParseError(err.message || "PDF parse failed.");
        setFileName(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => { setParseError("File read failed."); setIsParsing(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleParseExcel = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    setImage(null);
    setResult(null);

    const isCSV = file.name.endsWith(".csv");

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const { markdown, charts: newCharts } = parseExcelCSV(content, true);
        setText(prev => prev ? prev + "\n\n" + markdown : markdown);
        setCharts(newCharts);
        setIsParsing(false);
      };
      reader.onerror = () => { setParseError("CSV read failed."); setIsParsing(false); };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(ws);
          const { markdown, charts: newCharts } = parseExcelCSV(csv, false);
          setText(prev => prev ? prev + "\n\n" + markdown : markdown);
          setCharts(newCharts);
        } catch (err: any) {
          setParseError(err.message || "Excel parse failed.");
          setFileName(null);
        } finally {
          setIsParsing(false);
        }
      };
      reader.onerror = () => { setParseError("Excel read failed."); setIsParsing(false); };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleParseImage = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    setResult(null);
    setCharts([]);
    const reader = new FileReader();
    reader.onload = (event) => { setImage(event.target?.result as string); setIsParsing(false); };
    reader.onerror = () => { setParseError("Image read failed."); setIsParsing(false); };
    reader.readAsDataURL(file);
  };

  const processUploadedFile = (file: File) => {
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
    const isText = file.type === "text/plain" || file.name.endsWith(".txt");
    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name) || file.type.includes("spreadsheet") || file.type === "text/csv";

    if (isPDF) handleParsePdf(file);
    else if (isImage) handleParseImage(file);
    else if (isExcel) handleParseExcel(file);
    else if (isText) {
      setIsParsing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const t = event.target?.result as string;
        setText(prev => prev ? prev + "\n\n" + t : t);
        setFileName(file.name);
        setImage(null);
        setCharts([]);
        setIsParsing(false);
      };
      reader.readAsText(file);
    } else {
      setParseError("Supported: PDF, TXT, PNG, JPG, XLSX, CSV");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setResult(null);
    const settings = getLLMSettings();
    ingest.mutate({
      data: {
        rawText: text,
        provider: settings.provider === "ollama" ? "ollama" : settings.provider === "lemma" ? "lemma" : "antigravity",
        apiKey: settings.provider !== "ollama" && settings.provider !== "lemma" ? settings.apiKey || undefined : undefined,
        scanMode: "universal",
        image: image || undefined,
      },
    });
  };

  const handleLoadDemo = async () => {
    setDemoLoading(true);
    setResult(null);
    try {
      const settings = getLLMSettings();
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: DEMO_PAYLOAD,
          provider: settings.provider === "ollama" ? "ollama" : settings.provider === "lemma" ? "lemma" : "antigravity",
          apiKey: settings.provider !== "ollama" && settings.provider !== "lemma" ? settings.apiKey || undefined : undefined,
          scanMode: "universal",
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, action: "ERROR", recordsCreated: 0, error: err.message });
    } finally {
      setDemoLoading(false);
    }
  };

  const handleClear = () => { setText(""); setFileName(null); setImage(null); setParseError(null); setCharts([]); };

  return (
    <div className="space-y-5">
      <BrutalCard className="p-4 bg-surface border-2 border-ink">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-terracotta" /> LLM COGNITIVE ENGINE
          </h3>
          <div className="font-mono text-[10px] text-inkLight border-2 border-ink px-2 py-1">
            Config via Settings icon in top bar
          </div>
        </div>
        <p className="font-mono text-xs text-inkLight leading-relaxed">
          Use the Settings icon (top-right) to select your LLM provider and API key. Supports Gemini, OpenAI, Anthropic, and local Ollama.
        </p>
      </BrutalCard>

      {charts.length > 0 && (
        <BrutalCard className="p-4 bg-surface border-sage shadow-brutal-sage">
          <h3 className="section-label mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> INTERACTIVE DATA CHARTS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {charts.map((chart, idx) => (
              <div key={idx} className="border-2 border-ink bg-paper p-3">
                <div className="font-mono text-xs font-bold text-inkLight mb-3">{chart.title.toUpperCase()}</div>
                {chart.type === "pie" ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chart.data} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {chart.data.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#2D2D2D" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: "monospace", fontSize: 10, border: "2px solid #2D2D2D", borderRadius: 0 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chart.data}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                      <YAxis tick={{ fontSize: 9, fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ fontFamily: "monospace", fontSize: 10, border: "2px solid #2D2D2D", borderRadius: 0 }} />
                      {Object.keys(chart.data[0] || {}).filter(k => k !== "name").map((key, i) => (
                        <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#2D2D2D" strokeWidth={1} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ))}
          </div>
        </BrutalCard>
      )}

      <BrutalCard className="p-0 overflow-hidden bg-surface">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 border-b-2 border-ink flex justify-between items-center bg-surface">
            <h3 className="section-label mb-0 border-none pb-0">DOCUMENT INGEST DROPZONE</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="flex items-center gap-1.5 font-mono text-xs font-bold border-2 border-sage bg-sageLight/30 text-sageDark px-3 py-1.5 shadow-brutal-sage hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {demoLoading ? "LOADING..." : "LOAD DEMO SESSION"}
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`p-6 border-b-2 border-ink border-dashed flex flex-col items-center justify-center text-center transition-colors duration-150 cursor-pointer ${
              isDragOver ? "bg-terracottaLight/30 border-terracotta" : "bg-paper/50 hover:bg-paper/80 text-inkLight"
            }`}
            onClick={() => document.getElementById("file-upload-main")?.click()}
          >
            <input
              id="file-upload-main"
              type="file"
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.ppt,.pptx"
              className="hidden"
              onChange={handleFileChange}
            />
            {isParsing ? (
              <div className="space-y-2 py-4">
                <div className="h-8 w-8 border-t-2 border-b-2 border-ink mx-auto animate-spin" />
                <p className="font-mono text-xs font-bold text-ink">READING FILE...</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="p-3 bg-surface border-2 border-ink inline-block shadow-brutal-sm">
                  <Upload className="h-6 w-6 text-ink" />
                </div>
                <p className="font-mono text-xs font-bold text-ink">
                  DRAG & DROP (PDF, TXT, PNG, JPG, XLSX, CSV)
                </p>
                <p className="font-mono text-[10px] text-inkLight">
                  Excel/CSV files render interactive charts automatically
                </p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="p-3 bg-terracottaLight/20 text-terracotta border-b-2 border-ink flex items-center gap-2 font-mono text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{parseError}</span>
              <button type="button" className="ml-auto" onClick={() => setParseError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {fileName && (
            <div className="p-2 px-4 bg-sageLight/30 text-sageDark border-b-2 border-ink flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                {image ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="font-bold">{fileName.toUpperCase()}</span>
                <span>({image ? "IMAGE ATTACHED" : charts.length > 0 ? "SPREADSHEET + CHARTS" : "TEXT EXTRACTED"})</span>
              </div>
              <button type="button" onClick={handleClear} className="p-0.5 border border-ink shadow-brutal-sm hover:bg-sageLight/50">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {image && (
            <div className="p-4 border-b-2 border-ink bg-paper/50 flex flex-col items-center">
              <div className="border-4 border-ink shadow-brutal max-w-md overflow-hidden bg-paper relative">
                <img src={image} alt="Ingest preview" className="max-h-[200px] object-contain" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setFileName(null); }}
                  className="absolute top-2 right-2 bg-paper hover:bg-terracottaLight border-2 border-ink p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={image ? "Add context or instructions alongside the image..." : "Paste timetable, syllabus, natural language tasks, or let a file populate this automatically..."}
            className="h-[180px] p-4 bg-paper font-mono text-sm resize-y focus:outline-none placeholder:text-inkFaint border-none"
            disabled={ingest.isPending || isParsing}
          />

          <div className="p-4 border-t-2 border-ink bg-surface flex justify-between items-center">
            <div className="font-mono text-xs text-inkLight flex gap-4">
              <span>{text.length} CHARS</span>
              {(text.trim() || image) && (
                <button type="button" onClick={handleClear} className="font-bold underline text-terracotta hover:text-ink">
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
              {ingest.isPending ? "SCANNING..." : "UNIVERSAL SCAN & POPULATE"}
            </BrutalButton>
          </div>
        </form>
      </BrutalCard>

      {result && (
        <BrutalCard className={result.success ? "border-sage bg-sageLight/20 shadow-brutal-sage" : "border-terracotta bg-terracottaLight/20 shadow-brutal-accent"}>
          <h3 className="section-label mb-4">INGESTION SUMMARY</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className={`font-heading text-2xl font-bold ${result.success ? "text-sage" : "text-terracotta"}`}>
              {result.success ? "SUCCESS" : "FAILED"}
            </div>
            <BrutalBadge variant={result.success ? "sage" : "terracotta"}>{result.action}</BrutalBadge>
          </div>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex border-b-2 border-ink border-dashed pb-2">
              <span className="w-48 font-bold text-inkLight">RECORDS CREATED</span>
              <span className="font-bold">{result.recordsCreated}</span>
            </div>
            {result.confidence && (
              <div className="flex border-b-2 border-ink border-dashed pb-2">
                <span className="w-48 font-bold text-inkLight">CONFIDENCE</span>
                <span>{(result.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
            {result.error && (
              <div className="p-3 bg-terracottaLight/30 border-2 border-ink text-terracotta font-bold">
                <span className="block text-xs uppercase tracking-wider mb-1">Error</span>
                <span>{result.error}</span>
              </div>
            )}
            {result.preview && Object.keys(result.preview).length > 0 && (
              <div className="pt-2">
                <span className="font-bold text-inkLight block mb-2">EXTRACTED ENTITIES</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
                  {(result.preview as any).semester && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Semester</span>
                      <div className="mt-1">{(result.preview as any).semester.name} ({(result.preview as any).semester.startDate} – {(result.preview as any).semester.endDate})</div>
                    </div>
                  )}
                  {(result.preview as any).courses?.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Courses ({(result.preview as any).courses.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {(result.preview as any).courses.map((c: any, i: number) => (
                          <li key={i} className="truncate"><span className="font-bold">{c.subjectCode}</span>: {c.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(result.preview as any).schedules?.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Timetable ({(result.preview as any).schedules.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {(result.preview as any).schedules.map((s: any, i: number) => (
                          <li key={i} className="truncate">Day {s.dayOfWeek}: <span className="font-bold">{s.subjectCode || s.title}</span> {s.startHour}:{String(s.startMinute).padStart(2,"0")}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(result.preview as any).calendarEvents?.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Events ({(result.preview as any).calendarEvents.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {(result.preview as any).calendarEvents.map((e: any, i: number) => (
                          <li key={i} className="truncate text-terracotta">[{e.type}] {e.title} ({e.startDate})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(result.preview as any).tasks?.length > 0 && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs">
                      <span className="font-bold block border-b border-ink pb-1 uppercase">Tasks ({(result.preview as any).tasks.length})</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {(result.preview as any).tasks.map((t: any, i: number) => (
                          <li key={i} className="truncate">[{t.priority}] {t.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(result.preview as any).mutation && (
                    <div className="border-2 border-ink p-2 bg-paper text-xs col-span-2">
                      <span className="font-bold block border-b border-ink pb-1 uppercase text-amber">MUTATION: {(result.preview as any).mutation.action}</span>
                      <div className="mt-1 space-y-0.5">
                        {(result.preview as any).mutation.subjectCode && <div>Course: <span className="font-bold">{(result.preview as any).mutation.subjectCode}</span></div>}
                        {(result.preview as any).mutation.date && <div>Date: {(result.preview as any).mutation.date}</div>}
                        {(result.preview as any).mutation.attendanceStatus && <div>Status: <span className="text-sage font-bold">{(result.preview as any).mutation.attendanceStatus}</span></div>}
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
