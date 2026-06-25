# 🧠 AI Agent Instructions & System Specification
### NexusDesk — Academic & Professional Command Center

This file is designed for Google Antigravity, Cursor AI, and other agentic coding tools. It provides the full architectural blueprint, database models, strict design regulations, and API workflows of **NexusDesk** so the AI can automatically review files, understand the context, and resolve errors or type mismatches.

---

## 1. Project Stack & Architecture
- **Monorepo Structure**: Managed via `pnpm` workspaces.
- **Frontend**: React + Vite + Wouter (for routing) + TanStack React Query + Lucide Icons + Recharts.
- **Backend API**: Node.js + Express 5.
- **Database Layer**: PostgreSQL + Drizzle ORM.
- **Workspaces Directory Map**:
  - `artifacts/nexusdesk/` — React frontend application.
  - `artifacts/api-server/` — Express backend API.
  - `lib/db/` — Shared database schema definitions and migrations.
  - `lib/api-zod/` — Zod runtime validation schemas generated from OpenAPI specs.
  - `lib/api-client-react/` — React Query hooks generated from OpenAPI specs.

---

## 2. Strict Design Directives (Muted Neo-Brutalist Law)
All frontend edits made by the agent must strictly conform to these Neo-Brutalist style tokens:
- **Zero Border Radius**: Force `border-radius: 0px` globally on all cards, buttons, dialogs, badges, and inputs.
- **Thick Outlines**: All interactive and structural components use `border-2 border-ink` (not `border` or `border-t`).
- **Brutalist Flat Shadows**: No blur radius. Only solid offset blocks:
  - `shadow-brutal`: `4px 4px 0px 0px #2D2D2D`
  - `shadow-brutal-sm`: `2px 2px 0px 0px #2D2D2D`
  - `shadow-brutal-accent`: `4px 4px 0px 0px #C4614A`
  - `shadow-brutal-sage`: `4px 4px 0px 0px #6B7F52`
- **Muted Color Palette**:
  - Paper: `#F1F0E8` (Main workspace background)
  - Surface: `#E8E7DF` (Card/panel background)
  - Surface Hover: `#DDDCD4`
  - Ink: `#2D2D2D` (Primary text and borders)
  - InkLight: `#5A5A5A` (Muted/secondary text)
  - Terracotta: `#C4614A` (Warning state / red accent)
  - Sage: `#6B7F52` (Success state / green accent)
  - Amber: `#B8872A` (Conditional state / orange-yellow accent)
- **Typography Layout**:
  - Headings: `Space Grotesk` (weights 700/800).
  - Body Text: `Inter`.
  - Metrics, percentages, and times: `JetBrains Mono`.

---

## 3. Database Schema Models (Drizzle ORM)
Located in `lib/db/src/schema/`. Refer to this schema when writing DB mutations:

### `eventsTable` (schema/events.ts)
- `id`: primary key (UUID)
- `title`: text (not null)
- `type`: text (default "LECTURE", can be "LECTURE", "LAB", "EXAM", "TUTORIAL", "MEETING", "BREAK", "PERSONAL")
- `startTime`: timestamp with timezone (not null)
- `endTime`: timestamp with timezone (not null)
- `location`: text
- `isCancelled`: boolean (default false)
- `cancellationNote`: text
- `isRecurring`: boolean (default false)
- `recurringGroupId`: text
- `courseId`: text (references coursesTable)

### `tasksTable` (schema/tasks.ts)
- `id`: primary key (UUID)
- `title`: text (not null)
- `description`: text
- `status`: text (default "TODO", can be "TODO", "IN_PROGRESS", "DONE")
- `priority`: text (default "MEDIUM", can be "LOW", "MEDIUM", "HIGH", "CRITICAL")
- `category`: text (not null, can be student: `HOMEWORK_SCHOOL`, `EXTRACURRICULAR`, `EXAM_PREP`, `PERSONAL` or professional: `SAGE_SPRINT`, `PRODUCTION_OPS`, `CLIENT_CRM`, `LOGISTICS`)
- `dueDate`: timestamp with timezone
- `confidenceScore`: integer
- `reasoningQuote`: text

### `coursesTable` (schema/courses.ts)
- `id`: primary key (UUID)
- `subjectCode`: text (not null, e.g. EC301)
- `name`: text (not null)
- `shortName`: text
- `facultyName`: text
- `roomNumber`: text
- `creditWeight`: integer
- `minAttendancePct`: integer (default 75)

---

## 4. Workspaces & Modes
- **Student Mode**: Shows course ledger, attendance skip/recovery calculations, homework tasks, and academic calendar.
- **Professional Mode**: Displays billable client hours, roadmap releases, professional kanban pipelines, standups/meetings, and drafted follow-up email features.
- **Timeline Isolation Policy**:
  - Student timetable shows academic lectures, labs, tutorials, and breaks.
  - Professional standup timeline must **never** leak academic data. It strictly filters out any event linked to a course (`!e.courseId`) and only displays professional event types (`e.type` as `MEETING`, `STANDUP`, `CLIENT_SYNC`, `ROADMAP`, or `FOLLOW_UP`).

---

## 5. Ingestion & AI Parsing Workflows (`/api/ingest`)
When a schedule/syllabus file or text is uploaded:
- **Bypass / Demo Payload**: If the raw text starts with `NEXUSDESK DEMO SESSION LOADED`, the backend bypasses all LLM calls, parses a predefined mock syllabus, and populates the database immediately.
- **Gemini / Antigravity**: If `provider === "gemini"` or `"antigravity"`, it queries Google Gemini to return a structured JSON conforming to `IngestResult`.
- **Lemma SDK Flow**: If `provider === "lemma"`, the route imports `LemmaClient` from `lemma-sdk` and runs a `"triage"` agent:
  ```typescript
  const { LemmaClient } = await import("lemma-sdk");
  const lemmaClient = new LemmaClient({ apiUrl, authUrl });
  await lemmaClient.initialize();
  const conv = await lemmaClient.agents.run("triage", prompt);
  ```
  It polls the conversation messages until the agent returns the parsed structured JSON payload, then seeds the PostgreSQL database tables.

---

## 6. Build Commands & Tooling
To check and verify compilation when modifying the codebase:
- **Typecheck Workspace**:
  ```bash
  npx pnpm@9 run typecheck
  ```
- **Typecheck Library**:
  ```bash
  npx pnpm@9 run typecheck:libs
  ```
- **Wipe Database Tables (Clean Reset)**:
  ```bash
  node lib/db/wipe_db.cjs
  ```
