# Developer & Reference Guide

This document contains full specifications for database schemas, internal APIs, processing scripts, agentic architectures, and development workflows.

---

## 1. Database Schema

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

## 2. API Reference

Base URL: `http://localhost:8080`
All endpoints use JSON. IDs are UUIDs.

### Health & Core
- `GET /health`: Server health check + DB connectivity
- `GET /dashboard`: Today's sessions, pending tasks, attendance snapshot

### Semesters & Courses
- `GET /semesters`: List all semesters
- `POST /semesters`: Create a semester
- `PATCH /semesters/:id`: Update a semester
- `DELETE /semesters/:id`: Delete a semester
- `GET /courses`: List courses (filter: `?semesterId=`)
- `POST /courses`: Create a course
- `PATCH /courses/:id`: Update a course
- `DELETE /courses/:id`: Delete a course

### Events (Sessions) & Attendance
- `GET /events`: List events (filter: `?courseId=`, `?startDate=`, `?endDate=`)
- `POST /events`: Create an event (set `isRecurring: true` + `recurringGroupId` for series)
- `PATCH /events/:id`: Update an event (supports `?series=true` query param to update recurring series)
- `DELETE /events/:id`: Delete an event (supports `?series=true` query param to delete recurring series)
- `POST /events/:id/cancel`: Cancel a session (supports `?series=true` to cancel recurring series)
- `GET /attendance`: List records (filter: `?courseId=`, `?eventId=`)
- `POST /attendance`: Mark attendance for a session
- `PATCH /attendance/:id`: Update attendance status
- `GET /attendance/summary/:courseId`: Get attendance percentage summary

### Tasks & Grades
- `GET /tasks`: List tasks (filter: `?status=`, `?priority=`, `?courseId=`)
- `POST /tasks`: Create a task (triggers `task:created` event webhook)
- `PATCH /tasks/:id`: Update a task (triggers `task:updated` event webhook)
- `DELETE /tasks/:id`: Delete a task
- `GET /grades`: List grade items (filter: `?courseId=`)
- `POST /grades`: Log a grade item
- `PATCH /grades/:id`: Update a grade item
- `DELETE /grades/:id`: Delete a grade item
- `GET /grades/summary/:courseId`: Get grade summary

### Projects & CGPA
- `GET /projects`: List all projects
- `POST /projects`: Create a project
- `PATCH /projects/:id`: Update a project
- `DELETE /projects/:id`: Delete a project
- `GET /projects/:id`: Get project detail with milestones and logs
- `POST /projects/:id/milestones`: Add a milestone
- `POST /projects/:id/logs`: Add a progress log entry
- `GET /cgpa`: List all CGPA records
- `POST /cgpa`: Log a semester CGPA/SGPA record
- `PATCH /cgpa/:id`: Update a CGPA record
- `DELETE /cgpa/:id`: Delete a CGPA record

### Inbox & Ingestion
- `GET /inbox`: List inbox items
- `POST /inbox`: Add an item to the inbox
- `POST /ingest`: Trigger AI parsing of an inbox item (text/image/PDF)
- `POST /inbox/:id/conflicts`: Validate courses, tasks, and schedule overlaps before applying
- `POST /inbox/:id/apply`: Apply an understood item's data to the database (triggers `syllabus:applied` event webhook)
- `DELETE /inbox/:id`: Delete an inbox item

### Audio Processing
- `POST /record/process`: Trigger background audio transcription + note generation (returns `202 Accepted` and a `jobId`)
- `GET /record/status/:jobId`: Check the status/progress and get the results of an active audio pipeline job

---

## 3. Python Processing Scripts

Located in `scripts/`. Invoked by the Express API server as child processes.

### `class_transcriber.py`
Transcribes audio recordings to text.
- **Local Mode (default)**: Uses `faster-whisper` with `base.en` model. Runs on CPU, no GPU required. Downloads ~150MB model on first run.
- **Cloud Mode**: Uses `Gemini 1.5/2.0 Flash` multimodal audio understanding. Requires `GEMINI_API_KEY`.
```bash
python3 scripts/class_transcriber.py --input recordings/audio/lecture.mp3 --output transcripts/
```

### `gemini_note_taker.py`
Converts a raw transcript into structured notes:
- Formatted **Markdown** file with sections, key concepts, and action items.
- Styled **Microsoft Word (.docx)** document with headings, bullet points, and custom formatting.
```bash
python3 scripts/gemini_note_taker.py --transcript transcripts/lecture.txt --course "CS301"
```

### `gemini_report_maker.py`
Multimodal report generator. Combines text, CSV data, and images to create analytical reports with generated charts.
```bash
python3 scripts/gemini_report_maker.py --data grades.csv --images chart1.png --title "Semester Report"
```

---

## 4. Agentic Backend & AI Copilot Architecture

