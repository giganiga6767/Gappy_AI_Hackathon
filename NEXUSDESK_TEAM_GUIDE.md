# 🚀 NexusDesk: 2-Day Team Hackathon Guide & Roadmap

Welcome to the final stretch! This guide outlines **what we have achieved** and provides a structured **Day-by-Day Roadmap** for your team to check, verify, fix, and ship NexusDesk for the submission deadline.

---

## 🏆 Part 1: What We Have Achieved

We have successfully engineered NexusDesk from a static mockup into a robust, local-first, agent-driven student-professional command center:

1. **Dual-Persona Workspaces:**
   * Locked in a high-contrast Brutalist UI (`0px` border radius, thick ink lines, Space Grotesk / Inter typography).
   * Segregated dashboards for **ECE Student** (timetables, course lists, grade calculators, attendance logs) and **Professional Freelancer** (sprints, billable logs, meeting recorders).
   * Completely removed the legacy "Parent View" to keep the layout focused and professional.
2. **Dynamic Attendance Guard & Risk Engine:**
   * Automatically tracks courses against the standard college 75% attendance threshold.
   * Real-time skips-allowed calculator and consecutive recovery class counts.
   * Integrated vertical timetable timeline with a live red progress indicator and one-click quick logging.
3. **Multi-Track Web Audio Recorder:**
   * Integrated browser-native `MediaRecorder` allowing users to capture Microphone Only or mixed **Zoom/System Audio + Microphone** simultaneously.
4. **Desktop Automated Ingestion & Sorting:**
   * Base64 pipeline uploads recordings to `/api/record/process`.
   * Automatically creates desktop folders: raw `.webm` recordings save to `~/Desktop/classrecordings/` and styled Microsoft Word `.docx` summaries save to `~/Desktop/notes/` using the `--md-only` python notes compiler.
5. **Local AI Ollama Integration with Gemini Fallback:**
   * Enabled support for **any** local Ollama model (e.g. `llama3.2`, `qwen2.5:7b`).
   * Designed a low-spec fallback guard: if local Ollama fails (times out, model not found, offline errors), it automatically catches the exception and routes the prompt to **Google Gemini** using a persistent browser fallback key.
6. **Agentic Event-Driven Backend (Lemma SDK):**
   * Multi-agent execution: `TriageAgent` (for transcript file classification and routing), `EnterpriseSolutionArchitect` (event bus listener that unblocks tasks), and `StudyCopilot` (daily study plans cron).

---

## 📅 Part 2: The 2-Day Verification & Shipping Roadmap

Here is the exact step-by-step checklist for the team to push the app to its limits and prepare for the presentation.

### 🌅 Day 1: System Verification & Edge-Case Testing

#### Task 1: Seed & Database Warmup
* **Action:** Launch the servers using `./launch.sh` (Mac/Linux) or `setup.bat` (Windows).
* **Action:** Go to the **Ingest** page in the UI and click **"Load Demo Session"**.
* **Verification:** Verify that the Student timeline grid, courses list, tasks Kanban board, and attendance heatmaps populate instantly. Toggle class attendance and check that the attendance safety percentage shifts dynamically.

#### Task 2: Multi-Track Recording Loopback Test
* **Action:** Open Chrome, go to the Student/Professional page, start recording, choose **System Audio + Mic**, and play a video or speak.
* **Action:** Stop recording and wait for backend compilation.
* **Verification:**
  1. Open your computer's Desktop. Ensure folders `/notes/` and `/classrecordings/` were created automatically.
  2. Confirm the raw WebM exists in `/classrecordings/`.
  3. Open the `.docx` document in `/notes/` to verify it contains formatted headers and summary bullet points.

#### Task 3: Ollama Timeout & Fallback Stress Test
* **Action:** In the settings modal, select "Ollama (Local)" and enter a custom model name. 
* **Action:** Run an ingestion or note generation.
* **Action:** Turn off your local Ollama server mid-execution.
* **Verification:** Check the terminal output of the API server (`pino` logs). Confirm that it prints a warning stating local Ollama failed and successfully routed the prompt to the Google Gemini cloud API instead.

#### Task 4: Event Bus Unblocker verification
* **Action:** Go to the Kanban board, edit a Sprint task, change status to `"Blocked"`, and provide a blocker reason.
* **Verification:** Check the agentic backend logs (port 4000). Confirm that the `EnterpriseSolutionArchitect` catches the event on the bus, queries solutions, and updates the task detail card in PostgreSQL with unblocking suggestions and code snippets.

---

### 🌌 Day 2: Polishing, Styling Audits, & Pitch Preparation

#### Task 5: Zero Border Radius Code Audit
* **Action:** Inspect the UI in the browser. Look for any rounded corners (check buttons, dialog sheets, select dropdowns, and settings inputs).
* **Action:** If you see any rounded corners, locate the corresponding CSS file or component code and override it with `border-radius: 0px` to comply with the brutalist design system guidelines.

#### Task 6: Multi-Device & OS Setup Validation
* **Action:** Have team members on both Windows and Mac check out the repository.
* **Action:** Run the corresponding setup script (`setup.bat` or `./launch.sh`) and verify that dependencies install and execute successfully without OS path errors.

#### Task 7: Setup DevTools Walkthrough (Judge Demo Prep)
* **Action:** Practice opening the browser console and Network tab in DevTools.
* **Action:** Trigger a timetable ingestion and track the payload sent to `/api/ingest`.
* **Action:** Prepare to explain the network logs to a judge:
  * Show the POST payload.
  * Point to the returned JSON showing courses, timetables, and tasks metadata.
  * Explain that database interactions use strictly parameterized ORM queries to prevent SQL injections.

#### Task 8: Mock Interview Session
* **Action:** Go through the **[NEXUSDESK_QA_PREP.md](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/NEXUSDESK_QA_PREP.md)** and **[NEXUSDESK_TEST_CASES.md](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/NEXUSDESK_TEST_CASES.md)** documents.
* **Action:** Practice explaining how **Lemma powers the TriageAgent + event bus for autonomous routing and unblocking**.
* **Action:** Emphasize our primary differentiators: rule-based attendance guard engine, dual-persona workspaces, local-first offline capabilities, and desktop folders integration.

---

## ⚙️ How to Start the App

### Linux & macOS:
```bash
chmod +x launch.sh
./launch.sh
```

### Windows:
```cmd
double-click setup.bat
```

Ensure your `.env` contains your PostgreSQL `DATABASE_URL` (e.g. from Neon) and your `GEMINI_API_KEY`.
