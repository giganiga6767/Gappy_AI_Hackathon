# 📋 NexusDesk: Completed Features List
Here is a clean, bullet-point list of all the completed and fully functional features in **NexusDesk** for our hackathon submission. Teammates can use this list directly for write-ups or presentation slides.

---

### 🧠 1. LLM Cognitive Ingestion Engine
* **Universal Ingest Dropzone:** drag-and-drop or copy-paste timetables, syllabi, or schedules.
* **Timetable Screenshot Ingest:** supports uploading images/screenshots of timetables.
* **Automatic DB Population:** automatically creates semesters, courses, weekly lecture events, calendar events, and homework tasks in the database.
* **Multi-LLM Provider Support:** selectable options in the Settings panel for **Google Gemini**, **Ollama (local)**, and **Lemma SDK (Agentic)**.
* **Lemma SDK Fallback:** logs the SDK execution attempt and falls back to Gemini/Ollama if the local Lemma server isn't running, guaranteeing it never crashes.

### 🎙️ 2. Live Audio Recorder & Speech Parser
* **Microphone Capture:** records actual mic audio using the browser's `MediaRecorder` API.
* **Web Speech Live Transcription:** uses the native **HTML5 Web Speech API** to transcribe your voice *live* while recording (requires zero API keys).
* **Session Persistence:** all recordings, titles, transcripts, and notes are saved to `localStorage` (survives browser refresh).
* **Session Renaming:** rename any recording inline.
* **Playback & Download:** play recording audio directly in the browser or download the `.webm` file.

### 📝 3. AI Document Notes Generator
* **One-Click Doc Notes:** clicking the document generator button (file icon) takes the transcript and formats it into structured Markdown notes.
* **Auto-File Download:** triggers an immediate download of the `<session-name>-notes.md` file.
* **UI Preview:** renders the generated markdown notes directly underneath the transcript card in the recordings list.

### 📊 4. Attendance Heatmap & 75% Guard (Student Mode)
* **75% Attendance Guard:** color-coded indicators warning if attendance drops below the NITK 75% minimum threshold.
* **Risk Calculator:** tells you exactly how many classes you can safely skip, or how many consecutive classes you must attend to recover.
* **Attendance Heatmap Calendar:** custom calendar rendering your monthly attendance status (Safe / Danger / Warn) in a high-contrast matrix.
* **Student vs. Parent Views:** top bar navigation to switch between the Student workspace and a read-only Parent dashboard view.

### 📅 5. Vertical Timetable Timeline
* **Fluid Grid:** renders an hourly timeline matching the selected day.
* **Live Red Cursor:** tracks and displays the current time relative to your scheduled lectures.
* **Quick Log Toggle:** mark classes as "Attended" or "Missed" with one click to dynamically update attendance stats.

### 📋 6. Kanban Task Board
* **Academic & ECE-focused Columns:** tracks tasks under categories like `ACADEMICS`, `HARDWARE_DEV`, `ROUTINE`, and `PERSONAL`.
* **Priority Metrics:** supports assigning priorities: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
* **Database Synced:** fully synced with PostgreSQL (mutates state instantly).

### 🛠️ 7. Hardware Project Tracker
* **Hardware Lifecycle Phases:** tracks ECE prototyping phases (Simulation, Breadboarding, Schematic Capture, PCB Manufacturing, Testing/Assembly).
* **Parts Inventory Checklist:** checklists to log required hardware components (microcontrollers, NE555 timers, op-amps, etc.).
* **Project Milestones & Logs:** tracks milestone due dates and lets you add developer logs.

### 🧮 8. CGPA/SGPA Simulator
* **Interactive Simulator:** calculate your GPA based on course credit weightings.
* **Grade Targets:** set target CGPAs and calculate grades needed in upcoming courses.

### 🔄 9. Dual-Workspace Mode
* **Student Workspace:** access to courses, attendance metrics, CGPA simulator, and timetables.
* **Professional Workspace:** switch workspace to access a freelance billable hours log, sprint trackers, and the meeting/standup recorder.

### 🤖 10. Agentic Event-Driven Backend Architecture (New!)
* **Triage Routing Agent:** Spawns a Lemma Agent (`TriageAgent`) to parse, classify (academic/professional), and write raw file transcripts to the correct datastores.
* **Proactive Study Copilot:** Monitors deadlines daily using a cron job, generating tailored study schedules and high-quality YouTube/textbook resource lists for the student's task.
* **Self-Healing Solution Architect:** Intercepts `'Blocked'` task changes on an Event Bus, generating 2-4 technical/process solutions and code snippets automatically.
* **File System Ingestion Watcher:** Monitors a `/transcripts` directory using `chokidar` to ingest new records on file creation.
