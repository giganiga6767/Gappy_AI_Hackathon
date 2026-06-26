# NexusDesk
> Your academic desk. Quiet, intentional, and durable.

NexusDesk is a local-first, zero-lock-in academic workspace built for students and researchers. It combines a structured academic scheduler, a single-queue ingestion inbox, and agentic workflows to organize your courses, sessions, notes (knowledge), and actions without the noise of modern SaaS platforms.

---

## ━━━━━━━━━━━━━━━━━━
## 1. CORE PHILOSOPHY & CONCEPT MODEL
## ━━━━━━━━━━━━━━━━━━

NexusDesk operates on a strict hierarchical structure, eliminating generic productivity clutter (like hardware tracking or CGPA gauges) in favor of inevitable academic relationships:

```
Semester (Active range name, startDate, endDate)
   └── Course (subjectCode, name, shortName, creditWeight, facultyName, roomNumber)
         └── Session (Weekly class occurrences or one-shot exams, lectures, location, date/time)
               ├── Artifact (Any material: audio recording, notes, transcripts, PDFs)
               └── Action (Checklist tasks, deadlines, priorities)
```

---

## ━━━━━━━━━━━━━━━━━━
## 2. SYSTEM ARCHITECTURE & DATA FLOW
## ━━━━━━━━━━━━━━━━━━

NexusDesk runs as a multi-process, local-first application on your machine:

```
[Vite Frontend] (Port 19211)
      │  ▲
      │  │ API requests
      ▼  │
[Express API Server] (Port 8080) ───[Local SQLite Database] (sqlite.db)
      │  ▲                                    ▲
      │  │                                    │
      │  │ Syncs actions                      │
      ▼  │                                    │ Polls/Scans
[Lemma Agentic Backend] (Port 4000) ──────────┘
```

1.  **Vite Frontend (React/Wouter)**: A muted, minimal Neo-Brutalist user interface running on port `19211`.
2.  **Express API Server**: Runs on port `8080` (automatically proxied by Vite). It coordinates local database transactions (`sqlite.db` using Drizzle ORM) and exposes endpoints for Inbox management and exports.
3.  **Lemma Agentic Backend**: Runs on port `4000`. Built using the **Lemma SDK**, it runs background agentic workflows:
    *   **Ingestion Watcher**: Monitors the local `./transcripts` folder for text files, routing them using `triageAgent` into appropriate datastores.
    *   **Academic Cron Job**: Runs a daily scheduler that automatically invokes the `AcademicProactiveCopilot` agent to generate customized study plans and gather video explainers for upcoming task deadlines.
4.  **Local SQLite Database (`sqlite.db`)**: Stores all academic state locally. No remote connection URLs required.

---

## ━━━━━━━━━━━━━━━━━━
## 3. HOW THE INBOX PIPELINE WORKS (Capture ➔ Apply)
## ━━━━━━━━━━━━━━━━━━

To prevent AI halluncinations from directly corrupting your planner state, all inputs follow a secure stage pipeline:

```
Capture (CLI / Web) ──> Understand (LLM Parsing) ──> Preview (Edit JSON) ──> Apply (Write to DB)
```

*   **Capture**: Paste a message, drag-and-drop a file (PDF/Image), or record live microphone/system audio. The file is copied to `recordings/` and logged in the `inbox` table with status `captured`.
*   **Understand**: The system runs transcriptions (Whisper or Gemini) and passes the unstructured contents to the LLM (Gemini or local Ollama), which maps the data to the simplified conceptual model (courses, sessions, actions), saving it as JSON under the `analysis` field.
*   **Preview**: The Web UI shows the extracted entities in an interactive JSON editor, allowing the user to review and correct any errors.
*   **Apply**: Upon approval, the data is committed to the main tables, and the item is archived. When Actions (tasks) are applied, they are automatically mirrored to the local Lemma datastore (`student_tasks`) via the **Lemma SDK**.

---

## ━━━━━━━━━━━━━━━━━━
## 4. CLINICAL CLI ENGINE: `nexus`

Exposes all local-first automation commands under a unified global executable wrapper `./bin/nexus`:

```bash
# Capture text pastes, local files, or record live audio
./bin/nexus capture [--text "<content>" | --file <path> | --record]

# Options for capture:
#   --record : Starts interactive microphone recording.
#   --system : Loops back system speaker output (captures Zoom/YouTube instead of room microphone).

# Shortcut alias for capture --file <file>
./bin/nexus import <file> [--title "<name>"]

# Zero lock-in export (compiles semester.zip containing calendar.ics, summary.md, actions.md, and media)
./bin/nexus export <zip|ics|json|md>
```

---

## ━━━━━━━━━━━━━━━━━━
## 5. ZERO-FRICTION INSTALL & RUN
## ━━━━━━━━━━━━━━━━━━

### System Prerequisites
Ensure system packages for audio recording and compression are installed:
```bash
sudo apt update && sudo apt install ffmpeg alsa-utils pulseaudio-utils zip -y
```

### Installation
Run the zero-friction script to configure Node workspaces, install dependencies, configure the SQLite path, and push database schemas:
```bash
bash setup.sh
```

### Configure Keys
Create a `.env` file in the root directory to toggle between cloud Gemini and local models:
```env
DATABASE_URL="file:/home/niranjan/Desktop/Gappy_AI_Hackathon/sqlite.db"
PORT=8080
PORT_FRONTEND=19211
GEMINI_API_KEY="your_google_ai_studio_key"
```
*If no API key is provided, the system falls back to CPU-quantized Faster-Whisper and local Ollama models (Llama 3 / Llama 3.2 Vision).*

### Launching the Workspace
Start the multi-process workspace in the background:
```bash
bash launch.sh
```
*   **Vite Interface**: [http://localhost:19211](http://localhost:19211)
*   **Express API Server**: Port `8080`
*   **Lemma Agentic Backend**: Port `4000`
