# 🚀 Replit Workspace Deployment & Master Prompt

This guide contains the instructions to deploy the hackathon application on Replit and the **Master Prompt** to feed into the Replit Agent to finish the frontend, OAuth authentication, and interactive views.

---

## 🛠️ Step 1: Uploading and Initializing on Replit

1. Create a blank **Node.js** project on Replit.
2. Drag and drop the `hackathon_project_bundle.zip` (located on the Desktop) into the Replit file explorer.
3. Open the shell terminal in Replit and unzip the bundle:
   ```bash
   unzip hackathon_project_bundle.zip
   ```
4. Ensure the `class-notes-pipeline-integrated` and `Scheduler-integrated` directories are at the workspace root.
5. Install workspace dependencies by running:
   ```bash
   cd Scheduler-integrated
   npx pnpm@9 install
   ```

---

## 🚀 Step 2: The Replit Agent Master Prompt

Copy-paste this exact text into the Replit Agent chat input to complete the project:

```text
Please build the React frontend views and the OAuth authentication routes for our NexusDesk monorepo. Follow these specifications:

============================================================
⚠️ CRITICAL: DATABASE & ORM SYSTEM INTEGRITY (DO NOT VIOLATE)
============================================================
- This workspace already has a fully configured database layer using Drizzle ORM and PostgreSQL inside the `@workspace/db` package.
- DO NOT install, configure, or use '@replit/database', Replit Object Storage, or any other Replit-specific database helper or library.
- DO NOT write any custom database connection logic, pg-pools, or SQL client setups.
- DO NOT rewrite, modify, or add fields to the existing Drizzle schema files in `lib/db/src/schema/`. They are already complete and functional.
- ALWAYS import the database query client (`db`) and table schemas (e.g. `tasksTable`, `coursesTable`, etc.) from `@workspace/db`.
- The database is configured using the DATABASE_URL environment variable from the `.env` file at the root.

============================================================
1. CODEBASE DIRECTORIES & PACKAGES:
============================================================
- Express Backend: `Scheduler-integrated/artifacts/api-server`
- React Frontend: `Scheduler-integrated/artifacts/nexusdesk`
- Shared DB Library: `Scheduler-integrated/lib/db`
- API Spec / Codegen: `Scheduler-integrated/lib/api-spec` (source OpenAPI spec at `lib/api-spec/openapi.yaml`)
- API React Client (generated): `Scheduler-integrated/lib/api-client-react`
- Note: The backend recording router (`src/routes/record.ts`) and Lemma SDK note ingestion parser (`src/routes/ingest.ts`) are ALREADY coded. Do not modify their core logic.

============================================================
2. AUTHENTICATION & GUEST MODE BYPASS:
============================================================
- Setup Google and GitHub OAuth configurations in the Express `api-server` backend.
- Create a landing page with Google and GitHub login buttons.
- Add a prominent, styled "Quick Dev Bypass" / "Guest Mode Bypass" login button. Clicking this should log the user in instantly by returning a pre-seeded guest user session token/cookie from the backend, completely bypassing OAuth providers so judges and testers can enter the dashboard immediately.

============================================================
3. LIVE PERSONA SWITCHER & NEO-BRUTALIST THEME:
============================================================
- On boarding: Prompt the user to select their profile type:
  - "Student / Parent Mode" (with sub-settings to toggle between Student view and Parent view).
  - "Working Professional Mode".
- Persona Switcher Widget: Place a highly visible navigation bar toggle ("Student/Parent Mode ↔ Professional Mode") to change roles instantly on-screen without requiring logouts.
- Re-theming Mechanism: Dynamically swap visual theme variables or classes on switch:
  - Student / Parent Mode: Neo-Brutalist amber/green theme. Dark paper background (#F1F0E8 / #2D2D2D borders). Vocabulary tracks "Child's Progress" when Parent sub-mode is active.
  - Working Professional Mode: High-contrast steel blue, navy, and slate corporate modern Brutalist theme.
  - Force Brutalist Design Rules globally: `border-radius: 0px !important`, thick borders (`border-2 border-ink`), and solid offset flat shadows (`shadow-[4px_4px_0px_0px_rgba(45,45,45,1)]`).

============================================================
4. COMPREHENSIVE PERSONA DASHBOARDS:
============================================================
- STUDENT / PARENT DASHBOARD:
  - School/Class timeline scheduler: 7am–10pm timeline grid showing today's classes and subjects.
  - Milestones: Homework & Exam checklists.
  - Customizable Attendance Tracker: An attendance percentage progress bar with an interactive slider in Settings (customizable from 50% to 100%). Dynamically calculates:
    - Current attendance percentage.
    - Safe-to-skip days remaining (before falling below threshold).
    - Mandatory classes needed to attend (to restore safety).
  - Attendance Risk Heatmap: Weekly calendar grid color-coded by safety status (Green: safe, Orange: near threshold warning, Red: unsafe/mandatory attendance).
  - Digital Recording Loopback Widget: Start/stop recording buttons connected to the backend endpoint `/api/record` for saving online class lectures.
- WORKING PROFESSIONAL DASHBOARD:
  - Timeline: Daily standup times and meeting log panel.
  - Product release roadmap: Milestone checklist with Dev -> QA -> Release checkmark progression.
  - Kanban board: Dedicated columns for Professional categories ('SAGE_SPRINT', 'PRODUCTION_OPS', 'CLIENT_CRM', 'LOGISTICS').
  - File uploader dropzone: For PPT, PDF, Excel, and CSV files.

============================================================
5. CLIENT-SIDE FILE EXTRACTION & SVG GRAPHING (NO HALLUCINATIONS):
============================================================
- Client-Side Parsing: To prevent server-side failures or binary parser bugs, execute parsing on the client:
  - PDF: Use `pdfjs-dist` on the frontend to extract text page-by-page.
  - Excel/CSV: Parse on the frontend into markdown table structures.
  - Plain Text Delivery: Submit the parsed text to the backend `POST /api/ingest` under the `rawText` field.
- INTERACTIVE GRAPHING (CRITICAL): Draw graphs dynamically using custom React SVG components (DO NOT install complex external charting packages that may introduce compilation or TypeScript type errors). Create clean SVG bar, pie, and line charts:
  - Use `<rect>` elements for bar charts (e.g. showing task count by priority or grade distributions).
  - Use `<path>` elements with calculated polar coordinates (`M cx cy L x1 y1 A r r ...`) for pie charts (e.g. for attendance or project metrics).
  - Use `<polyline>` or `<path>` elements for line graphs (e.g. billable hours trends).
  - Apply the Muted Neo-Brutalist styling (thick black outlines, high-contrast colors, sharp edges) directly to the SVG shapes.
- DEMO INGESTION BYPASS: Add a prominent "Load Demo Session" button next to the uploader. Clicking this must call a backend demo loading endpoint (`POST /api/ingest/demo`) that inserts a pre-configured mock dataset (schedule timetable, tasks, attendance history, grades, projects with confidence scores, and reasoning quotes) directly into the database. This allows instant visualization of populated dashboards and SVG charts without needing any API keys.

============================================================
6. KANBAN WIDGET ENHANCEMENTS:
============================================================
- Dynamic Categorization:
  - Student columns: 'HOMEWORK_SCHOOL', 'EXTRACURRICULAR', 'EXAM_PREP', 'PERSONAL'.
  - Professional columns: 'SAGE_SPRINT', 'PRODUCTION_OPS', 'CLIENT_CRM', 'LOGISTICS'.
- Card Details:
  - Display a color-coded "Confidence Badge" based on the task's `confidenceScore` (Green: score 4-5, Orange: score 3, Red: score 1-2).
  - Display a collapsible "Why did the agent do this?" trace accordion. When expanded, show the exact `reasoningQuote` extracted from the project specification.

============================================================
7. ONE-CLICK EMAIL DRAFT:
============================================================
- Add a "Draft Follow-up Email" / "Copy & open Gmail" action next to meeting logs and summaries in Professional Mode.
- This action must generate a mailto link with a pre-configured subject ("Meeting minutes & action items") and a structured Markdown summary body containing action points, deadlines, and assigned tasks.

============================================================
8. MULTI-MODEL SETTINGS & SECURITY:
============================================================
- Settings Modal: A navigation bar icon opening a modal to select the LLM Provider:
  - Google Gemini (models: gemini-2.5-flash, gemini-2.5-pro)
  - OpenAI GPT (models: gpt-4o, gpt-4o-mini)
  - Anthropic Claude (models: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022)
- Key Security: Allow inputting custom API keys. Store them in browser `localStorage`. When calling `POST /api/ingest`, send the provider, model, and apiKey in the body. If the apiKey is empty, configure the backend routes to safely fallback to server-side process environment secrets (e.g., `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) so credentials don't leak.
- Connectivity Status Indicator: Add a status dot in the navigation bar:
  - Green: "Connected (Server Key Active)" (no local key set, but server-side key is active).
  - Purple: "Custom Key Active (Local Settings)" (user's custom localStorage key is active).
  - Red: "API Key Required" (neither is configured).

============================================================
9. WEBSOCKET SYNC & RECONNECT TOAST:
============================================================
- Backend Sync: Add a simple WebSocket server inside `api-server` (e.g., using the `ws` package). Broadcast updates to client whenever task, course, or scheduling tables change.
- Client Sync: Implement a React WebSocket hook or connection in `nexusdesk` that listens to `ws://localhost:8080`.
- Toast Reconnect Alert: If connection drops, execute an exponential backoff reconnect loop and display a non-blocking neo-brutalist toast alert ("Reconnecting to live sync..."). Update the toast to "Connected" when connection is successfully restored.

Ensure Vite React is configured to run on port 19211 and Express backend runs on port 8080. Follow the Muted Neo Brutalist styling rules (zero border radius, thick borders, hard offset shadows) defined in the CSS layout.
```

---

## 🏁 Step 3: Running the App Locally

Once the Replit Agent completes running the prompt:
1. Run `./launch.sh` in the `Scheduler-integrated` directory to spin up the backend and frontend servers.
2. Open your browser to: `http://localhost:19211`
3. Click the **Guest Mode Login Bypass** button to access the dashboards and start testing the pipeline!
```
