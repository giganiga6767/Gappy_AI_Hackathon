import { useState } from "react";
import { format } from "date-fns";
import { useListTasks } from "@workspace/api-client-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { Mail, CheckCircle, Circle, Upload } from "lucide-react";
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
  const [meetingSummary] = useState(`Sprint 12 retrospective — 3 blockers resolved. Action items: Deploy hotfix v2.3.1 by EOD. QA sign-off on payment module. Client demo scheduled for Jul 1.`);

  const handleDraftEmail = () => {
    const subject = encodeURIComponent("Meeting minutes & action items");
    const body = encodeURIComponent(`Hi Team,\n\nHere are the meeting minutes and action items from today's session:\n\n${meetingSummary}\n\nAction Items:\n${tasks.filter(t => t.status !== "DONE").slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join("\n")}\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const totalBillable = BILLABLE_DATA.reduce((s, d) => s + d.hours, 0);
  const pieData = BILLABLE_DATA.map(d => ({ name: d.client, value: d.hours }));
  const PIE_COLORS = [CORP_COLORS.accent, CORP_COLORS.success, CORP_COLORS.warn, CORP_COLORS.danger];

  const sprintTasks = tasks.slice(0, 6);

  return (
    <div
      className="p-5 max-w-7xl mx-auto space-y-5 min-h-screen"
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
          { label: "MEETINGS", value: STANDUP_LOG.length, color: CORP_COLORS.muted },
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
            <ProLabel>Daily Standup Timeline</ProLabel>
            <div className="space-y-2">
              {STANDUP_LOG.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 border-l-4"
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
                  <span
                    className="font-mono text-[10px] font-bold border px-1.5 py-0.5"
                    style={{
                      color: item.status === "done" ? CORP_COLORS.success : item.status === "in-progress" ? CORP_COLORS.warn : CORP_COLORS.muted,
                      borderColor: item.status === "done" ? CORP_COLORS.success : item.status === "in-progress" ? CORP_COLORS.warn : CORP_COLORS.border,
                    }}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </ProCard>

          <ProCard>
            <ProLabel>Product Release Roadmap</ProLabel>
            <div className="relative">
              <div
                className="absolute left-0 right-0 top-5 h-[2px]"
                style={{ backgroundColor: CORP_COLORS.border }}
              />
              <div className="flex justify-between relative">
                {ROADMAP_MILESTONES.map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-8 h-8 border-2 flex items-center justify-center font-bold text-xs relative z-10"
                      style={{
                        backgroundColor: m.done ? CORP_COLORS.success : CORP_COLORS.card,
                        borderColor: m.done ? CORP_COLORS.success : CORP_COLORS.border,
                        color: m.done ? "#fff" : CORP_COLORS.muted,
                      }}
                    >
                      {m.done ? "✓" : i + 1}
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-[10px] font-bold" style={{ color: m.done ? CORP_COLORS.success : CORP_COLORS.text }}>
                        {m.label}
                      </div>
                      <div
                        className="font-mono text-[9px] border px-1 mt-0.5"
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
            <div className="flex items-center justify-between mb-3">
              <ProLabel>Meeting Summary & Follow-up</ProLabel>
              <button
                onClick={handleDraftEmail}
                className="flex items-center gap-1.5 font-mono text-[10px] font-bold border px-2 py-1 hover:opacity-80 transition-opacity"
                style={{ borderColor: CORP_COLORS.accent, color: CORP_COLORS.accent, backgroundColor: `${CORP_COLORS.accent}10` }}
              >
                <Mail className="h-3 w-3" />
                DRAFT FOLLOW-UP EMAIL
              </button>
            </div>
            <div
              className="font-mono text-xs leading-relaxed p-3 border"
              style={{ color: CORP_COLORS.text, borderColor: CORP_COLORS.border, backgroundColor: CORP_COLORS.bg }}
            >
              {meetingSummary}
            </div>
          </ProCard>
        </div>

        <div className="space-y-5">
          <ProCard>
            <ProLabel>Billable Hours — Client Split</ProLabel>
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
              {BILLABLE_DATA.map((d, i) => (
                <div key={d.client} className="flex items-center justify-between font-mono text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span style={{ color: CORP_COLORS.text }}>{d.client}</span>
                  </div>
                  <span style={{ color: CORP_COLORS.muted }}>{d.hours}h / {d.budget}h</span>
                </div>
              ))}
            </div>
          </ProCard>

          <ProCard>
            <ProLabel>Billable Hours Trend</ProLabel>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={TREND_DATA}>
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
