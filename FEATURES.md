# NexusDesk Core Features

NexusDesk is a comprehensive, local-first Academic OS designed to manage your college schedules, notes, tasks, grades, and projects. Here is the full breakdown of features available in the platform:

---

## 📅 Scheduler & Semester Management

### Semester & Course Structuring
- **Academic Semester Periods**: Define start and end dates for semesters, marking the current one as **active**. All data is automatically partitioned by the active semester.
- **Credit-Weighted Courses**: Associate room numbers, faculty names, credit weights, and custom visual color tags with courses.
- **Real-Time Attendance Gauges**: Visual alerts and warning indicators when a course's attendance approaches the minimum threshold (default: 75%).

### Timetable & Calendar
- **Timetable Mapping**: Supports creating recurring weekly sessions (Lectures, Tutorials, Labs, and Seminars) grouped by a `recurringGroupId`.
- **One-Shot Events**: Add individual one-shot events like exams, review sessions, break periods, or study halls.
- **Recurring Exceptions**: Cancel or modify a single instance of a recurring event (with custom cancellation notes) without altering the rest of the weekly series.
- **Interactive Planner**: Switch between Month and Week views to visual-triage your workload.

---

## 🧠 Supercharged AI Ingestion Inbox

### One-Upload Syllabus Parser
Upload a single PDF or image of an academic syllabus, calendar, or timetable, and the system automatically extracts and registers:
1. **Semester & Enrolled Courses**: Identifies codes, course names, and schedules on the fly.
2. **TIMETABLE GENERATOR**: Parses day and time slots, automatically generating recurring calendar events in your planner.
3. **SPACED STUDY PLANS**: Generates task milestones and structures study prep tasks (e.g. revision tasks spaced 7, 3, and 1 day before exams) automatically.
4. **PROJECT BREAKDOWN**: Automatically detects course projects and splits them into incremental milestones leading up to final deadlines.
5. **AI GPA TRIAGE**: Computes triage and priority notes explaining each task's grade weight, estimated difficulty, and impact on your CGPA.

### Smart Conflict Prevention
Before applying the parsed inbox items to your database, the system runs validation checks to highlight:
- **Course Code Mismatches**: Warns you if a course code is already registered in the active semester under a different name.
- **Schedule Overlaps**: Warns you if a recurring class overlaps in time with an existing class in your calendar.
- **Checklist Duplicates**: Detects duplicate task titles to prevent cluttering your Kanban board.

---

## 🎙️ Non-Blocking Audio Notes Pipeline

### Multi-Source Recording
- **Microphone Input**: Record physical classroom lectures directly from the CLI or Web UI.
- **System Audio Loopback**: Record Zoom meetings, Google Meet, YouTube tutorials, or browser tab audio directly.
- **FFmpeg Compression**: Automatically encodes recorded audio files into space-saving MP3/WebM formats.

### Async Note-Taker Pipeline
- **Non-Blocking Background Workers**: Start transcription/summarization and immediately return to your work.
- **Multi-Stage Progress Indicator**: The client displays live progress polling (`transcribing` ➔ `generating` ➔ `saving` ➔ `complete`).
- **Styled Lecture Notes**: Generates fully formatted **Markdown (.md)** files and **Microsoft Word (.docx)** documents with highlighted key concepts and structured bullet points.
- **Action Item Extraction**: Extracts tasks from the lecture text and appends them to your checklist automatically.

---

## 📊 Performance, Grades & Projects

### Attendance Tracker
- **Session Attendance**: Mark sessions as `ATTENDED`, `ABSENT`, `LATE`, or `EXCUSED`.
- **Skip Predictor**: Displays metrics showing exactly how many sessions you can skip before dropping below the attendance threshold, or how many you must attend to recover.

### Grade Ledger & CGPA Simulator
- **Course Grade Ledgers**: Log CIE (Continuous Internal Evaluation) and SEE (Semester End Evaluation) marks, scaled assignments, quizzes, and projects.
- **Performance Projections**: Displays weighted averages and calculates the minimum SEE score required to achieve your target grade.
- **SGPA & CGPA Projections**: Simulate projected SGPA and CGPA trends by toggling "isProjected" semester records to plan your academic roadmap.

### Project Milestones Tracker
- **Project Ledgers**: Track repository links (GitHub), Notion links, target dates, and statuses (`PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`).
- **Milestone Checklists**: Add milestone targets to break large projects into manageable chunks.
- **Daily Developer Logs**: Keep simple developer diary entries for project tracking.

---

## 🛡️ Data Ownership & Portability

### Zero Lock-In Export
Export your entire workspace offline at any time via the `nexus` CLI:
- **ICS Calendar**: Export compatible `.ics` files that import directly into Google Calendar, Apple Calendar, or Outlook.
- **Zip Archive**: Exports a complete archive of all generated notes, markdown summaries, task lists, and raw audio recordings.
- **JSON Dump**: A raw JSON data dump for developers to parse, query, or port elsewhere.
