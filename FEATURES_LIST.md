# 📋 NexusDesk: Complete Features List & Architecture Specification

This document provides a comprehensive, segregated, and point-wise list of all fully functional features implemented in **NexusDesk** for the hackathon submission. It details our unique differentiators, local-first workflows, and advanced agentic architecture.

> [!IMPORTANT]
> **Lemma powers the TriageAgent + event bus for autonomous routing and unblocking.**

---

## 🤖 I. Advanced Agentic Architecture (Lemma SDK Integration)

NexusDesk utilizes the **Lemma SDK** to run complex, multi-step, context-aware, event-driven agents and workflows:

* **The TriageAgent (Autonomous Routing):**
  * Spawns a Lemma Agent (`TriageAgent`) to process raw voice transcripts uploaded by recorders or created in the workspace.
  * Context-aware routing: Automatically classifies text into "Academic" or "Professional" payloads based on vocabulary (course codes, syllabus info vs sprint logs, client terms).
  * Automatically creates fully populated database records matching PostgreSQL schema rules in the appropriate datastore.
* **The Self-Healing Solution Architect (Event Bus Unblocking):**
  * Monitors the global Event Bus. When a Sprint task state changes to `"Blocked"`, the bus triggers the `EnterpriseSolutionArchitect` agent.
  * The agent analyzes the blocker context (e.g., dependency error, missing specification) and performs a multi-step query.
  * Generates 2-4 concrete, structured solutions—including complete copy-pasteable **code snippets**, ITIL/Agile SOP templates, framework suggestions, and StackOverflow/GitHub reference URLs.
  * Writes the solutions back into the datastore under the task's AI Solution board.
* **Proactive Study Copilot Agent:**
  * Runs on a background cron scheduler that triggers daily at 8:00 AM.
  * Analyzes course calendars, active grades, and upcoming assignment/exam tasks.
  * Automatically compiles structured study plans, generates reading checklists, and retrieves recommended YouTube/textbook resource links dynamically.
* **Directory File System Watcher:**
  * Monitors a designated folder `/transcripts` using `chokidar` to ingest new records on file creation, feeding them straight into the Lemma `TriageAgent`.

---

## 🎨 II. Unique Differentiators (Attendance Guard, Multi-Persona, Local-First)

Unlike standard academic planners, NexusDesk has a tailored ECE-academic footprint combined with local-first system recording:

### 1. The 75% Attendance Guard & Risk Engine
* **Rule-Based Analytics Guard:**
  * Computes live attendance percentages for all courses, mapping them against the standard college 75% minimum attendance requirement (or any other custom threshold).
* **Skipping Allowed & Recovery Calculator:**
  * Tells the student exactly how many consecutive classes they can safely skip before dropping below 75%.
  * If the student is already in the danger zone (< 75%), the system calculates the exact number of consecutive classes they *must* attend to recover to safety.
* **High-Contrast Attendance Heatmap:**
  * Renders monthly attendance records as a dense, high-contrast visual matrix for scannability.
* **One-Click Quick Log Timeline:**
  * Renders an hourly grid with a live red line showing class schedules. Allows logging attendance with a single click, instantly recalculating all percentages and danger-zone metrics.

### 2. Dual-Persona Workspace
* **Academic Student Workspace:**
  * Displays attendance metrics, CGPA/SGPA credit target simulators, vertical timetables, and academic Kanban boards.
* **Professional Freelancer Workspace:**
  * Switches persona to expose client sprint boards, a billable hours logging system, and meeting recorders.
  * Removes legacy rounded elements and "Parent Views" for a modern, muted Brutalist layout (`0px` border-radius, flat ink lines, and Space Grotesk fonts).

### 3. Local-First Ollama & Desktop Integration
* **Local LLM Flexibility:**
  * Integrated a local Ollama service provider where the user can choose and type in **any** local model name they want (e.g., `llama3.2`, `mistral`, `gemma2`, `qwen2.5:7b`).
* **Resilient Gemini Fallback Guard:**
  * Specifically designed for lower-spec laptops. If the local model fails to load, times out, or throws an error, the system catches the exception and automatically routes the prompt to **Google Gemini** using a configured fallback key (or env key), guaranteeing **100% functionality uptime**.
  * Accessible settings display an optional "Gemini API Key (Optional Fallback)" field alongside the local model name.
* **Local Desktop Saving & Archiving:**
  * Automatically hooks into the local operating system to save assets:
    * **`~/Desktop/classrecordings/`**: Archives raw recorded `.webm` audio files.
    * **`~/Desktop/notes/`**: Auto-saves styled, professional Microsoft Word `.docx` documents containing compiled class summaries.

---

## 🎙️ III. Live Meeting & Class Recorder Pipeline

* **Multi-Track Web Audio Mixer:**
  * Records ambient room conversations or online video lectures directly.
  * Option to record **Microphone Only** or capture mixed **Zoom / System Audio + Microphone** simultaneously.
* **Live Speech Transcription:**
  * Integrates the browser-native HTML5 Web Speech API (`SpeechRecognition`) for real-time transcript streaming. Requires no external cloud connections or API keys to render spoken words live.
* **Structured Markdown Notes Generator:**
  * Takes the voice transcript and transforms it into beautifully structured summaries complete with headings, key takeaways, and action items.
* **Microsoft Word (`.docx`) Direct Compiler:**
  * Uses a Python script utility (`gemini_note_taker.py` with `--md-only` compilation) to automatically compile raw markdown notes into professional executive Word documents on the fly.
* **Local Persistence:**
  * Auto-saves all recordings, audio playback links, transcripts, and notes to `localStorage` so data is never lost on refresh.

---

## 📅 IV. Task & Project Management

* **Kanban Task Board:**
  * Segregated task columns matching ECE work categories: `ACADEMICS`, `HARDWARE_DEV`, `ROUTINE`, and `PERSONAL`.
  * Support for priority labels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
* **ECE Hardware Lifecycle Tracker:**
  * Custom timeline designed to track hardware projects through prototyping phases:
    1. Simulation
    2. Breadboarding
    3. Schematic Capture
    4. PCB Manufacturing
    5. Testing & Assembly
* **Parts Inventory Checklist:**
  * Tracks microcontroller pins, capacitors, op-amps, NE555 timers, and other components directly within the project board.
* **CGPA & SGPA Simulator:**
  * Simulates semester grade outcomes and calculates required grades in future courses to hit target CGPAs.
