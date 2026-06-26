# NexusDesk
> Your academic desk. Quiet, intentional, and durable.

NexusDesk is a **local-first, offline-capable academic workspace** built for students and researchers. It combines a structured academic scheduler, an AI-powered ingestion inbox, a grade/CGPA simulator, and agentic background workflows — all stored in a single local SQLite file on your machine. No accounts. No cloud lock-in. No SaaS subscriptions.

---

## 📖 Quick Links

* 🌟 **[Feature Guide](./FEATURES.md)**: Detailed breakdown of the core features, AI Ingestion Engine, conflict checker, and audio pipeline.
* 🚀 **[Getting Started Guide](./GETTING_STARTED.md)**: Setup, Installation, Launching the Servers, CLI usage, and Team workflows.
* 🛠️ **[Developer & Reference Guide](./DEVELOPER.md)**: Database schemas, API endpoints reference, Python scripts, Lemma Agents, and feature implementation status.
* 🐧 **[Linux Install Guide](./INSTALL_LINUX.md)**: Spoon-fed setup guide for Ubuntu/Debian/Mint.
* 🪟 **[Windows Install Guide](./INSTALL_WINDOWS.md)**: Spoon-fed setup guide for Windows Native & WSL.

---

## 1. Core Concept Model

NexusDesk operates on a strict hierarchical structure that mirrors real academic life:

```
Semester  (name, startDate, endDate, isActive)
   └── Course  (subjectCode, name, creditWeight, facultyName, roomNumber, color)
         └── Session / Event  (LECTURE | EXAM | TUTORIAL | LAB, startTime, endTime, location)
               │     ├── recurring: yes (same slot every week via recurringGroupId)
               │     └── recurring: no  (one-shot: exam, make-up, seminar)
               ├── Artifact  (NOTE | SUMMARY | TRANSCRIPT | PDF | SLIDE | CODE — linked to session)
               └── Action / Task  (title, dueDate, priority, status, linkedCourseId)
```

**Everything flows from the Semester downward.** There are no orphan tasks or floating events — every piece of data has a clear academic owner.

---

## 2. System Architecture

NexusDesk runs as **four cooperating processes** on your local machine:

```
┌─────────────────────────────────────────────────────────────────┐
│                       YOUR MACHINE                              │
│                                                                 │
│  ┌──────────────────┐     API calls      ┌──────────────────┐  │
│  │  Vite Frontend   │ ─────────────────► │  Express API     │  │
│  │  React / TS      │ ◄───────────────── │  Server          │  │
│  │  Port: 19211     │                    │  Port: 8080      │  │
│  └──────────────────┘                    └────────┬─────────┘  │
│                                                   │            │
│                                          ┌────────▼─────────┐  │
│                                          │   SQLite DB      │  │
│                                          │   sqlite.db      │  │
│                                          └────────▲─────────┘  │
│                                                   │            │
│  ┌──────────────────┐     Polls DB &              │            │
│  │  Lemma Agentic   │ ────────────────────────────┘            │
│  │  Backend         │                                          │
│  │  Port: 4000      │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  Python Scripts  │  (invoked on-demand by API server)       │
│  │  Whisper / Gemini│                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

| Process | Port | Technology | Role |
|---|---|---|---|
| Vite Frontend | `19211` | React + TypeScript + Vite | Neo-brutalist UI, all user interactions |
| Express API Server | `8080` | Express + TypeScript + Drizzle | Database CRUD, AI ingestion, audio processing |
| Lemma Agentic Backend | `4000` | TypeScript + Lemma SDK | Background AI workflows, cron jobs |
| Python Scripts | N/A | Python 3, Whisper, Gemini SDK | Transcription, note generation, report creation |

**The frontend proxies all `/api/*` requests to port `8080`**, so during development you only need to open `localhost:19211`.

---

## 3. How to Use AI Features for Free

NexusDesk supports two free AI options for syllabus ingestion, conflict checks, and summaries:

1. **Option A: Google Gemini (Free API Key)** — *Recommended*
   - Get a free-tier API key from [Google AI Studio](https://aistudio.google.com/).
   - Add it to your `.env` file under `GEMINI_API_KEY`, `GOOGLE_API_KEY`, and `ANTIGRAVITY_API_KEY`.
   - Ensure the toggle in your Web UI is set to **ANTIGRAVITY PRO**.
2. **Option B: Local Ollama (100% Free & Offline)**
   - Download and run **Ollama** from [ollama.com](https://ollama.com/).
   - Pull the recommended models: `ollama pull Llama3` and `ollama pull llama3.2-vision`.
   - Ensure the toggle in your Web UI is set to **OLLAMA (LOCAL)**.
3. **Local Audio Transcription (100% Free & Offline)**
   - Convert recorded lectures to transcripts on your CPU offline.
   - The Python script automatically downloads the `base.en` Whisper model (~150MB) on the first run; no API keys or servers required.

---

## 4. Project Structure

```
nexusdesk/
├── artifacts/
│   ├── api-server/          # Express API server (port 8080)
│   │   └── src/routes/      # All API route handlers
│   └── nexusdesk/           # React + Vite frontend (port 19211)
│       └── src/
│           ├── pages/        # Route-level page components
│           └── components/   # Shared UI components
│
├── backend/                 # Lemma Agentic Backend (port 4000)
│   └── src/
│       ├── agents/          # AI agent definitions
│       ├── datastores/      # Student & enterprise data abstractions
│       └── workflows/       # Cron jobs & event-driven workflows
│
├── lib/
│   ├── db/                  # Drizzle ORM schema & client
│   │   ├── drizzle.config.ts
│   │   └── src/schema/      # One file per table
│   ├── api-spec/            # OpenAPI specification (openapi.yaml)
│   ├── api-client-react/    # Generated TypeScript API client (React hooks)
│   └── api-zod/             # Generated Zod validation types
│
├── scripts/                 # Python processing scripts
│   ├── class_transcriber.py
│   ├── gemini_note_taker.py
│   └── gemini_report_maker.py
│
├── bin/
│   ├── nexus                # Shell entrypoint for CLI
│   └── nexus.mjs            # CLI logic (capture, import, export)
│
├── recordings/              # Created at runtime
│   ├── audio/               # Captured audio files
│   └── notes/               # Generated note files
│
├── transcripts/             # Drop folder — Lemma watches this
├── sqlite.db                # Local database (created by setup.sh)
├── setup.sh                 # One-command install & schema setup
├── launch.sh                # One-command start all servers
└── .env                     # Local environment config (git-ignored)
```