The Lemma backend runs on port `4000` and manages background agentic workflows. In parallel, a Google Gemini-driven **Academic Copilot** is fully embedded in the core Express API server and React frontend:
- **AI Meeting to Execution Operator**: Converts unstructured transcripts and syllabus PDFs (captured via Web UI or CLI) into structured tasks, schedules, and priorities on a Neo-Brutalist Kanban execution board.
- **Proactive Milestone Generator**: Intelligently creates spaced study prep tasks for exams and structures milestones for complex projects automatically.
- **On-Demand AI Copilot**: Any manually added task can be instantly supercharged with a single click inside the task details view, generating a custom study strategy and curated video/text resource recommendations.
- **AI Second Brain**: Feeds resources, schedules, and notes into background agents (via the Lemma SDK) to guide study paths and troubleshoot project blockages.

### How Lemma is Integrated

#### 1. Data Layer: Lemma Records API
Our student and professional datastores ([studentDatastore.ts](./backend/src/datastores/studentDatastore.ts) and [enterpriseDatastore.ts](./backend/src/datastores/enterpriseDatastore.ts)) use the **Lemma Records API** (`lemmaClient.records`) to store, update, and manage structured tasks, milestones, and learning assets.

#### 2. Agent Layer: Lemma Agents & Conversations API
We run three custom autonomous agents using `lemmaClient.agents.run`:
- **Triage Agent** (`triageAgent.ts`): Routes incoming audio transcripts from the `./transcripts/` folder. It classifies content as **Academic** or **Professional**, extracts action items, owners, and deadlines, and routes them to the correct Record store.
- **Academic Proactive Copilot** (`academicCopilot.ts`): Triggered by a webhook on task changes. It evaluates deadline urgency and generates customized study strategies (e.g. spaced repetition for exams) along with curated external resources (e.g. YouTube explainers, practice problems).
- **Enterprise Solution Architect** (`enterpriseSolutionArch.ts`): Triggered when a task status becomes `BLOCKED`. It inspects the blocker context and writes actionable troubleshooting recommendations back to the datastore.

#### 3. Webhook Events Dispatcher
API server mutations dispatch webhooks directly to the Lemma backend on `http://127.0.0.1:4000/api/agent/events` to trigger immediate background agent execution:
- `task:created` / `task:updated` ➔ Triggers the `AcademicCopilot` agent to scan and strategy-prep tasks.
- `syllabus:applied` ➔ Triggers the `runWeeklyDigest()` workflow to update the dashboard report.

---

## 5. Monorepo Package Map

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

## 6. Implementation Status

### ✅ Implemented Features

- **Database Foundation**: Drizzle ORM + libsql/SQLite, portable `NEXUSDESK_DB_URL`, schema indexes on courseId, status, date.
- **Semester Management**: Full CRUD (`GET/POST/PATCH/DELETE /api/semesters`).
- **Course Management**: Full CRUD, real-time attendance stats (`effectivePct`, `canSkip`, `mustAttend`).
- **Event / Schedule**: Recurring series generation, instance cancellations, and series-aware recurring exceptions (series delete/update/cancel).
- **Attendance Tracking**: Mark present/absent per event, per-course aggregates, at-risk detection.
- **Task Kanban**: TODO / IN_PROGRESS / DONE lanes, priority levels, category filter, inline create.
- **CGPA Simulator**: Historical semester records, SGPA-weighted CGPA projection tool.
- **Inbox Ingestion**: Non-blocking background ingestion, real-time polling, and smart conflict checks (courses, tasks, schedule overlaps).
- **Inbox UX**: Structured form preview (not raw JSON), editable courses/sessions/actions, and potential conflict alerts.
- **Export**: ZIP export of all data, ICS calendar.
- **Dashboard / Today**: Current session, upcoming events, attendance health, pending actions.
- **Planner / Calendar**: Weekly/monthly view, exam timeline, session cancellations.
- **Course Detail**: Grade ledger, attendance gauge, session list.
- **Demo Mode**: `POST /api/demo/seed` seeds 5 courses, 290+ events, 250+ attendance records, 8 tasks, CGPA history.
- **Hardcoded Path Fix**: All hardcoded user home paths replaced with `process.env.NEXUSDESK_ROOT` fallback.
- **DB Indexes**: Indexes on `courseId`, `startTime`, `status`, `category`, `dueDate`, `recurringGroupId`.
- **Class Notes (Audio)**: Live Web UI recording with mic/screen/tab/mix, non-blocking background audio pipeline, and multi-stage progress tracking.
- **Resources Page**: Browsable per-course materials, custom document upload, and AI resource recommendations.
- **Projects Page**: Progress entry logs, project details, linked tasks, and milestone timelines.
- **ICS Calendar Sync**: Zero Lock-in ZIP export containing Google Calendar compatible `calendar.ics`.
- **Python Whisper Integration**: Local faster-whisper audio transcription support without API key.
- **Lemma Agentic Hooks**: Event-driven event webhook dispatcher that decouples API mutations and triggers Lemma workflows asynchronously.
