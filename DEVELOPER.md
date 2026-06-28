# Developer & Reference Guide

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

---

## Architecture Summary
NexusDesk is structured as a pnpm monorepo consisting of a React Vite frontend, an Express API server, and a Lemma agentic backend, communicating locally via REST and Webhook payloads. All application states are stored locally inside a single SQLite file (`sqlite.db`) managed via Drizzle ORM. Python-based subprocesses handle heavy workloads like offline Whisper transcription and multimodal document summary generations.

---

## Core Centerpiece: Lemma Agentic Architecture

The background execution engine runs on port `4000` via the Lemma SDK. It leverages a student datastore, an enterprise datastore, and three custom autonomous agents to manage workloads:

```
                  ┌───────────────────────────────┐
                  │      Express API Server       │
                  │         (Port 8080)           │
                  └──────────────┬────────────────┘
                                 │ Webhook
                                 │ (e.g. task:created)
                                 ▼
                  ┌───────────────────────────────┐
                  │    Lemma Agentic Backend      │
                  │         (Port 4000)           │
                  └──────┬───────────────┬────────┘
                         │               │
            ┌────────────▼───┐       ┌───▼────────────┐
            │  Triage Agent  │       │Academic Copilot│
            │ (Audio Routing)│       │ (Study Plans)  │
            └────────────────┘       └───────┬────────┘
                                             │ Triggered
                                             ▼
                                     ┌────────────────┐
                                     │   Enterprise   │
                                     │   Architect    │
                                     │(Blocker Solver)│
                                     └────────────────┘
```

### 1. The 3 Custom Autonomous Agents
* **Triage Agent** (`triageagent`): Monitors the `./transcripts/` directory for incoming text files. It parses transcripts using natural language processing to extract actionable items, determines whether they are Academic or Professional, and routes them to the correct Datastore.
* **Academic Copilot** (`academicproactivecopilot`): Automatically runs when a task is created or updated. It scans the due date, evaluates its priority, and writes spaced repetition study milestones (e.g., preparation steps at 7, 3, and 1 day prior) along with custom video and documentation recommendations back to the datastore.
* **Enterprise Solution Architect** (`enterprisesolutionarchitect`): Automatically triggers when a project or milestone status is set to `BLOCKED`. It analyzes the blocking issue description and generates troubleshooting instructions for the user.

Reasoning traces, plans, and conversational history for all 3 agents are persisted inside the Postgres datastore and can be inspected inside the **AGENT TRACES** tab in the dashboard.

### 2. Events & Webhook Integrations
API server database mutations dispatch event payloads directly to the Lemma backend at `http://127.0.0.1:4000/api/agent/events` to trigger agent tasks asynchronously:
* `task:created` / `task:updated` ➔ Prompts the `academicproactivecopilot` agent to generate learning strategies.
* `syllabus:applied` ➔ Prompts the `runWeeklyDigest()` workflow to update the overall dashboard roadmap.

---

## Database Schema

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

## API Reference

Base URL: `http://localhost:8080` (JSON-based payloads, UUID keys).

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

## Python Processing Scripts

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

## Monorepo Package Map

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

## Contributing & Development Flow

To contribute to NexusDesk:
1. **Branch creation**: Branch off `main` for feature development.
2. **Schema updates**: Edit schema models under `lib/db/src/schema/`. Update the SQLite DB using:
   ```bash
   pnpm --filter @workspace/db push-force
   ```
3. **Rebuild Express API**: If you update routing logic, rebuild using:
   ```bash
   npx pnpm@9 --filter @workspace/api-server run build
   ```
4. **Local Verification**: Execute test suites using local test frameworks, ensuring all `129/130 passes` are preserved.
