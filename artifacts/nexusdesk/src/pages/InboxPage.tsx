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

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Capture form states
  const [title, setTitle] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captureType, setCaptureType] = useState<"text" | "file" | "record">("text");

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [provider, setProvider] = useState(() => localStorage.getItem("llm_provider") || "gemini");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error("Failed to load inbox items:", e);
    } finally {
      setLoading(false);
    }
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordedBlob(null);
    } catch (err) {
      alert("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle Capture Submit
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    let bodyPayload: any = {
      title: title || `Capture ${new Date().toLocaleString()}`,
      type: captureType === "record" ? "audio" : captureType
    };

    try {
      if (captureType === "text") {
        if (!textInput.trim()) return;
        bodyPayload.rawText = textInput;
      } else if (captureType === "file" && selectedFile) {
        const base64 = await blobToBase64(selectedFile);
        bodyPayload.fileBase64 = base64;
        bodyPayload.fileName = selectedFile.name;
        bodyPayload.type = selectedFile.type.startsWith("image/") ? "image" : selectedFile.type === "application/pdf" ? "pdf" : "audio";
      } else if (captureType === "record" && recordedBlob) {
        const base64 = await blobToBase64(recordedBlob);
        bodyPayload.fileBase64 = base64;
        bodyPayload.fileName = "voice_capture.webm";
      } else {
        return;
      }

      const res = await fetch("/api/inbox/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        setTitle("");
        setTextInput("");
        setSelectedFile(null);
        setRecordedBlob(null);
        fetchItems();
      } else {
        alert("Failed to capture inbox item.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during capture.");
    }
  };

  // Run Lemma Understanding
  const handleUnderstand = async (item: InboxItem) => {
    setProcessingId(item.id);
    try {
      const res = await fetch(`/api/inbox/${item.id}/understand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey })
      });

      if (res.ok) {
        const data = await res.json();
        setEditText(JSON.stringify(data.analysis, null, 2));
        setEditingId(item.id);
        fetchItems();
      } else {
        const errData = await res.json();
        alert(`Failed to understand: ${errData.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error processing item.");
    } finally {
      setProcessingId(null);
    }
  };

  // Save Settings
  const saveSettings = (key: string, val: string) => {
    localStorage.setItem(key, val);
    if (key === "gemini_api_key") setApiKey(val);
    if (key === "llm_provider") setProvider(val);
  };

  // Apply Changes
  const handleApply = async (id: string) => {
    try {
      const payload = JSON.parse(editText);
      const res = await fetch(`/api/inbox/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditingId(null);
        setEditText("");
        fetchItems();
      } else {
        alert("Failed to apply payload.");
      }
    } catch (err) {
      alert("Invalid JSON format. Please verify before applying.");
    }
  };

  // Delete Item
  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item from the inbox?")) return;
    try {
      const res = await fetch(`/api/inbox/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === id) {
          setEditingId(null);
          setEditText("");
        }
        fetchItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-ink pb-2">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-tighter text-ink uppercase">Inbox</h1>
          <p className="font-mono text-xs text-inkLight mt-0.5">Capture. Understand. Preview. Apply.</p>
        </div>
        <span className="font-mono text-xs text-inkLight">NEXUSDESK // INGEST_PIPELINE</span>
      </div>

      {/* Settings Row */}
      <div className="bg-surface border-2 border-ink p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <label className="font-bold block mb-1">COGNITIVE PROVIDER</label>
          <select 
            value={provider} 
            onChange={(e) => saveSettings("llm_provider", e.target.value)}
            className="border-2 border-ink p-1 w-full bg-paper focus:ring-0 rounded-none text-xs"
          >
            <option value="gemini">Gemini API (Cloud/Optimal)</option>
            <option value="ollama">Ollama (Local/Private)</option>
          </select>
        </div>
        <div>
          <label className="font-bold block mb-1">GEMINI API KEY</label>
          <input 
            type="password" 
            placeholder="Enter key to enable cloud flash extraction..."
            value={apiKey} 
            onChange={(e) => saveSettings("gemini_api_key", e.target.value)}
            className="border-2 border-ink p-1 w-full bg-paper focus:ring-0 rounded-none text-xs"
          />
        </div>
      </div>

      {/* Grid: Capture and List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingestion Panel */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">CAPTURE INPUT</span>
          
          {/* Tab selectors */}
          <div className="flex border-b-2 border-ink">
            <button 
              onClick={() => setCaptureType("text")}
              className={`flex-1 text-center py-1.5 font-mono text-xs font-bold border-r-2 last:border-r-0 border-ink ${
                captureType === "text" ? "bg-ink text-paper" : "hover:bg-surfaceHover"
              }`}
            >
              TEXT PASTE
            </button>
            <button 
              onClick={() => setCaptureType("file")}
              className={`flex-1 text-center py-1.5 font-mono text-xs font-bold border-r-2 last:border-r-0 border-ink ${
                captureType === "file" ? "bg-ink text-paper" : "hover:bg-surfaceHover"
              }`}
            >
              IMPORT FILE
            </button>
            <button 
              onClick={() => setCaptureType("record")}
              className={`flex-1 text-center py-1.5 font-mono text-xs font-bold border-r-2 last:border-r-0 border-ink ${
                captureType === "record" ? "bg-ink text-paper" : "hover:bg-surfaceHover"
              }`}
            >
              RECORD MIC
            </button>
          </div>

          <form onSubmit={handleCapture} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold block">TITLE / DESCRIPTION</label>
              <input 
                type="text" 
                placeholder="e.g. ECE Lecture 3, Syllabus Copy" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="border-2 border-ink p-2 w-full bg-paper text-sm focus:ring-0 rounded-none"
              />
            </div>

            {captureType === "text" && (
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold block">PASTE TEXT / TIMETABLE / SYLLABUS</label>
                <textarea 
                  rows={6}
                  placeholder="Paste unstructured notes, class schedules, reschedule requests here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="border-2 border-ink p-2 w-full bg-paper text-sm focus:ring-0 rounded-none"
                />
              </div>
            )}

            {captureType === "file" && (
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold block">SELECT FILE (PDF, PNG, JPG, MP3)</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="border-2 border-ink p-2 w-full bg-paper text-xs focus:ring-0 rounded-none file:mr-4 file:py-1 file:px-2 file:border-2 file:border-ink file:bg-surface file:text-xs file:font-mono file:font-bold"
                />
              </div>
            )}

            {captureType === "record" && (
              <div className="p-4 border-2 border-ink bg-paper flex flex-col items-center space-y-4 justify-center">
                <div className="flex items-center gap-4">
                  {isRecording ? (
                    <button 
                      type="button" 
                      onClick={stopRecording}
                      className="w-12 h-12 rounded-full border-2 border-ink bg-terracotta hover:opacity-90 flex items-center justify-center font-mono font-bold text-xs text-paper"
                    >
                      STOP
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startRecording}
                      className="w-12 h-12 rounded-full border-2 border-ink bg-sage hover:opacity-90 flex items-center justify-center font-mono font-bold text-xs text-paper"
                    >
                      REC
                    </button>
                  )}
                  <span className="font-mono text-xs font-bold">
                    {isRecording ? "🔴 RECORDING LIVE..." : recordedBlob ? "🎙️ RECORDING CAPTURED!" : "READY TO RECORD"}
                  </span>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-2 bg-ink text-paper font-mono text-xs font-bold border-2 border-ink active:translate-x-[1px] active:translate-y-[1px]"
            >
              📥 CAPTURE INTO INBOX
            </button>
          </form>
        </div>

        {/* Queued Items List */}
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <span className="font-mono text-xs font-bold text-inkLight block uppercase tracking-wider">QUEUED CAPTURES</span>
          
          {loading ? (
            <p className="text-xs font-mono text-inkLight">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-inkLight">No unprocessed captures. Desk clear.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.id} className="border-2 border-ink p-3 bg-paper space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm truncate pr-2 text-ink">{item.title}</h4>
                      <span className="font-mono text-[10px] bg-surface border border-ink px-1.5 uppercase font-bold">
                        {item.type}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-inkLight block">
                      Captured: {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1.5 border-t border-dashed border-inkFaint">
                    {item.status === "captured" ? (
                      <button 
                        onClick={() => handleUnderstand(item)}
                        disabled={processingId !== null}
                        className="flex-1 py-1 bg-sage border border-ink text-paper font-mono text-[10px] font-bold"
                      >
                        {processingId === item.id ? "UNDERSTANDING..." : "🧠 UNDERSTAND"}
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditText(JSON.stringify(JSON.parse(item.analysis || "{}"), null, 2));
                          setEditingId(item.id);
                        }}
                        className="flex-1 py-1 bg-paper border border-ink text-ink font-mono text-[10px] font-bold"
                      >
                        🔎 PREVIEW
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="py-1 px-2.5 bg-terracotta border border-ink text-paper font-mono text-[10px] font-bold"
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

      {/* Preview and Edit Section */}
      {editingId && (
        <div className="bg-surface border-2 border-ink p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-ink pb-2">
            <span className="font-mono text-xs font-bold text-ink block uppercase tracking-wider">
              Preview & Edit Extracted Model
            </span>
            <button 
              onClick={() => setEditingId(null)}
              className="font-mono text-xs font-bold text-terracotta hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-inkLight font-mono">
              Review and edit the extracted schema entities before writing to the database. Use strict JSON formatting.
            </p>
            <textarea 
              rows={12}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="border-2 border-ink p-2 w-full bg-paper font-mono text-xs focus:ring-0 rounded-none"
            />
            <button 
              onClick={() => handleApply(editingId)}
              className="py-2 px-6 bg-sage border-2 border-ink text-paper font-mono text-xs font-bold active:translate-x-[1px] active:translate-y-[1px]"
            >
              ✅ APPLY TO SEMESTER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
