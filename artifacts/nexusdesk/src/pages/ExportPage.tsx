export default function ExportPage() {
  const handleDownload = () => {
    window.open("/api/export/zip", "_blank");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b-2 border-ink pb-2">
        <h1 className="text-lg font-mono font-bold tracking-tighter text-ink uppercase">Export</h1>
        <p className="font-mono text-xs text-inkLight mt-0.5">Zero Lock-In. You own your data.</p>
      </div>

      <div className="bg-surface border-2 border-ink p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-ink mb-2">EXPORT SEMESTER PACKAGE</h2>
          <p className="text-sm text-inkLight leading-relaxed">
            You can leave NexusDesk at any time. Clicking the button below compiles all your courses, schedules, outstanding actions, markdown notes, transcripts, and media files into a standard, fully portable <span className="font-mono text-xs font-bold text-terracotta">semester.zip</span> file. No proprietary formats, no lock-in, just pure standard files.
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleDownload}
            className="py-2.5 px-6 bg-sage border-2 border-ink text-paper font-mono text-xs font-bold active:translate-x-[1px] active:translate-y-[1px]"
          >
            📦 DOWNLOAD SEMESTER.ZIP
          </button>
        </div>
      </div>
    </div>
  );
}
