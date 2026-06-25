import { IngestDropzone } from "@/components/ingest/IngestDropzone";

export default function IngestPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between border-b-4 border-ink pb-4 mb-6">
        <div>
          <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tighter">DATA INGEST</h1>
          <p className="font-mono text-sm text-inkLight mt-1">AUTOMATION // PARSE_UNSTRUCTURED</p>
        </div>
      </div>

      <div className="bg-surface border-2 border-ink p-4 mb-6 font-mono text-xs leading-relaxed text-inkLight">
        <p className="font-bold text-ink mb-2">SUPPORTED FORMATS:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Syllabus text (creates tasks and milestones)</li>
          <li>Timetable copy-paste (creates recurring events)</li>
          <li>Natural language tasks ("Remind me to submit assignment tomorrow")</li>
          <li>Exam schedules</li>
        </ul>
      </div>

      <IngestDropzone />
    </div>
  );
}
