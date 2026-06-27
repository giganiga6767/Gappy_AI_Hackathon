# NexusDesk Product Showcase

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

Here is a showcase of how NexusDesk solves real academic pain points.

---

## Hero Feature: The AI Ingestion Inbox

* **Problem**: 
  Setting up a new semester is exhausting. You have to manually enter dozens of recurring lectures, parse homework deadlines from multiple PDFs, schedule preparation milestones leading up to exams, and organize learning materials. Within a week, the manual effort fails.
* **What NexusDesk does**:
  It extracts entire academic roadmaps from a single document upload. Drag and drop a syllabus PDF, calendar image, or text paste into the Inbox. The system automatically registers:
  1. **Course Schedules**: Identifies lectures, tutorials, and labs, creating recurring events in your calendar.
  2. **Spaced Milestones**: Automatically structures preparation tasks spaced 7 days, 3 days, and 1 day before major exams.
  3. **GPA Triage Notes**: Computes the GPA impact, estimated difficulty, and study strategies for every task.
* **Why it matters**:
  A complete semester structure is generated from syllabus documents in under 60 seconds. You skip the data entry chore and start executing immediately.

---

## Conflict Prevention & Scheduling

* **Problem**:
  Setting up academic schedules manually often results in silent calendar clashes, double-bookings, and duplicate tasks across different pages.
* **What NexusDesk does**:
  Before committing inbox items to the database, the ingestion engine cross-references your active calendar to run three validation checks:
  1. **Course Code Mismatches**: Flags if an ingested course code is already registered under a different name.
  2. **Schedule Overlaps**: Scans your database to warn of scheduling clashes with existing events before inserting.
  3. **Checklist Duplicates**: Detects duplicate task titles to prevent Kanban clutter.
* **Why it matters**:
  It acts as a shield for your schedule, guaranteeing a clean calendar without manual verification.

---

## Non-Blocking Audio Notes Pipeline

* **Problem**:
  Classroom discussions and online lectures move too fast for comprehensive note-taking. Attempting to write down details causes students to miss key concepts.
* **What NexusDesk does**:
  An asynchronous voice ingestion workflow designed to capture and summarize lectures:
  - **Multi-Source Capture**: Records physical classroom audio via microphone, or browser meetings (Zoom, Google Meet, YouTube) using system audio loopback.
  - **Asynchronous Processing**: Encodes the file (MP3/WebM) and begins transcription/summarization in the background (status: `transcribing` ➔ `generating` ➔ `saving` ➔ `complete`).
  - **Rich Artifacts**: Produces formatted Markdown (.md) and styled Microsoft Word (.docx) notes, while automatically extracting action items and creating tasks on your Kanban board.
* **Why it matters**:
  You can focus fully on the lecture. The background pipeline generates study notes and schedules follow-up tasks while you work on other projects.

---

## Performance, Grades & Projects

* **Problem**:
  Tracking grades across separate spreadsheets, calculating minimum final exam scores to stay passing, and tracking side projects alongside academic coursework is fragmented.
* **What NexusDesk does**:
  Integrates course management, grade tracking, and project taskboards:
  - **Attendance Tracker**: Log attendance status (`ATTENDED`, `ABSENT`, `LATE`, `EXCUSED`). The **Skip Predictor** displays exactly how many classes you can skip while staying above the 75% threshold, or how many you must attend to recover.
  - **Grade Ledger**: Tracks internal grades, scales assignments, and projects the minimum score required in your final exams to reach your GPA targets.
  - **CGPA Simulator**: Log SGPA/credits per semester and toggle projected grades to simulate your graduation CGPA.
  - **Projects Tracker**: Link GitHub repositories, log developer diaries, and define project milestones alongside your coursework.
* **Why it matters**:
  All academic and developer timelines are consolidated, giving you a clear view of your performance and commitments.

---

## Zero Lock-In Offline Philosophy

* **Problem**:
  Cloud tools keep your data locked in proprietary databases, making it difficult to back up, export, or transition to other tools.
* **What NexusDesk does**:
  It operates locally, saving all files, recordings, and schemas inside your project directory. The CLI (`./bin/nexus`) provides immediate data exports:
  - **ICS Calendar**: Export compatible `.ics` files that import directly into Google Calendar, Apple Calendar, or Outlook.
  - **Zip Archive**: Pack all notes, summaries, tasks, and raw audio recordings into a single backup.
  - **JSON Dump**: Access a raw JSON export of all database tables.
* **Why it matters**:
  You retain full ownership of your data. No servers to go down, no subscription costs, and your data is always portable.
