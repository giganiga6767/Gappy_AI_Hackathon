# NexusDesk
> Your academic desk. Quiet, intentional, and durable.

NexusDesk is a **local-first, offline-capable academic workspace** built for students and researchers. It combines a structured academic scheduler, an AI-powered ingestion inbox, a grade/CGPA simulator, and agentic background workflows — all stored in a single local SQLite file on your machine. No accounts. No cloud lock-in. No SaaS subscriptions.

---

## Table of Contents

1. [Core Concept Model](#1-core-concept-model)
2. [System Architecture](#2-system-architecture)
3. [Full Feature List](#3-full-feature-list)
4. [Database Schema](#4-database-schema)
5. [Setup & Installation](#5-setup--installation)
6. [Running the App](#6-running-the-app)
7. [CLI Tool — `nexus`](#7-cli-tool--nexus)
8. [API Reference](#8-api-reference)
9. [Python Processing Scripts](#9-python-processing-scripts)
10. [Agentic Backend — Lemma](#10-agentic-backend--lemma)
11. [Environment Variables](#11-environment-variables)
12. [Project Structure](#12-project-structure)
13. [Team Workflow Guide](#13-team-workflow-guide)
14. [Monorepo Package Map](#14-monorepo-package-map)

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

## 3. Full Feature List

### Semester & Course Management
- Create and manage **semesters** with start/end dates; mark one as **active**.
- Add **courses** per semester with subject code, credit weight, faculty name, room number, and a color tag.
- View all courses and their live attendance percentage against the configured minimum threshold (default: 75%).

### Session Scheduling (Events)
- Schedule **recurring weekly sessions** (lectures, tutorials, labs) — create once, repeat every week automatically via a shared `recurringGroupId`.
- Schedule **one-shot events** (exams, seminars, study halls, breaks).
- **Cancel individual sessions** with an optional note, without touching the rest of the series.
- Event types: `LECTURE`, `EXAM`, `TUTORIAL`, `LAB`, `SEMINAR`, `BREAK`, `OTHER`.

### Inbox Pipeline — Capture → Understand → Apply
The Inbox is the **entry point for all unstructured information**. It prevents AI hallucinations from directly corrupting your planner.

```
Capture  ──►  Understand (LLM)  ──►  Preview & Edit JSON  ──►  Apply to DB
(status: captured)               (status: understood)          (status: applied)
```

1. **Capture** — paste raw text, drag-and-drop a PDF/image/audio file, or record live audio. All items land in the `inbox` table with `status: captured`.
2. **Understand** — the API server runs the file through transcription (Whisper or Gemini) and passes the result to an LLM that extracts structured entities: courses, sessions, tasks, artifacts.
3. **Preview** — the web UI shows the extracted JSON in an editable form so you can fix any mistakes before committing.
4. **Apply** — on approval, data is written to the correct tables and the inbox item is archived as `applied`.

### Live Audio Recording & AI Notes
- Record **microphone audio** during a class directly from the CLI (`nexus capture --record`).
- Record **system audio loopback** to capture Zoom/Google Meet/YouTube (`nexus capture --record --system`).
- Audio is compressed from WAV to MP3 with ffmpeg automatically.
- Processing pipeline: `MP3 → Whisper/Gemini Transcription → Gemini Note Taker → Markdown + .docx notes`.
- Notes are saved to `recordings/notes/` and linked as resources to the relevant course.

### Attendance Tracker
- Mark attendance for any session: `ATTENDED`, `ABSENT`, `LATE`, `EXCUSED`.
- View per-course attendance summary: total sessions, attended, percentage.
- Visual warning when a course is approaching the minimum attendance threshold.

### Task & Action Manager
- Create tasks with: title, description, due date, status (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`), priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and category (`ACADEMICS`, `PROJECT`, `PERSONAL`, `ADMIN`).
- Link tasks to a course or project.
- Add tags (stored as JSON strings in SQLite).
- Kanban-style board view in the UI.

### Projects & Milestones
- Create long-term projects with status (`PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`), GitHub URL, Notion URL, start/target dates.
- Add **milestones** to each project with their own target dates and completion tracking.
- Log daily progress entries (`project_logs`) per project.

### Grade Ledger & CGPA Simulator
- Log grade items per course: CIE marks, SEE marks, assignments — with optional scaling.
- Exam types: `CIE`, `SEE`, `ASSIGNMENT`, `QUIZ`, `VIVA`, `PROJECT`, `OTHER`.
- View a **grade summary** per course (weighted average, projected SEE score needed).
- Log **CGPA records** per semester (SGPA + credits earned).
- Simulate **projected CGPA** scenarios by toggling `isProjected` records.

### Artifacts Store
- Store any academic output linked to a course or session: `NOTE`, `SUMMARY`, `REPORT`, `TRANSCRIPT`, `PDF`, `SLIDE`, `CODE`.
- Fields: title, content (text), filePath, tags, linkedCourseId, linkedSessionId, linkedInboxId.

### Resources Library
- Attach any file or URL to a course as a resource: `LINK`, `PDF`, `VIDEO`, `AUDIO`, `IMAGE`, `OTHER`.
- All resources are browsable per-course in the UI.

### Dashboard
- **Today view**: shows current and upcoming sessions for the day, outstanding tasks, and quick-action buttons.
- **Overview summary**: total courses, attendance snapshot, pending tasks count, CGPA at a glance.

### Zero Lock-in Export
Export your entire academic workspace at any time — no account deletion process, no data hostage:

```bash
./bin/nexus export zip    # Full package: calendar.ics + summary.md + actions.md + notes & recordings
./bin/nexus export ics    # Google Calendar / Apple Calendar compatible .ics file
./bin/nexus export json   # Raw JSON dump: courses, tasks, semester metadata
./bin/nexus export md     # Markdown progress summary
```

### Dual-Persona Mode (via Lemma backend)
The agentic backend supports two personas routed by the `triageAgent`:
- **Academic (Student)**: study plans, deadline management, learning resources.
- **Professional (Enterprise)**: blocked task resolution via the `EnterpriseUnblocker` workflow.

---

## 4. Database Schema

All data lives in `sqlite.db` at the project root. Managed by **Drizzle ORM**.

| Table | Purpose | Key Fields |
|---|---|---|
| `semesters` | Semester periods | `name`, `startDate`, `endDate`, `isActive` |
| `courses` | Courses per semester | `subjectCode`, `creditWeight`, `minAttendancePct`, `semesterId` |
| `events` | Sessions & events | `type`, `startTime`, `endTime`, `isRecurring`, `recurringGroupId`, `courseId` |
| `attendance` | Per-session attendance | `status` (ATTENDED/ABSENT/LATE/EXCUSED), `eventId`, `courseId` |
| `grades` | Grade items per course | `examType`, `obtainedMarks`, `maxMarks`, `isScaled`, `courseId` |
| `tasks` | Actions & to-dos | `status`, `priority`, `category`, `dueDate`, `linkedCourseId` |
| `projects` | Long-term projects | `status`, `githubUrl`, `startDate`, `targetDate` |
| `milestones` | Milestones per project | `status`, `targetDate`, `projectId` |
| `project_logs` | Daily progress logs | `content`, `date`, `projectId` |
| `cgpa_records` | CGPA per semester | `semesterNumber`, `sgpa`, `creditsEarned`, `isProjected` |
| `resources` | Files & links per course | `type`, `url`, `filePath`, `courseId` |
| `inbox` | Capture → Apply pipeline | `type`, `status`, `filePath`, `rawText`, `analysis` |
| `artifacts` | Generated academic outputs | `type`, `content`, `filePath`, `linkedCourseId`, `linkedSessionId` |

---

## 5. Setup & Installation

### System Prerequisites

Install system-level tools (Linux/Ubuntu):
```bash
sudo apt update && sudo apt install ffmpeg alsa-utils pulseaudio-utils zip -y
```

- **ffmpeg** — audio compression (WAV → MP3)
- **alsa-utils / pulseaudio-utils** — audio recording via CLI
- **zip** — export packaging

### Node.js
Requires **Node.js v20+** and **pnpm v9**.

Check your version:
```bash
node -v   # Should be v20.x or higher
```

### Run Setup
```bash
bash setup.sh
```

This script does the following in order:
1. Checks Node.js, Python3, and ffmpeg are installed.
2. Creates `.env` if it doesn't exist, prompting for an optional Gemini API key.
3. Sets `DATABASE_URL="file:<workspace>/sqlite.db"` in `.env`.
4. Runs `pnpm install` to install all workspace packages.
5. Installs Python dependencies from `requirements.txt` (if present).
6. Runs `pnpm --filter @workspace/db push` to create/migrate the SQLite schema.

> **Re-running is safe.** If `.env` already exists, setup skips key configuration and goes straight to install.

### Configure `.env` manually (optional)

```env
DATABASE_URL="file:./sqlite.db"
PORT=8080
PORT_FRONTEND=19211
GEMINI_API_KEY="your_google_ai_studio_key_here"
GOOGLE_API_KEY="your_google_ai_studio_key_here"
```

If no API key is provided, the system falls back to:
- **Transcription**: CPU-quantized `faster-whisper` model (runs locally, no GPU required)
- **LLM reasoning**: Local `Ollama` with `llama3` or `llama3.2-vision`

---

## 6. Running the App

```bash
bash launch.sh
```

This starts all three servers concurrently:

| Service | URL |
|---|---|
| Frontend UI | http://localhost:19211 |
| Express API | http://localhost:8080 |
| Lemma Backend | http://localhost:4000 |

Press `Ctrl+C` to stop all servers cleanly.

### Updating the database schema

After pulling changes that modify `lib/db/src/schema/`:
```bash
pnpm --filter @workspace/db push
```

---

## 7. CLI Tool — `nexus`

The `./bin/nexus` command provides terminal-first access to the workspace without opening a browser.

### Capture — queue anything into the Inbox

```bash
# Capture raw text (paste a syllabus, schedule, or meeting notes)
./bin/nexus capture --text "CS301 lectures: Mon/Wed 10-11am, Room 204, Prof. Kumar"

# Capture a local file (PDF, image, audio, notes)
./bin/nexus capture --file ./syllabus.pdf --title "CS301 Syllabus" --type pdf

# Capture a local file (shorthand alias)
./bin/nexus import ./syllabus.pdf --title "CS301 Syllabus"

# Record live microphone audio (Press Ctrl+C to stop)
./bin/nexus capture --record --title "CS301 Lecture - Week 3"

# Record system audio loopback (Zoom, YouTube, Google Meet)
./bin/nexus capture --record --system --title "Guest Lecture Recording"
```

After capturing, open the web UI at `localhost:19211` → Inbox to review and apply the extracted data.

### Export — take your data anywhere

```bash
# Full zero-lock-in export (ZIP with calendar, notes, actions, recordings)
./bin/nexus export zip

# Calendar only (import into Google Calendar, Apple Calendar, Outlook)
./bin/nexus export ics

# Raw JSON dump
./bin/nexus export json

# Markdown progress summary
./bin/nexus export md
```

Output files are created in the project root directory.

---

## 8. API Reference

Base URL: `http://localhost:8080`

All endpoints use JSON. IDs are UUIDs.

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server health check + DB connectivity |

### Semesters
| Method | Path | Description |
|---|---|---|
| GET | `/semesters` | List all semesters |
| POST | `/semesters` | Create a semester |
| PATCH | `/semesters/:id` | Update a semester |
| DELETE | `/semesters/:id` | Delete a semester |

### Courses
| Method | Path | Description |
|---|---|---|
| GET | `/courses` | List courses (filter: `?semesterId=`) |
| POST | `/courses` | Create a course |
| PATCH | `/courses/:id` | Update a course |
| DELETE | `/courses/:id` | Delete a course |

### Events (Sessions)
| Method | Path | Description |
|---|---|---|
| GET | `/events` | List events (filter: `?courseId=`, `?startDate=`, `?endDate=`) |
| POST | `/events` | Create an event (set `isRecurring: true` + `recurringGroupId` for series) |
| PATCH | `/events/:id` | Update an event |
| POST | `/events/:id/cancel` | Cancel a specific session with an optional note |
| DELETE | `/events/:id` | Delete an event |

### Attendance
| Method | Path | Description |
|---|---|---|
| GET | `/attendance` | List records (filter: `?courseId=`, `?eventId=`) |
| POST | `/attendance` | Mark attendance for a session |
| PATCH | `/attendance/:id` | Update attendance status |
| GET | `/attendance/summary/:courseId` | Get attendance % summary for a course |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/tasks` | List tasks (filter: `?status=`, `?priority=`, `?courseId=`) |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update a task (status, priority, etc.) |
| DELETE | `/tasks/:id` | Delete a task |

### Grades
| Method | Path | Description |
|---|---|---|
| GET | `/grades` | List grade items (filter: `?courseId=`) |
| POST | `/grades` | Log a grade item |
| PATCH | `/grades/:id` | Update a grade item |
| DELETE | `/grades/:id` | Delete a grade item |
| GET | `/grades/summary/:courseId` | Get grade summary for a course |

### CGPA
| Method | Path | Description |
|---|---|---|
| GET | `/cgpa` | List all CGPA records |
| POST | `/cgpa` | Log a semester CGPA/SGPA record |
| PATCH | `/cgpa/:id` | Update a CGPA record |
| DELETE | `/cgpa/:id` | Delete a CGPA record |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create a project |
| PATCH | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project |
| GET | `/projects/:id` | Get project detail with milestones and logs |
| POST | `/projects/:id/milestones` | Add a milestone |
| POST | `/projects/:id/logs` | Add a progress log entry |

### Resources
| Method | Path | Description |
|---|---|---|
| GET | `/resources` | List resources (filter: `?courseId=`) |
| POST | `/resources` | Add a resource |
| DELETE | `/resources/:id` | Delete a resource |

### Inbox
| Method | Path | Description |
|---|---|---|
| GET | `/inbox` | List inbox items |
| POST | `/inbox` | Add an item to the inbox |
| POST | `/ingest` | Trigger AI parsing of an inbox item (text/image/PDF) |
| POST | `/inbox/:id/apply` | Apply an understood item's extracted data to the database |
| DELETE | `/inbox/:id` | Delete an inbox item |

### Audio Processing
| Method | Path | Description |
|---|---|---|
| POST | `/record/process` | Trigger transcription + note generation for an audio file |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Today's sessions, pending tasks, attendance snapshot |

---

## 9. Python Processing Scripts

Located in `scripts/`. Invoked by the Express API server as child processes.

### `class_transcriber.py`
Transcribes audio recordings to text.

**Modes:**
- **Local (default)**: Uses `faster-whisper` with `base.en` model. Runs on CPU, no GPU required. Downloads ~150MB model on first run.
- **Cloud**: Uses `Gemini 1.5/2.0 Flash` multimodal audio understanding. Requires `GEMINI_API_KEY`.

```bash
python3 scripts/class_transcriber.py --input recordings/audio/lecture.mp3 --output transcripts/
```

### `gemini_note_taker.py`
Converts a raw transcript into structured notes.

**Output:**
- Formatted **Markdown** file with sections, key concepts, and action items.
- Styled **Microsoft Word (.docx)** document with headings, bullet points, and formatting.

```bash
python3 scripts/gemini_note_taker.py --transcript transcripts/lecture.txt --course "CS301"
```

### `gemini_report_maker.py`
Multimodal report generator. Combines text, CSV data, and images to create analytical reports with generated charts.

```bash
python3 scripts/gemini_report_maker.py --data grades.csv --images chart1.png --title "Semester Report"
```

---

## 10. Agentic Backend — Lemma

The Lemma backend runs on port `4000` and manages long-running intelligent workflows. It uses the **Lemma SDK** for agent orchestration.

### Triage Agent (`triageAgent.ts`)
Routes incoming transcripts from the `./transcripts/` folder:
- Classifies content as **Academic** or **Professional/Enterprise**.
- Stores academic items in `studentDatastore`.
- Stores enterprise items in `enterpriseDatastore`.

### Academic Proactive Copilot (`academicCopilot.ts`)
Triggered by the cron job for each upcoming task:
- Analyzes the task type and deadline urgency.
- Generates a **tailored study strategy** (spaced repetition for exams, outline-first for assignments, agile milestones for projects).
- Finds **curated learning resources**: YouTube explainer videos, open-access papers, practice platforms (Khan Academy, Anki, LeetCode, etc.).
- Writes the study plan and resources back to the task in the database.

### Enterprise Solution Architect (`enterpriseSolutionArch.ts`)
Triggered when a task is marked `BLOCKED`:
- Analyzes the blocker context.
- Generates actionable unblocking suggestions.
- Stores resolution back in the enterprise datastore.

### Background Workflows

| Workflow | Trigger | Action |
|---|---|---|
| **Ingestion Watcher** | New file in `./transcripts/` | Runs `triageAgent`, routes to correct datastore |
| **Academic Cron Job** | Daily at 08:00 AM | Scans tasks due within 7 days, runs `academicCopilot` for each |
| **Enterprise Unblocker** | Task status → `BLOCKED` | Runs `enterpriseSolutionArch` to suggest fixes |

---

## 11. Environment Variables

Create a `.env` file in the project root. `setup.sh` generates it automatically.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `file:./sqlite.db` | Path to the local SQLite database file |
| `PORT` | No | `8080` | Port for the Express API server |
| `PORT_FRONTEND` | No | `19211` | Port for the Vite frontend dev server |
| `GEMINI_API_KEY` | No | _(empty)_ | Google AI Studio key — enables Gemini for transcription & note taking |
| `GOOGLE_API_KEY` | No | _(same as above)_ | Alias for Gemini key used by some scripts |
| `ANTIGRAVITY_API_KEY` | No | _(same as above)_ | Internal alias used by certain agent configurations |

> **Offline mode**: Leave all API keys empty. The system uses `faster-whisper` (CPU) for transcription and local Ollama for LLM tasks. Install Ollama separately and pull `llama3` or `llama3.2-vision`.

---

## 12. Project Structure

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

## 13. Team Workflow Guide

### Onboarding a new team member

```bash
# 1. Clone the repo
git clone <repo-url>
cd nexusdesk

# 2. Run setup (installs everything + creates sqlite.db)
bash setup.sh
# → Enter Gemini API key when prompted, or press Enter for offline mode

# 3. Launch the workspace
bash launch.sh

# 4. Open the UI
# → http://localhost:19211
```

### Day-to-Day Workflow

**Starting your day:**
```bash
bash launch.sh
```
Open `localhost:19211` → the Dashboard shows today's sessions and pending tasks.

**Capturing a class syllabus or schedule:**
```bash
# Option A: Paste text directly
./bin/nexus capture --text "<paste syllabus text here>"

# Option B: Import a PDF
./bin/nexus import ./CS301_syllabus.pdf

# Then → open Inbox in the UI → review extracted data → click Apply
```

**Recording a class:**
```bash
# Start recording (Ctrl+C to stop when class ends)
./bin/nexus capture --record --title "CS301 Lecture Week 5"

# After stopping → recording appears in Inbox → click Process → review notes → Apply
```

**Pulling changes from teammates:**
```bash
git pull

# If schema changed (lib/db/src/schema/ was modified):
pnpm --filter @workspace/db push
```

> **Important**: `sqlite.db` is your local data file. It is `.gitignore`d. Each team member has their own local database — you do not share one.

**Exporting your data before semester end:**
```bash
./bin/nexus export zip
# Creates semester.zip in the project root with all your notes, calendar, and task list
```

### Shared Development Rules

- **Never commit `sqlite.db`** — it's personal data and is already in `.gitignore`.
- **Never commit `.env`** — it contains API keys and is already in `.gitignore`.
- **After adding/changing a DB table**, run `pnpm --filter @workspace/db push` locally and document the change so teammates know to run it too.
- **Python scripts** require `requirements.txt` to be up-to-date. Run `pip install -r requirements.txt` after pulling.
- The frontend proxies `/api/*` → `localhost:8080` automatically. Never hardcode `localhost:8080` in frontend components — use the generated API client from `@workspace/api-client-react`.

---

## 14. Monorepo Package Map

This is a **pnpm workspace** monorepo. Packages reference each other via `@workspace/*` aliases.

| Package name | Path | Description |
|---|---|---|
| `@workspace/api-server` | `artifacts/api-server/` | Express REST API + Drizzle queries |
| `@workspace/nexusdesk` | `artifacts/nexusdesk/` | React + Vite frontend application |
| `@workspace/db` | `lib/db/` | Drizzle schema, migrations, DB client |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI 3.x spec (`openapi.yaml`) |
| `@workspace/api-client-react` | `lib/api-client-react/` | Auto-generated React query hooks |
| `@workspace/api-zod` | `lib/api-zod/` | Auto-generated Zod validation schemas |
| `work-study-backend` | `backend/` | Lemma agentic backend (port 4000) |
| `scripts` | `scripts/` | Utility TypeScript scripts |

### Regenerating the API client

When you change `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```
This regenerates `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`.

---

## 15. Implementation Status

### ✅ Implemented

| Feature | Status | Notes |
|---|---|---|
| **Database Foundation** | ✅ Complete | Drizzle ORM + libsql/SQLite, portable `NEXUSDESK_DB_URL`, schema indexes on courseId, status, date |
| **Semester Management** | ✅ Complete | Full CRUD — `GET/POST/PATCH/DELETE /api/semesters` |
| **Course Management** | ✅ Complete | Full CRUD, real-time attendance stats (`effectivePct`, `canSkip`, `mustAttend`) |
| **Event / Schedule** | ✅ Complete | Recurring event generation, cancel endpoint, enriched with courseShortName + attendance |
| **Attendance Tracking** | ✅ Complete | Mark present/absent per event, per-course aggregates, at-risk detection |
| **Task Kanban** | ✅ Complete | TODO / IN_PROGRESS / DONE lanes, priority levels, category filter, inline create |
| **CGPA Simulator** | ✅ Complete | Historical semester records, SGPA-weighted CGPA projection tool |
| **Inbox Pipeline** | ✅ Complete | Capture → Understand (Gemini/Ollama) → Structured Preview & Edit → Apply |
| **Inbox UX** | ✅ Complete | Structured form preview (not raw JSON), editable courses/sessions/actions |
| **Export** | ✅ Complete | ZIP export of all data, ICS calendar |
| **Dashboard / Today** | ✅ Complete | Current session, upcoming events, attendance health, pending actions |
| **Planner / Calendar** | ✅ Complete | Weekly/monthly view, exam timeline, session cancellations |
| **Course Detail** | ✅ Complete | Grade ledger, attendance gauge, session list |
| **Demo Mode** | ✅ Complete | `POST /api/demo/seed` seeds 5 courses, 290+ events, 250+ attendance records, 8 tasks, CGPA history |
| **Hardcoded Path Fix** | ✅ Complete | All `/home/niranjan/...` paths replaced with `process.env.NEXUSDESK_ROOT` fallback |
| **DB Indexes** | ✅ Complete | Indexes on `courseId`, `startTime`, `status`, `category`, `dueDate`, `recurringGroupId` |

### 📋 Planned

| Feature | Priority | Notes |
|---|---|---|
| **Projects Page** | Medium | Milestones, team members, linked tasks — backend ready, frontend stub present |
| **Resources Page** | Medium | File library linked to courses — backend ready, frontend stub present |
| **Class Notes (Audio)** | Medium | Record audio in-session, auto-transcribe + summarize via Whisper/Gemini |
| **Artifacts Viewer** | Low | Browse all ingested notes, PDFs, transcripts |
| **ICS Calendar Sync** | Medium | Export full semester schedule as `.ics` for import into Google Calendar |
| **Offline PWA** | Low | Service worker for full offline operation |
| **Bulk Attendance Mark** | Low | Mark entire week as present/absent in one click |
| **Push Notifications** | Low | Browser notifications for upcoming sessions |
| **Python Whisper Integration** | Medium | Local audio transcription without Gemini API key |
| **Multi-semester View** | Low | Cross-semester CGPA graph, grade history |

---

*NexusDesk is intentionally self-contained. If you can run `bash setup.sh && bash launch.sh`, you have a fully functional academic OS. No accounts, no subscriptions, no internet required.*
