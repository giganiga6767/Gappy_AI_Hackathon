import { useState } from "react";
import { format } from "date-fns";
import { useListTasks } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { Mail, CheckCircle, Circle, Upload, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const CORP_COLORS = {
  bg: "#0f1a2e",
  card: "#142038",
  border: "#2a4a72",
  accent: "#64a8d8",
  success: "#4a9e6b",
  warn: "#d4a843",
  danger: "#c0443a",
  text: "#e8f0fb",
  muted: "#4a7aa8",
};

function ProCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border-2 p-4 ${className}`}
      style={{ backgroundColor: CORP_COLORS.card, borderColor: CORP_COLORS.border }}
    >
      {children}
    </div>
  );
}

function ProLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] font-bold uppercase tracking-widest pb-2 mb-3 border-b-2"
      style={{ color: CORP_COLORS.muted, borderColor: CORP_COLORS.border }}
    >
      {children}
    </div>
  );
}

const STANDUP_LOG = [
  { time: "09:00", title: "Daily Standup", participants: ["Team Alpha", "PM"], status: "done" },
  { time: "10:30", title: "Sprint Review", participants: ["Dev Lead", "QA"], status: "done" },
  { time: "14:00", title: "Client Sync — Acme Corp", participants: ["Sales", "Dev"], status: "in-progress" },
  { time: "16:00", title: "Roadmap Planning Q3", participants: ["CTO", "Product"], status: "pending" },
];

const ROADMAP_MILESTONES = [
  { label: "Sprint 12", phase: "DEV", done: true, date: "Jun 10" },
  { label: "QA Sign-off", phase: "QA", done: true, date: "Jun 18" },
  { label: "Staging Deploy", phase: "DEV", done: true, date: "Jun 22" },
  { label: "UAT Testing", phase: "QA", done: false, date: "Jun 28" },
  { label: "Production Release", phase: "RELEASE", done: false, date: "Jul 5" },
];

const BILLABLE_DATA = [
  { client: "Acme", hours: 24, budget: 40 },
  { client: "TechCo", hours: 18, budget: 30 },
  { client: "StartX", hours: 12, budget: 20 },
  { client: "LegacyFin", hours: 8, budget: 15 },
];

const TREND_DATA = [
  { week: "W1", hours: 32 },
  { week: "W2", hours: 41 },
  { week: "W3", hours: 28 },
  { week: "W4", hours: 45 },
  { week: "W5", hours: 38 },
];

export default function ProfessionalDashboard() {
  const { data: tasks = [] } = useListTasks();

  // Load / Save state helpers
  const [meetings, setMeetings] = useState<Array<{ time: string; title: string; participants: string[]; status: "done" | "in-progress" | "pending" }>>(() => {
    const saved = localStorage.getItem("pro_meetings");
    return saved ? JSON.parse(saved) : [
      { time: "09:00", title: "Daily Standup", participants: ["Team Alpha", "PM"], status: "done" },
      { time: "10:30", title: "Sprint Review", participants: ["Dev Lead", "QA"], status: "done" },
      { time: "14:00", title: "Client Sync — Acme Corp", participants: ["Sales", "Dev"], status: "in-progress" },
      { time: "16:00", title: "Roadmap Planning Q3", participants: ["CTO", "Product"], status: "pending" },
    ];
  });

  const [milestones, setMilestones] = useState<Array<{ label: string; phase: string; done: boolean; date: string }>>(() => {
    const saved = localStorage.getItem("pro_milestones");
    return saved ? JSON.parse(saved) : [
      { label: "Sprint 12", phase: "DEV", done: true, date: "Jun 10" },
      { label: "QA Sign-off", phase: "QA", done: true, date: "Jun 18" },
      { label: "Staging Deploy", phase: "DEV", done: true, date: "Jun 22" },
      { label: "UAT Testing", phase: "QA", done: false, date: "Jun 28" },
      { label: "Production Release", phase: "RELEASE", done: false, date: "Jul 5" },
    ];
  });

  const [billableData, setBillableData] = useState<Array<{ client: string; hours: number; budget: number }>>(() => {
    const saved = localStorage.getItem("pro_billable");
    return saved ? JSON.parse(saved) : [
      { client: "Acme", hours: 24, budget: 40 },
      { client: "TechCo", hours: 18, budget: 30 },
      { client: "StartX", hours: 12, budget: 20 },
      { client: "LegacyFin", hours: 8, budget: 15 },
    ];
  });

  const [trendData, setTrendData] = useState<Array<{ week: string; hours: number }>>(() => {
    const saved = localStorage.getItem("pro_trend");
    return saved ? JSON.parse(saved) : [
      { week: "W1", hours: 32 },
      { week: "W2", hours: 41 },
      { week: "W3", hours: 28 },
      { week: "W4", hours: 45 },
      { week: "W5", hours: 38 },
    ];
  });

  const [meetingSummary, setMeetingSummary] = useState(() => {
    const saved = localStorage.getItem("pro_summary");
    return saved || `Sprint 12 retrospective — 3 blockers resolved. Action items: Deploy hotfix v2.3.1 by EOD. QA sign-off on payment module. Client demo scheduled for Jul 1.`;
  });

  // UI edit/form states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [tempSummary, setTempSummary] = useState(meetingSummary);

  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newParticipants, setNewParticipants] = useState("");
  const [newStatus, setNewStatus] = useState<"done" | "in-progress" | "pending">("pending");

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
  const saveMeetings = (updated: typeof meetings) => {
    setMeetings(updated);
    localStorage.setItem("pro_meetings", JSON.stringify(updated));
  };

  const saveMilestones = (updated: typeof milestones) => {
    setMilestones(updated);
    localStorage.setItem("pro_milestones", JSON.stringify(updated));
  };

  const saveBillable = (updated: typeof billableData) => {
    setBillableData(updated);
    localStorage.setItem("pro_billable", JSON.stringify(updated));
    // Auto-update W5 trend value when billable hours change!
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
    const parts = newParticipants.split(",").map(p => p.trim()).filter(p => p);
    const updated = [...meetings, { time: newTime, title: newTitle, participants: parts.length ? parts : ["Self"], status: newStatus }];
    saveMeetings(updated);
    setNewTime("");
    setNewTitle("");
    setNewParticipants("");
    setNewStatus("pending");
    setShowAddMeeting(false);
  };

  const cycleStatus = (index: number) => {
    const statuses: Array<"pending" | "in-progress" | "done"> = ["pending", "in-progress", "done"];
    const updated = [...meetings];
    const currentIdx = statuses.indexOf(updated[index].status);
    updated[index].status = statuses[(currentIdx + 1) % statuses.length];
    saveMeetings(updated);
  };

  const deleteMeeting = (index: number) => {
    const updated = meetings.filter((_, i) => i !== index);
    saveMeetings(updated);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMileLabel || !newMileDate) return;
    const updated = [...milestones, { label: newMileLabel, phase: newMilePhase.toUpperCase(), done: false, date: newMileDate }];
    saveMilestones(updated);
    setNewMileLabel("");
    setNewMilePhase("DEV");
    setNewMileDate("");
    setShowAddMilestone(false);
  };

  const toggleMilestoneDone = (index: number) => {
    const updated = [...milestones];
    updated[index].done = !updated[index].done;
    saveMilestones(updated);
  };

  const deleteMilestone = (index: number) => {
    const updated = milestones.filter((_, i) => i !== index);
    saveMilestones(updated);
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
    <div
      className="p-5 max-w-7xl mx-auto space-y-5 min-h-screen text-[#e8f0fb]"
      style={{ backgroundColor: CORP_COLORS.bg }}
    >
      <div
        className="flex items-end justify-between pb-4 border-b-2"
        style={{ borderColor: CORP_COLORS.border }}
      >
        <div>
          <h1
            className="text-4xl font-heading font-extrabold uppercase tracking-tighter"
            style={{ color: CORP_COLORS.accent }}
          >
            Professional Command Center
          </h1>
          <p className="font-mono text-sm mt-1" style={{ color: CORP_COLORS.muted }}>
            NEXUSDESK // PROFESSIONAL_MODE // {format(new Date(), "yyyy-MM-dd")}
          </p>
        </div>
        <div
          className="font-mono text-xs font-bold border-2 px-3 py-1"
          style={{ borderColor: CORP_COLORS.border, color: CORP_COLORS.accent, backgroundColor: CORP_COLORS.card }}
        >
          {format(new Date(), "EEEE, MMM d")}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "SPRINT TASKS", value: tasks.filter(t => t.status !== "DONE").length, color: CORP_COLORS.accent },
          { label: "DONE TODAY", value: tasks.filter(t => t.status === "DONE").length, color: CORP_COLORS.success },
          { label: "BILLABLE HRS", value: `${totalBillable}h`, color: CORP_COLORS.warn },
          { label: "MEETINGS", value: meetings.length, color: CORP_COLORS.muted },
        ].map(stat => (
          <ProCard key={stat.label}>
            <div className="font-mono text-[10px] font-bold mb-2" style={{ color: CORP_COLORS.muted }}>{stat.label}</div>
            <div className="font-mono text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </ProCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ProCard>
            <div className="flex items-center justify-between mb-3 border-b-2 pb-2" style={{ borderColor: CORP_COLORS.border }}>
              <ProLabel>Daily Standup Timeline</ProLabel>
              <button
                onClick={() => setShowAddMeeting(!showAddMeeting)}
                className="p-1 border border-[#2a4a72] bg-[#142038] hover:bg-[#2a4a72] text-[#64a8d8] font-bold flex items-center gap-1 font-mono text-[9px] uppercase transition-colors"
                title="Add Meeting"
              >
                {showAddMeeting ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showAddMeeting ? "Cancel" : "Add Meeting"}
              </button>
            </div>

            {showAddMeeting && (
              <form onSubmit={handleAddMeeting} className="mb-4 p-3 border border-[#2a4a72] bg-[#0f1a2e] space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">TIME</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">TITLE</label>
                    <input
                      type="text"
                      placeholder="Meeting Title"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">PARTICIPANTS</label>
                    <input
                      type="text"
                      placeholder="Dev, PM (comma separated)"
                      value={newParticipants}
                      onChange={e => setNewParticipants(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">STATUS</label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as any)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none h-[26px]"
                    >
                      <option value="pending">PENDING</option>
                      <option value="in-progress">IN-PROGRESS</option>
                      <option value="done">DONE</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="bg-[#4a9e6b] text-white px-3 py-1 font-mono text-xs font-bold hover:opacity-90 flex items-center gap-1 border border-[#4a9e6b]"
                  >
                    <Check className="h-3 w-3" /> SAVE MEETING
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {meetings.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 border-l-4 group relative"
                  style={{
                    borderColor: item.status === "done" ? CORP_COLORS.success : item.status === "in-progress" ? CORP_COLORS.warn : CORP_COLORS.border,
                    backgroundColor: item.status === "in-progress" ? `${CORP_COLORS.warn}10` : "transparent",
                  }}
                >
                  <span className="font-mono text-xs font-bold w-12 flex-shrink-0" style={{ color: CORP_COLORS.muted }}>
                    {item.time}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: CORP_COLORS.text }}>{item.title}</div>
                    <div className="font-mono text-[10px] mt-0.5" style={{ color: CORP_COLORS.muted }}>
                      {item.participants.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cycleStatus(i)}
                      className="font-mono text-[10px] font-bold border px-1.5 py-0.5 hover:opacity-80 transition-opacity uppercase cursor-pointer"
                      style={{
                        color: item.status === "done" ? CORP_COLORS.success : item.status === "in-progress" ? CORP_COLORS.warn : CORP_COLORS.muted,
                        borderColor: item.status === "done" ? CORP_COLORS.success : item.status === "in-progress" ? CORP_COLORS.warn : CORP_COLORS.border,
                      }}
                      title="Click to cycle status"
                    >
                      {item.status.toUpperCase()}
                    </button>
                    <button
                      onClick={() => deleteMeeting(i)}
                      className="text-[#c0443a] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[#c0443a]/20 border border-transparent hover:border-[#c0443a]"
                      title="Delete Meeting"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {meetings.length === 0 && (
                <div className="font-mono text-xs text-center py-4 text-[#4a7aa8]">
                  NO MEETINGS SCHEDULED
                </div>
              )}
            </div>
          </ProCard>

          <ProCard>
            <div className="flex items-center justify-between mb-4 border-b-2 pb-2" style={{ borderColor: CORP_COLORS.border }}>
              <ProLabel>Product Release Roadmap</ProLabel>
              <button
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="p-1 border border-[#2a4a72] bg-[#142038] hover:bg-[#2a4a72] text-[#64a8d8] font-bold flex items-center gap-1 font-mono text-[9px] uppercase transition-colors"
                title="Add Milestone"
              >
                {showAddMilestone ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showAddMilestone ? "Cancel" : "Add Milestone"}
              </button>
            </div>

            {showAddMilestone && (
              <form onSubmit={handleAddMilestone} className="mb-4 p-3 border border-[#2a4a72] bg-[#0f1a2e] space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">MILESTONE LABEL</label>
                    <input
                      type="text"
                      placeholder="e.g. Sprint 13"
                      value={newMileLabel}
                      onChange={e => setNewMileLabel(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">PHASE</label>
                    <input
                      type="text"
                      placeholder="e.g. DEV, QA, RELEASE"
                      value={newMilePhase}
                      onChange={e => setNewMilePhase(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-[#4a7aa8] block">TARGET DATE</label>
                    <input
                      type="text"
                      placeholder="e.g. Jul 15"
                      value={newMileDate}
                      onChange={e => setNewMileDate(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#4a9e6b] text-white px-3 py-1 font-mono text-xs font-bold hover:opacity-90 flex items-center gap-1 border border-[#4a9e6b]"
                  >
                    <Check className="h-3 w-3" /> SAVE MILESTONE
                  </button>
                </div>
              </form>
            )}

            <div className="relative pt-2">
              <div
                className="absolute left-0 right-0 top-7 h-[2px]"
                style={{ backgroundColor: CORP_COLORS.border }}
              />
              <div className="flex justify-between relative">
                {milestones.map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                    <button
                      onClick={() => toggleMilestoneDone(i)}
                      className="w-8 h-8 border-2 flex items-center justify-center font-bold text-xs relative z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      style={{
                        backgroundColor: m.done ? CORP_COLORS.success : CORP_COLORS.card,
                        borderColor: m.done ? CORP_COLORS.success : CORP_COLORS.border,
                        color: m.done ? "#fff" : CORP_COLORS.muted,
                      }}
                      title="Click to toggle status"
                    >
                      {m.done ? "✓" : i + 1}
                    </button>
                    <div className="text-center space-y-0.5">
                      <div className="font-mono text-[10px] font-bold flex items-center justify-center gap-1" style={{ color: m.done ? CORP_COLORS.success : CORP_COLORS.text }}>
                        {m.label}
                        <button
                          onClick={() => deleteMilestone(i)}
                          className="text-[#c0443a] opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                          title="Delete Milestone"
                        >
                          ✕
                        </button>
                      </div>
                      <div
                        className="font-mono text-[9px] border px-1 inline-block"
                        style={{ color: CORP_COLORS.muted, borderColor: CORP_COLORS.border }}
                      >
                        {m.phase}
                      </div>
                      <div className="font-mono text-[9px]" style={{ color: CORP_COLORS.muted }}>{m.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ProCard>

          <ProCard>
            <ProLabel>Excel / CSV Live Analytics Dropzone</ProLabel>
            <div className="border-2 border-dashed border-[#2a4a72] p-6 text-center cursor-pointer hover:bg-[#142038]/50 transition-colors relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleLocalUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: CORP_COLORS.accent }} />
              <div className="font-mono text-xs font-bold" style={{ color: CORP_COLORS.text }}>
                {uploadName ? `UPLOADED: ${uploadName.toUpperCase()}` : "DROP OR CLICK TO UPLOAD EXCEL/CSV"}
              </div>
              <div className="font-mono text-[9px] mt-1" style={{ color: CORP_COLORS.muted }}>
                Parses grades, billable hours, or budget metrics dynamically into charts
              </div>
            </div>

            {localCharts.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {localCharts.map((chart, idx) => (
                  <div key={idx} className="border p-3" style={{ borderColor: CORP_COLORS.border, backgroundColor: CORP_COLORS.bg }}>
                    <div className="font-mono text-[10px] font-bold mb-3" style={{ color: CORP_COLORS.accent }}>
                      {chart.title.toUpperCase()}
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      {chart.type === "pie" ? (
                        <PieChart>
                          <Pie data={chart.data} cx="50%" cy="50%" outerRadius={50} dataKey="value" label={({ name }) => name}>
                            {chart.data.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke={CORP_COLORS.border} strokeWidth={1} />
                            ))}
                          </Pie>
                        </PieChart>
                      ) : (
                        <BarChart data={chart.data}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: CORP_COLORS.muted }} />
                          <YAxis tick={{ fontSize: 8, fill: CORP_COLORS.muted }} />
                          <Tooltip contentStyle={{ backgroundColor: CORP_COLORS.card, border: `1px solid ${CORP_COLORS.border}`, color: CORP_COLORS.text, fontFamily: "monospace", fontSize: 9 }} />
                          {Object.keys(chart.data[0] || {}).filter(k => k !== "name").map((key, i) => (
                            <Bar key={key} dataKey={key} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke={CORP_COLORS.border} strokeWidth={1} />
                          ))}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </ProCard>

          <ProCard>
            <div className="flex items-center justify-between mb-3 border-b-2 pb-2" style={{ borderColor: CORP_COLORS.border }}>
              <ProLabel>Meeting Summary & Follow-up</ProLabel>
              <div className="flex gap-2">
                {isEditingSummary ? (
                  <>
                    <button
                      onClick={saveSummary}
                      className="flex items-center gap-1 font-mono text-[9px] font-bold border border-[#4a9e6b] px-2 py-0.5 bg-[#4a9e6b] text-white hover:opacity-90 cursor-pointer"
                    >
                      <Check className="h-2.5 w-2.5" /> SAVE
                    </button>
                    <button
                      onClick={() => { setIsEditingSummary(false); setTempSummary(meetingSummary); }}
                      className="flex items-center gap-1 font-mono text-[9px] font-bold border border-[#c0443a] px-2 py-0.5 bg-[#c0443a] text-white hover:opacity-90 cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" /> CANCEL
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingSummary(true)}
                    className="flex items-center gap-1 font-mono text-[9px] font-bold border border-[#2a4a72] px-2 py-0.5 bg-[#142038] hover:bg-[#2a4a72] cursor-pointer text-[#64a8d8]"
                  >
                    <Edit2 className="h-2.5 w-2.5" /> EDIT SUMMARY
                  </button>
                )}
                <button
                  onClick={handleDraftEmail}
                  className="flex items-center gap-1.5 font-mono text-[10px] font-bold border px-2 py-1 hover:opacity-80 transition-opacity"
                  style={{ borderColor: CORP_COLORS.accent, color: CORP_COLORS.accent, backgroundColor: `${CORP_COLORS.accent}10` }}
                >
                  <Mail className="h-3 w-3" />
                  DRAFT FOLLOW-UP EMAIL
                </button>
              </div>
            </div>

            {isEditingSummary ? (
              <textarea
                value={tempSummary}
                onChange={e => setTempSummary(e.target.value)}
                className="w-full h-24 bg-[#0f1a2e] text-[#e8f0fb] border border-[#2a4a72] p-3 font-mono text-xs focus:outline-none focus:border-[#64a8d8] rounded-none"
              />
            ) : (
              <div
                className="font-mono text-xs leading-relaxed p-3 border"
                style={{ color: CORP_COLORS.text, borderColor: CORP_COLORS.border, backgroundColor: CORP_COLORS.bg }}
              >
                {meetingSummary}
              </div>
            )}
          </ProCard>
        </div>

        <div className="space-y-5">
          <ProCard>
            <div className="flex items-center justify-between mb-3 border-b-2 pb-2" style={{ borderColor: CORP_COLORS.border }}>
              <ProLabel>Billable Hours — Client Split</ProLabel>
              <button
                onClick={() => setShowAddBillable(!showAddBillable)}
                className="p-1 border border-[#2a4a72] bg-[#142038] hover:bg-[#2a4a72] text-[#64a8d8] font-bold flex items-center gap-1 font-mono text-[9px] uppercase transition-colors"
                title="Add Client"
              >
                {showAddBillable ? <X className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                {showAddBillable ? "Cancel" : "Add Client"}
              </button>
            </div>

            {showAddBillable && (
              <form onSubmit={handleAddBillable} className="mb-3 p-2 border border-[#2a4a72] bg-[#0f1a2e] space-y-2">
                <div className="space-y-1">
                  <label className="font-mono text-[8px] text-[#4a7aa8] block">CLIENT NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme"
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none animate-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[8px] text-[#4a7aa8] block">HOURS</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={newHours}
                      onChange={e => setNewHours(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[8px] text-[#4a7aa8] block">BUDGET</label>
                    <input
                      type="number"
                      placeholder="e.g. 40"
                      value={newBudget}
                      onChange={e => setNewBudget(e.target.value)}
                      className="w-full bg-[#142038] text-[#e8f0fb] border border-[#2a4a72] px-2 py-1 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#4a9e6b] text-white px-2 py-0.5 font-mono text-[10px] font-bold hover:opacity-90 flex items-center gap-1 border border-[#4a9e6b]"
                  >
                    <Check className="h-2.5 w-2.5" /> SAVE
                  </button>
                </div>
              </form>
            )}

            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke={CORP_COLORS.border} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: CORP_COLORS.card, border: `1px solid ${CORP_COLORS.border}`, color: CORP_COLORS.text, fontFamily: "monospace", fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {billableData.map((d, i) => (
                    <div key={d.client} className="flex items-center justify-between font-mono text-[10px] group border-b border-[#2a4a72]/10 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ color: CORP_COLORS.text }}>{d.client}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: CORP_COLORS.muted }}>{d.hours}h / {d.budget}h</span>
                        <button
                          onClick={() => deleteBillable(d.client)}
                          className="text-[#c0443a] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[#c0443a]/20 cursor-pointer"
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
              <div className="font-mono text-xs text-center py-6 text-[#4a7aa8]">
                NO CLIENT DATA ENTERED
              </div>
            )}
          </ProCard>

          <ProCard>
            <ProLabel>Billable Hours Trend</ProLabel>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CORP_COLORS.border} />
                <XAxis dataKey="week" stroke={CORP_COLORS.muted} tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <YAxis stroke={CORP_COLORS.muted} tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ backgroundColor: CORP_COLORS.card, border: `1px solid ${CORP_COLORS.border}`, color: CORP_COLORS.text, fontFamily: "monospace", fontSize: 10 }} />
                <Line type="monotone" dataKey="hours" stroke={CORP_COLORS.accent} strokeWidth={2} dot={{ fill: CORP_COLORS.accent, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ProCard>

          <ProCard>
            <ProLabel>Sprint Kanban Quorum</ProLabel>
            <div className="space-y-2">
              {["TODO", "IN_PROGRESS", "DONE"].map(status => {
                const count = tasks.filter(t => t.status === status).length;
                const color = status === "DONE" ? CORP_COLORS.success : status === "IN_PROGRESS" ? CORP_COLORS.warn : CORP_COLORS.muted;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] w-24" style={{ color: CORP_COLORS.muted }}>
                      {status.replace("_", " ")}
                    </span>
                    <div className="flex-1 h-3 border" style={{ borderColor: CORP_COLORS.border, backgroundColor: CORP_COLORS.bg }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          backgroundColor: color,
                          width: tasks.length ? `${(count / tasks.length) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] w-6 text-right" style={{ color }}>{count}</span>
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
