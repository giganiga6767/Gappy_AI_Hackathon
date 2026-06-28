# NexusDesk: A Local-First Agentic Academic Workspace

Drop any academic document — a timetable photograph, a project spec sheet, a voice recording — and your entire workspace is configured, locally, in seconds.

*Powered by Lemma SDK · Built for the Gappy AI National Hackathon*

---

## Submission Metadata

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Team             | Niranjan G, Abhihas Gedela, Mayuk Doshi                        |
| Institutions     | NITK Surathkal (ECE) · IIT Kharagpur · IIT Bhubaneswar         |
| Submission Date  | June 27, 2026                                                  |
| Branch           | `main`                                                         |
| Build Status     | Stable                                                         |
| QA Verification  | 135 / 135 test cases passed · 100% pass rate across 13 modules |

---

## Table of Contents

1. [Problem & Motivation](#1-problem--motivation)
2. [Solution Overview](#2-solution-overview)
3. [System Capabilities](#3-system-capabilities)
4. [Architecture & Technical Design](#4-architecture--technical-design)
5. [Engineering Journey — 11 Iterations](#5-engineering-journey--11-iterations)
6. [Major Technical Challenges](#6-major-technical-challenges)
7. [Quality Assurance & Validation](#7-quality-assurance--validation)
8. [Performance, Reliability & Local-First Guarantees](#8-performance-reliability--local-first-guarantees)
9. [Impact & Differentiation](#9-impact--differentiation)
10. [Closing Statement](#10-closing-statement)

---

## 1. Problem & Motivation

### Context

Academic life generates a constant stream of structured information — course timetables, project specifications, assignment deadlines, attendance requirements, and lecture content. Students across Indian technical institutions manage this information manually: photographing timetables, copying deadlines into calendars, tracking project milestones in spreadsheets, and maintaining grade calculations in separate tools.

### Existing Friction

The tools that exist for academic organization either require cloud accounts with persistent data exposure, demand manual data entry across multiple disconnected applications, or are consumer products not designed for the density and specificity of technical coursework. When a student photographs their timetable on the first day of semester, no existing tool converts that image into a structured, conflict-resolved calendar with recurring class slots, attendance thresholds, and integrated study tasks — without uploading data to an external server.

### Why Current Solutions Fall Short

Cloud-first tools introduce unnecessary dependencies: accounts, subscriptions, internet connectivity, and third-party data storage. General productivity tools lack academic domain awareness — they have no concept of CGPA, attendance minimums, spaced repetition for study tasks, or semester-scoped project milestones. The gap between "raw academic document" and "organized, actionable workspace" remains entirely manual.

> NexusDesk was built because no existing tool closes that gap locally, intelligently, and without friction.

---

## 2. Solution Overview

### What NexusDesk Does

NexusDesk is a local-first, offline-capable academic workspace that ingests raw academic documents — images, PDFs, or voice recordings — and constructs a fully organized workspace: a structured course calendar, project milestone tracker, Kanban task board, grade ledger, and attendance tracker. All processing runs on-device. No cloud. No accounts. No subscriptions.

The system is orchestrated by event-driven background agents dispatching webhooks via the Lemma SDK. These agents handle course calendar management, attendance minimum tracking, weekly roadmap generation, and scheduling conflict resolution automatically after ingestion.

### Core Innovation

The central innovation is the multimodal ingestion pipeline. A student can provide a blurry photograph of a printed timetable or a raw voice recording of a lecture, and the system extracts structured data, validates it, presents it for user confirmation, and commits it to a local SQLite database — generating the entire academic workspace in a single interaction. The pipeline supports PDF, image, text, and project specification inputs, with LLM-powered extraction backed by a local Ollama fallback for fully offline operation.

### User Workflow

```
Raw Input (image / PDF / voice / text)
        |
        v
Multimodal LLM Extraction (Gemini with Ollama fallback)
        |
        v
Structured Data Validation & Conflict Detection
        |
        v
User Confirmation (Inbox Review UI)
        |
        v
Database Commit (local SQLite via Drizzle ORM)
        |
        v
Workspace Generated:
  - Course Calendar (recurring + one-shot events)
  - Kanban Task Board
  - Project Milestones Dashboard
  - Attendance Tracker
  - 10-point GPA Grade Ledger
  - ZIP Export (markdown summaries, notes, roadmaps)
```

---

## 3. System Capabilities

| Capability | Description | User Impact |
| --- | --- | --- |
| Multimodal Document Ingestion | Accepts PDF, image, plain text, and project specification inputs; extracts structured academic data via LLM | Eliminates manual data entry entirely |
| Course Calendar Management | Schedules recurring class slots and one-shot events (exams, deadlines) with conflict detection | Accurate, auto-populated semester calendar |
| Attendance Tracking | Tracks per-course attendance against required minimums; maintains session-level records | Students stay informed of attendance risk before it becomes a problem |
| Spaced Study Task Generation | Generates weekly study roadmaps and Kanban tasks from course and project data | Structured study planning without manual scheduling |
| Projects & Milestones Pipeline | Ingests project spec sheets and maps them into relational milestone and task records | Full project tracking integrated with the academic calendar |
| 10-Point GPA Grade Ledger | Records grades in standard 10-point CGPA format; computes running academic performance | Replaces manual spreadsheet grade tracking with domain-correct representation |
| Lemma SDK Background Agents | Event-driven agents dispatch webhooks for scheduling, conflict resolution, and roadmap generation | Automated workspace maintenance without user intervention |
| Local Ollama Fallback | Falls back to a locally running Ollama model when cloud APIs are unavailable | Full functionality guaranteed offline |
| ZIP Export System | Compiles markdown summaries, lecture notes, and project roadmaps into a downloadable archive | Zero vendor lock-in; data is always portable and user-owned |
| Cascade-Delete Schema | Deletions propagate from Semester down through Courses, Events, Tasks, and Attendance records | Clean data lifecycle with no orphaned records |

---

## 4. Architecture & Technical Design

### Architecture Philosophy

NexusDesk is designed around two principles: local-first data ownership and zero-friction ingestion. All persistent state lives in a local SQLite database managed through Drizzle ORM. The backend is an Express server exposing a REST API consumed by a React frontend. Background intelligence is delegated to Lemma SDK agents, which operate asynchronously via webhooks.

### Components

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | React, Wouter, React Query | UI, routing, server state management |
| Backend | Node.js, Express | REST API, ingestion orchestration, scheduler |
| Database | SQLite via Drizzle ORM | Local persistent storage |
| LLM Layer | Gemini (via Antigravity proxy) | Multimodal extraction, structured output generation |
| Offline Fallback | Ollama (local) | LLM inference when cloud is unavailable |
| Agent Layer | Lemma SDK | Background event-driven agents, webhook dispatch |
| Export | ZIP archive | Markdown summaries, notes, project roadmaps |

### Data Flow

```
Ingestion Input
      |
      v
callGemini() → Antigravity Proxy → Gemini API
      |                                |
      |         (quota/404 fallback)   |
      v                                v
Ollama (local)              Structured JSON response
      |_______________________________|
                    |
                    v
         JSON Validation & Serialization
         (JSON.stringify for array fields)
                    |
                    v
         Express Inbox Apply Route
                    |
                    v
         Drizzle ORM → SQLite
         (cascading schema, absolute DATABASE_URL)
                    |
                    v
         React Query Cache Invalidation
         (immediate UI refetch on commit)
                    |
                    v
         Lemma SDK Agents (async webhooks)
         → conflict resolution, roadmap generation
```

### Design Decisions

**SQLite over a remote database.** The entire system must function offline. SQLite with Drizzle ORM provides full relational semantics, migration support, and zero network dependency. All DB scripts reference an absolute `DATABASE_URL` environment variable to prevent path-relative duplication across monorepo packages.

**User confirmation before commit.** No extracted data is written to the database without passing through an Inbox review step. This is an explicit design gate: the LLM can be wrong, and user confirmation is the safeguard.

**React Query cache invalidation on apply.** Rather than relying on background polling or timed cache expiry, the Inbox apply handler explicitly invalidates all relevant query keys on success, guaranteeing immediate UI consistency across the Kanban board, Projects list, and Calendar.

**Gemini with Ollama fallback.** Cloud LLM access provides higher extraction quality; local Ollama ensures the system remains functional during quota exhaustion or network unavailability. The fallback is transparent to the user.

---

## 5. Engineering Journey — 11 Iterations

NexusDesk reached production-quality stability through two days of intensive debugging and refactoring. Each iteration addressed a distinct failure mode. The record below is unabridged.

| Iteration | Challenge Encountered | Resolution Applied | Outcome |
| --- | --- | --- | --- |
| 1 | Initial build and CLI setup. Drizzle created duplicate SQLite files in package sub-folders instead of the workspace root due to relative path resolution in DB push commands. | Standardized all DB push scripts to reference the absolute `DATABASE_URL` environment variable pointing to the workspace root. | Single canonical SQLite file; no duplication across monorepo packages. |
| 2 | No mechanism to confirm database connectivity before the frontend started, causing silent failures when the DB was unavailable. | Added health-check routes to the Express server that verify DB connectivity before the frontend initialization sequence proceeds. | Server startup is gated on confirmed DB availability. |
| 3 | Deleting a semester left orphaned records in Courses, Events, Tasks, and Attendance — causing referential inconsistency and ghost data in the UI. | Implemented cascading schema deletes propagating from Semesters down through the full relational hierarchy. | Clean deletions with zero orphaned records at any level. |
| 4 | SQLite crashed during PDF and image ingestion when Gemini returned task tags as raw JSON array strings (e.g. `['exam', 'study']`), which SQLite has no native type for. | Added `JSON.stringify()` serialization for all nested array fields immediately before DB insertion. | Ingestion pipeline no longer crashes on array-typed fields from LLM output. |
| 5 | The session scheduler interpreted exam entries with a computed `dayOfWeek` field as recurring weekly events, flooding the calendar with hundreds of duplicate exam slots per semester. | Refactored scheduler logic to check for `sess.date` first. Presence of a specific date forces one-shot treatment regardless of `dayOfWeek`. See Section 6, Challenge A. | Exams and one-shot events schedule correctly; no calendar flooding. |
| 6 | Attendance tracking tables were absent from the local SQLite schema, causing runtime errors when attendance routes were accessed. | Synchronized local schema to include attendance tables. Created missing tables and applied migration seeds. | Attendance tracking fully operational with correct schema. |
| 7 | Development environment crashed on startup due to `EADDRINUSE` errors on ports 8080 and 3000 from stale server processes. | Shifted server bindings to resolve port conflicts in the dev environment. | Clean, repeatable server startup without port collision. |
| 8 | Dynamic project detail routes (`/project/:id`) failed to mount the correct sub-dashboard due to incompatible client-side routing configuration. | Integrated Wouter client-side routing and re-mapped dynamic detail paths to ensure correct component mounting for project detail views. | All project detail sub-dashboards mount and render correctly via dynamic routing. |
| 9 | The grade ledger displayed raw percentage values rather than standard academic CGPA representation, making it incompatible with Indian university grading conventions. | Refactored grade display algorithms to compute and present grades in 10-point CGPA format. | Grade ledger is academically correct and directly interpretable by students. |
| 10 | The LLM ingestion pipeline and Express router had no support for relational project and milestone records, preventing project spec sheets from being ingested. | Integrated relational schemas for projects, milestones, and task associations into both the LLM ingestion flow and the Express router. | Project specification documents can be ingested and tracked end-to-end. |
| 11 | After applying inbox data, the Kanban board and Projects list displayed stale or empty state for up to 30 seconds due to React Query's default cache expiration behavior. | Integrated React Query cache invalidation hooks into the Inbox apply success handler, forcing immediate refetches of tasks, projects, courses, resources, and events. Also expanded ZIP export to include markdown summaries and project roadmaps. | UI reflects committed data instantly; ZIP export produces complete workspace archives. |

---

## 6. Major Technical Challenges

### Challenge A — Session Recurrence Bug: One-Shot Exams Scheduled as Weekly Recurring Events

**Problem.** Single exam dates were being created as indefinitely recurring weekly calendar events, flooding the semester view with hundreds of duplicate entries.

**Root Cause.** The inbox apply route used `(sess.dayOfWeek !== undefined)` as the sole test for recurrence. The LLM extraction pipeline, when processing a specific exam date (e.g. August 31, 2026), computed and returned the corresponding day-of-week alongside the date. The scheduler saw a `dayOfWeek` value, ignored the specific date entirely, and treated the event as a recurring weekly slot.

**Solution.** The scheduler logic was refactored to evaluate `sess.date` first. If a specific date is present, the session is unconditionally treated as one-shot and `dayOfWeek` is disregarded:

```javascript
if (!sess.date && sess.dayOfWeek !== undefined)
```

**Impact.** Exam entries and other one-shot events are now scheduled exactly once on their specified date, regardless of whether the LLM also returns a computed day-of-week value.

---

### Challenge B — Gemini Quota Exhaustion and Silent 404 Errors: API Gateway Routing Failure

**Problem.** The system silently fell back to experimental Gemini models, exhausting the daily API quota within minutes and making the LLM layer unavailable for the remainder of the development session.

**Root Cause.** Google AI Studio's Free Tier restricts experimental models to 20 requests per day. The developer API key routes through the Antigravity gateway proxy, which does not recognize `gemini-1.5-flash` by that identifier and returns a silent 404. The server caught this error without logging it, silently escalated to experimental fallback models, and consumed the daily quota rapidly.

**Solution.** The fallback model list was updated to prioritize `gemini-flash-latest`, which the Antigravity proxy correctly maps to Gemini 1.5 Flash. The `callGemini()` function was refactored to emit `console.warn()` at every fallback step, making API connectivity status visible throughout the call chain.

**Impact.** API routing now resolves correctly on first attempt. Full fallback visibility prevents silent quota drain. The local Ollama fallback activates cleanly when cloud access is genuinely unavailable.

---

### Challenge C — SQLite Array Serialization Failures: Database Insertion Crashes on Nested JSON

**Problem.** The ingestion pipeline crashed on database insertion whenever the LLM returned array-typed fields, and DB push commands produced duplicate SQLite files across the monorepo.

**Root Cause.** SQLite has no native array column type. Gemini returns fields such as task tags as nested string arrays (e.g. `['exam', 'study']`). Attempting to insert these values directly caused SQLite to throw. Separately, DB push commands executed from the workspace root resolved paths relatively, creating additional SQLite files inside package sub-directories rather than the intended workspace root.

**Solution.** `JSON.stringify()` serialization was applied to all nested array fields immediately before every DB insertion. All DB scripts were standardized to reference the absolute `DATABASE_URL` environment variable pointing to the workspace root, eliminating relative path resolution.

**Impact.** The ingestion pipeline handles all LLM-returned array fields without errors. The database is guaranteed to exist at a single canonical location regardless of execution context.

---

### Challenge D — Cross-Page React Query Cache Inconsistency: Stale Kanban and Projects UI

**Problem.** After applying inbox data, the Kanban board and Projects list displayed empty state for up to 30 seconds despite the data having been successfully committed to the database.

**Root Cause.** React Query's default cache expiration meant that query results for tasks, projects, courses, resources, and events remained stale in the client after the inbox apply action. The frontend had no mechanism to know that new data had been committed, so it continued serving cached (pre-ingestion) results until natural cache expiry.

**Solution.** React Query cache invalidation hooks were integrated directly into the Inbox apply success handler. On a successful commit, the handler explicitly invalidates the query keys for all affected data domains — tasks, projects, courses, resources, and events — triggering immediate background refetches across the application.

**Impact.** The UI reflects committed data instantly upon apply. No page refresh is required, and the 30-second stale window is eliminated.

---

## 7. Quality Assurance & Validation

Following two days of iterative debugging and refactoring, a full regression suite was executed across all system modules. NexusDesk passed every test case on the final run.

| Metric | Result |
| --- | --- |
| Total Test Cases | 135 |
| Passed | 135 |
| Failed | 0 |
| Pass Rate | 100% |
| Modules Covered | 13 |

### Module-Level Results

| Module(s) | Scope | Cases | Result |
| --- | --- | --- | --- |
| Module 1 | Setup, DB Launch & Server Bootstrapping | 6 / 6 | Pass |
| Modules 2–3 | Semester, Course & Calendar Event Scheduling | 19 / 19 | Pass |
| Module 4 | Multimodal Ingestion (PDF, Image, Text, Projects, Conflicts) | 17 / 17 | Pass |
| Modules 5–8 | Tasks, Grades, Attendance & Resources Trackers | 33 / 33 | Pass |
| Module 9 | Lemma SDK Background Agents & Webhooks | 18 / 18 | Pass |
| Modules 10–11 | Local-First Ollama Fallback, UI & Security | 38 / 38 | Pass |
| Modules 12–13 | Projects & Milestones Ingest, GPA Ledger & ZIP Export | 5 / 5 | Pass |

### Validation Commentary

Coverage spans the full system surface: infrastructure bootstrapping, relational data scheduling, multimodal ingestion across all supported input types, every tracker module, the Lemma SDK agent layer, the offline execution path, UI correctness, and the export pipeline.

Notably, the test suite validates multimodal calendar image extraction — confirming that a photographed timetable produces a correctly structured calendar — alongside the local Ollama offline fallback, confirming that LLM-dependent features remain functional without network access.

The data confirmation gate is validated explicitly: no LLM-extracted data enters the database without passing through the user review step. All visual schedule inputs are verified and applied without data corruption.

---

## 8. Performance, Reliability & Local-First Guarantees

### Offline Execution

NexusDesk is designed to operate without internet access. When cloud LLM endpoints are unavailable — due to quota exhaustion, network absence, or proxy failure — the system transparently falls back to a locally running Ollama model. All extraction, ingestion, and workspace generation capabilities remain available offline. This fallback path is covered by 38 test cases in Modules 10–11.

### State Consistency

The cascade-delete schema ensures referential integrity across the full data hierarchy: deletions at the Semester level propagate cleanly through Courses, Events, Tasks, and Attendance records, leaving no orphaned rows. The React Query cache invalidation mechanism ensures the frontend reflects committed database state immediately after any ingestion event, with no polling delay or stale window.

### Data Ownership

All data is stored in a local SQLite file at a user-controlled path defined by the `DATABASE_URL` environment variable. There is no external synchronization, no cloud backup, and no third-party dependency for data persistence. The user retains complete ownership and portability of their academic data at all times.

### Export Capability

The ZIP Export System compiles the complete workspace into a portable archive containing markdown summaries, structured lecture notes, and project roadmaps. The export is self-contained and human-readable without NexusDesk installed, ensuring zero lock-in and full data portability independent of the application's availability.

### Stability

The `main` branch is fully stable. All 135 QA test cases pass. The 11-iteration engineering process systematically eliminated every identified failure mode: DB path conflicts, API gateway silent failures, SQL serialization errors, port binding collisions, routing mismatches, schema gaps, and UI cache inconsistencies. No known instabilities remain in the submitted codebase.

---

## 9. Impact & Differentiation

### Practical Usability

A student receiving their semester timetable on the first day of class can photograph it, drop it into NexusDesk, confirm the extracted schedule, and have a fully structured academic workspace — calendar, tasks, attendance tracker, grade ledger — in a single session. The same workflow handles project specification documents. No manual data entry is required at any point.

### Academic Domain Correctness

NexusDesk encodes academic conventions explicitly: attendance minimums, CGPA representation on a 10-point scale, semester-scoped scheduling, one-shot versus recurring event semantics, and spaced study task generation. These are not generic productivity features adapted to academic use; they are purpose-built for the technical college context.

### Local-First as a Structural Advantage

Privacy, offline availability, and data ownership are architectural properties, not feature additions. Students in environments with unreliable internet access or institutional data privacy concerns can use NexusDesk without compromise. The local-first design is not a constraint — it is a deliberate position.

### Differentiating Capabilities

- **Multimodal ingestion from physical documents.** A blurry photograph of a printed timetable is a valid input. No competing tool in this category processes physical academic documents at this fidelity.
- **Conflict-aware scheduling.** The Lemma SDK agent layer resolves scheduling conflicts automatically after ingestion, without user intervention.
- **Integrated project and milestone tracking.** Project specification sheets are ingested on the same pipeline as course documents, generating relational milestone and task records directly linked to the academic calendar.
- **Zero-lock-in export.** The ZIP export produces human-readable, portable archives that do not require NexusDesk to be useful.

---

## 10. Closing Statement

NexusDesk demonstrates that the full academic workflow — from raw document to organized, tracked, conflict-resolved workspace — can be executed locally, offline, and without any external dependency. The engineering work behind this submission is not theoretical: it is the product of two days of systematic debugging, 11 documented iterations, and a 135-case regression suite that closes at 100%.

The system handles the messiness of real academic input — blurry images, loosely formatted documents, LLM output with array fields — and produces reliable, structured, immediately usable academic data. Every failure mode encountered was identified, root-caused, and resolved. The result is a stable, production-quality codebase ready for use on the first day of any semester.

---

*NexusDesk · Gappy AI National Hackathon · Submitted June 27, 2026*
