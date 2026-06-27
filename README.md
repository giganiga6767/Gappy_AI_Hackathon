# NexusDesk: Offline-First Agentic Academic Workspace

NexusDesk solves the single biggest point of failure in student productivity: the tedious, manual data entry required to set up and maintain calendars, assignments, and study schedules.

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

---

## The 60-Second "Magic Demo" Ingestion Flow

1. **Ingest**: Import an academic syllabus (`./bin/nexus import syllabus.pdf`).
2. **AI Analysis**: The background engine automatically parses the document.
3. **Commit**: Review automatically extracted courses, recurring schedules, task priorities, and project milestones in the Web Inbox, then click "Apply."
4. **Result**: Your semester calendar, Kanban board, grade ledger, and spaced study plans are instantly provisioned in your local database.

---

## Documentation Quick Links

* **[Product Feature Showcase](./FEATURES.md)**: Detailed breakdown of the AI Ingestion Inbox, non-blocking audio pipeline, and GPA simulator.
* **[Friendly Onboarding Guide](./GETTING_STARTED.md)**: Setup, launching background services, CLI usage, and daily workflows.
* **[Developer & Reference Guide](./DEVELOPER.md)**: Database schemas, API reference, Lemma agent architecture, and code package map.
* **[Linux Installation Guide](./INSTALL_LINUX.md)**: Spoon-fed setup guide for Ubuntu, Debian, and Linux Mint.
* **[Windows Installation Guide](./INSTALL_WINDOWS.md)**: Native and WSL installation instructions.

---

## What Makes NexusDesk Different?

1. **Zero-Friction Ingestion Engine**: No more manual calendar typing or task scheduling. Drop files, text, or recordings, and the system extracts structured data.
2. **Local-First & Offline Privacy**: All data resides in a single SQLite database file on your machine. All core features (including audio transcription and task extraction) run offline. No cloud accounts, no subscriptions.
3. **Agentic Workflows**: Powered by three specialized background agents via the Lemma SDK that proactively manage study strategies, triage incoming items, and resolve project blockers.

---

## Lemma SDK & Agentic Integration

NexusDesk integrates three background agents to automate student operations:

* **Triage Agent** (`triageAgent.ts`): Automatically scans raw incoming transcripts in the `./transcripts/` directory, extracts actionable checklist items, and routes them to student records.
* **Academic Copilot Agent** (`academicCopilot.ts`): Triggers via event webhooks when a new task is created. It analyzes task parameters to generate custom study roadmaps and recommend video/text learning resources.
* **Enterprise Solution Architect** (`enterpriseSolutionArch.ts`): Monitors projects and triggers troubleshooting advice if a milestone becomes blocked.

API server mutations dispatch webhooks directly to the Lemma backend to trigger these agentic background runs asynchronously, keeping client-side operations fast and non-blocking.

---

## Core Concept Model

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

**Everything flows from the Semester downward.** Data is cleanly partitioned, eliminating floating tasks and orphaned events.

---

## System Architecture

NexusDesk runs as four cooperating processes on your local machine:

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
| Vite Frontend | `19211` | React + TypeScript + Vite | Neo-brutalist UI dashboard, all user interactions |
| Express API Server | `8080` | Express + TypeScript + Drizzle | Database CRUD, AI ingestion, audio processing |
| Lemma Agentic Backend | `4000` | TypeScript + Lemma SDK | Background AI workflows, cron jobs |
| Python Scripts | N/A | Python 3, Whisper, Gemini SDK | Transcription, note generation, report creation |

*The React frontend proxies all `/api/*` requests to port `8080` automatically.*

---

## Project Structure

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

---

## Quick Start in 3 Steps

Get NexusDesk up and running in under 2 minutes:

1. **Install System Dependencies**
   ```bash
   sudo apt update && sudo apt install ffmpeg zip -y
   ```
2. **Run Setup**
   ```bash
   bash setup.sh
   ```
   *(Installs dependencies, provisions the local SQLite database schema, and configures environment variables).*
3. **Launch the Workspace**
   ```bash
   bash launch.sh
   ```
   *Open [http://localhost:19211](http://localhost:19211) in your browser.*
