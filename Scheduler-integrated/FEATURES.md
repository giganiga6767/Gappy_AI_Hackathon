# NexusDesk — NIT Karnataka Sophomore ECE Management System
## Full Feature Directory & Capabilities Guide

Welcome to the comprehensive features guide for **NexusDesk**, a custom academic control center designed specifically for NITK Sophomore Electronics and Communication Engineering students. This document catalogues every feature, view, and utility integrated into the workspace.

---

## 🎨 1. The Design System (The "Brutal Design Law")
NexusDesk is built using a custom **Muted Neo-Brutalist** style that ensures high readability, retro-tactility, and high-contrast visuals.
- **Rule D-1: Zero Border Radius**: Strictly `border-radius: 0px` globally. All cards, buttons, badges, inputs, and dropdowns have sharp corners.
- **Rule D-2: Muted Color Palette**: Uses a curated workspace token color scheme:
  - `Paper` (`#F1F0E8`): Main background
  - `Surface` (`#E8E7DF`): Cards, sidebars, and panels
  - `Ink` (`#2D2D2D`): High-contrast texts and thick borders
  - `Terracotta` (`#C4614A`): Primary accent (muted rust-red)
  - `Sage` (`#6B7F52`): Secondary accent (academic green)
  - `Amber` (`#B8872A`): Warning and risk indicators
- **Rule D-3: Flat Offset Shadows**: Zero blur radius. All elements float using solid flat shadows:
  - `shadow-brutal` (4px offset)
  - `shadow-brutal-sm` (2px offset)
  - `shadow-brutal-lg` (6px offset)
- **Rule D-4: Thick Borders**: Structured frames use a robust `border-2 border-ink` to separate components.
- **Rule D-5: Typography**: 
  - Headings: `Space Grotesk` (Bold, structural uppercase tracking)
  - Body: `Inter`
  - Values/Metrics: `JetBrains Mono` for attendance, grade counts, times, and schedules.

---

## 🧠 2. AI Ingest Engine & Document Parser (NEW)
The universal AI parsing dropzone allows you to copy-paste raw texts or upload PDFs/TXT files to populate your dashboard automatically.
- **Client-Side PDF Text Extraction**: Drop any timetable, syllabus, or calendar PDF. The browser extracts the text using `pdf.js` client-side, showing it in the editor area for instant review before submission.
- **Multimodal Image Parsing**: Directly drag-and-drop or select screenshots/images of your timetables, exam tables, or academic calendars (PNG, JPG, WEBP). Encodes and previews images inline, automatically switching Ollama queries to `llama3.2-vision` and Gemini queries to vision mode for processing.
- **LLM Cognitive Selector**:
  - **Ollama Mode**: Uses local `llama3` (or `llama3.2-vision` for images) queries at `http://localhost:11434` for private offline parsing.
  - **Antigravity Mode**: Connects to the high-speed Google `gemini-2.5-flash` API.
  - **API Key Persistence**: Safely saves the user's Gemini Developer API key in the browser's `localStorage` for convenience.
- **Multi-Entity Parsing**: Parses everything in one go:
  - **Semester Context**: Identifies and configures active semesters.
  - **Course Auto-Creation**: Detects subject codes (e.g. EC302) and titles, creating them automatically under the active semester.
  - **Timetable Class Schedules**: Automatically expands weekly schedules into specific repeating events throughout the entire semester.
  - **Holidays & Exams**: Ingests exam dates and public holidays as single, non-recurring events.
  - **Tasks**: Parses action items, homework assignments, and due dates, automatically linking them to their corresponding courses.

---

## 📅 3. Fluid Timeline Dashboard
The primary landing board for daily routine navigation.
- **Hour-Based Day Grid**: View your lectures, labs, and tutorials plotted along a vertical hour-grid representing the active day.
- **Live Cursor Tracker**: An animated red cursor displays the current time line relative to your class timeline.
- **Attendance Registry**: Attended/Missed quick-toggle buttons directly on the timeline event cards, syncing records with courses.
- **Day Navigator**: Switch days with manual arrow offsets to preview upcoming schedules or back-register missed classes.

