# 🖥️ NexusDesk (aka Nexus Deck)
### The Neo-Brutalist Academic Control Center for ECE Students

> [!WARNING]
> **⚠️ PERSONAL VIBE-CODED PROJECT**  
> This application is built using advanced agentic AI pair programming (Vibe Coding) customized specifically for Sophomore Electronics and Communication Engineering (ECE) students at **National Institute of Technology Karnataka (NITK)**. It is configured for personal academic use and local deployments.

---

## 🛑 What is NexusDesk?
**NexusDesk** is an all-in-one dashboard designed to manage the demanding schedule of an engineering student. It combines real-time timetable tracking, automated syllabus/calendar ingestion, course grades, attendance risk calculators, hardware project trackers, and daily health metrics into a single, high-contrast dashboard.

---

## 🎨 Design System: The Brutal Design Law
NexusDesk features a custom **Muted Neo-Brutalist** aesthetic ensuring high readability, high contrast, and retro physical tactility.

1. **Zero Border Radius**: Globally forced `border-radius: 0px` on all buttons, cards, badges, inputs, and panels.
2. **Muted Color Palette**:
   * **Paper** (`#F1F0E8`): Main workspace background.
   * **Surface** (`#E8E7DF`): Card containers, inputs, and sidebars.
   * **Ink** (`#2D2D2D`): High-contrast text and thick outlines.
   * **Terracotta** (`#C4614A`): Warning state and primary accent (rust-red).
   * **Sage** (`#6B7F52`): Success state and secondary accent (academic green).
   * **Amber** (`#B8872A`): Warning and conditional markers.
3. **Flat Offset Shadows**: Solid offset shadows with `0px` blur:
   * `shadow-brutal` (4px offset)
   * `shadow-brutal-sm` (2px offset)
   * `shadow-brutal-lg` (6px offset)
4. **Structured Typography**:
   * Headings: `Space Grotesk`
   * Body Text: `Inter`
   * Numerical Data & Attendance Metrics: `JetBrains Mono`
5. **No Emojis in the UI**: Strict constraint for a clean, structural layout.

---

## 🚀 Core Features

### 📅 1. Fluid Timeline & Live Cursor
* An hourly vertical schedule grid matching the active day.
* A live red cursor tracking the current time relative to classes.
* One-click Attended/Missed toggle buttons directly on timeline cards.

### 🧠 2. AI Ingest Engine & Document Parser
* **PDF/Text Dropzone**: Ingests timetables, schedules, or syllabus texts.
* **Image OCR & Vision Ingest**: Drag and drop screenshots of timetables or exam dates, parsed automatically using Gemini Vision or local `llama3.2-vision`.
* **Cognitive Switch**: Toggle between offline local Ollama parsing or high-speed Gemini Cloud processing.

### 📚 3. ECE Course & Attendance Ledger
* **75% Attendance Guard**: Gauges are styled in terracotta if attendance drops below the NITK minimum 75% threshold.
* **Attendance Risk Calculator**: Displays the exact number of classes you can safely skip, or how many consecutive classes you must attend to recover.

### 📋 4. Kanban Task Board
* Standard columns: `TODO`, `IN_PROGRESS`, `BLOCKED`, and `DONE`.
* Specialized categories: `ACADEMICS`, `HARDWARE_DEV` (project builds/PCB/soldering), `ROUTINE`, and `PERSONAL`.

### 🛠️ 5. Hardware Project Tracker
* Specially built for hardware prototypes.
* Tracks developmental phases: *Simulation, Breadboarding, Schematic Capture, PCB Manufacturing, and Testing/Assembly*.
* Component inventory checklist to log required parts (NE555, Op-Amps, microcontrollers).

### 🧮 6. CGPA Simulator & Daily Routine Tracker
* SGPA and CGPA calculators weighted by course credits.
* Health tracker logs daily sleep cycles, active workouts, and steps.

---

## 🛠️ Getting Started (Local Setup)

The application lives in this [Scheduler](file:///home/niranjan/Desktop/Scheduler) folder.

### 1. Configuration
Create a `.env` file in the root of the directory:
```env
DATABASE_URL=your_postgresql_database_url
GEMINI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://localhost:11434
```

### 2. Running Locally
Run the helper script from the folder to spin up the Express backend and React frontend:
```bash
./launch.sh
```
The application will launch and be accessible at: **[http://localhost:19211/](http://localhost:19211/)**

### 3. Database Maintenance
To wipe tables and reset the database state:
```bash
node lib/db/wipe_db.cjs
```