---

## 📚 4. Courses & Attendance Ledger
The core command center for tracking the status of your coursework.
- **Academic Semester Selector**: Toggle between different semesters to view historical classes.
- **Attendance Gauges**: Muted horizontal progress indicators (no circles) showing current attendance percentage compared against the NITK **75% minimum threshold**.
- **Risk Calculator**:
  - **Condonation Risk Alert**: Highlights courses below 75% in alert terracotta.
  - **Skip Calculator**: Displays the exact number of classes you can miss while keeping your attendance above 75%.
  - **Must-Attend Counter**: Tells you how many consecutive classes you must attend to restore a failing attendance percentage.
- **Details view**: In-depth grades register and attendance history per subject.

---

## 📋 5. Kanban Task Board
A category-sorted, interactive kanban interface.
- **Standard Columns**: Track tasks across `TODO`, `IN_PROGRESS`, `BLOCKED`, and `DONE` states.
- **Academic Categories**: Sort activities by category:
  - `ACADEMICS`: Assignments, exam studies, lab manuals.
  - `HARDWARE_DEV`: Project builds, component purchases, soldering tasks.
  - `ROUTINE`: Health logging, workout plans.
  - `PERSONAL`: Extra-curriculars and hobbies.
- **Course & Project Linking**: Associate tasks with a specific course or a hardware project for centralized tracking.

---

## 🧮 6. CGPA Simulator
A grade forecasting and GPA planning dashboard.
- **Target Grade planning**: Enter expected grades for each course in the current semester to calculate the target SGPA.
- **Historical CGPA Logs**: View SGPA trends across previous semesters.
- **Credit Weight Adjustments**: Computes weighted averages based on courses' credit points (e.g., 4 credits for Analog, 2 credits for ECE Lab).

---

## 🛠️ 7. Hardware Project Tracker
A dedicated log for ECE hardware prototypes (e.g., microcontrollers, analog circuits, PCB design).
- **Milestone Logs**: Set sequential stages (e.g. breadboarding, simulation, schematic capture, PCB manufacturing, final assembly).
- **Component Inventory List**: Log required parts (e.g., NE555 timer, op-amps, capacitors, microcontrollers) with availability checks.
- **Status Badges**: Display project states like `PLANNING`, `ACTIVE`, `TESTING`, `ON_HOLD`, and `COMPLETED`.

---

## 🏃 8. Daily Routine Tracker
A modular tracker for keeping ECE student life healthy and organized.
- **Step Counter**: Tracks progress towards a standard daily step goal (e.g., 10,000 steps).
- **Workout Logger**: Logs exercise categories (Strength, Cardio, Sport, Rest).
- **Sleep Log**: Graphs daily sleeping hours to ensure study-life balance.

---

## 📂 9. Course Resources Linker
Centralized database for studying.
- **Materials Board**: Link textbooks, lecture slides, reference manuals, and syllabus guidelines per course.
- **Quick links**: One-click links to subject resources, online portals, or local study folders.

---

## 📅 10. Interactive Monthly Calendar & Planner
A complete full-screen calendar scheduling board.
- **Monthly Grid View**: Visualizes your entire month in a grid, showing class schedules, exams, meetings, and personal tasks.
- **Weekly Timeline Toggle**: Easily switch back and forth between a 7-day timeline view and a full monthly calendar format.
- **Interactive Day Creation**: Click on any calendar day to open a modal interface and manually "mark down" events, exams, or study plans.
- **Source Identification Badges**:
  - `✨ AI Ingested`: Automatically marks events parsed by the AI scanning engine from your syllabus, timetables, or academic calendars.
  - `👤 Manual Event`: Marks events you manually created.
- **Detail Viewer & Event Deletion**: Click on any event card to view full context (linked course, time duration, room/location, descriptions) and remove events instantly.
- **Exam Countdown Bar**: Highlights upcoming examinations with countdown timers (e.g. "MIDSEM EXAM: IN 4 DAYS") for proactive study planning.
