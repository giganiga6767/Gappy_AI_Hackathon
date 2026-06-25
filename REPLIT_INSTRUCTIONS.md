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

1. CODEBASE DIRECTORIES:
   - Express Backend: `Scheduler-integrated/artifacts/api-server`.
   - React Frontend: `Scheduler-integrated/artifacts/nexusdesk`.
   - Note: The backend recording router (`src/routes/record.ts`) and Lemma SDK note ingestion parser (`src/routes/ingest.ts`) are ALREADY coded. Do not modify their core logic.

2. AUTHENTICATION & LOGIN BYPASS:
   - Setup Google and GitHub OAuth configurations in `api-server`.
   - Add Google and GitHub sign-in buttons on the landing page.
   - Add a prominent "Quick Dev Bypass" / "Guest Mode Bypass" login button. Clicking this should log the user in instantly as a pre-configured guest profile without needing real OAuth credentials, allowing the judges to test the app immediately.

3. LIVE PERSONA SWITCHER & CUSTOM THEMING:
   - Onboarding view: Prompt the user to choose their profile type:
     - "Student / Parent Mode" (for any school/college grade level, from 5th class, 10th class, to university, with sub-settings to toggle between Student view and Parent view).
     - "Working Professional Mode" (for sprint, roadmaps, and CRM tracking).
   - Add a visible toggle switcher in the navigation bar: "Student/Parent Mode ↔ Professional Mode" to allow changing roles dynamically on-screen during the demo.
   - Dynamically re-theme the UI on switch:
     - Student/Parent Mode Theme: Muted brutalist amber/green glow styling with dark paper background (#F1F0E8 / #2D2D2D borders). If "View as Parent" is toggled, adjust vocabulary to track "Child's Progress".
     - Professional Mode Corporate Theme: High-contrast steel blue, navy, and slate corporate modern styling.

4. DYNAMIC PERSONA DASHBOARDS:
   - STUDENT / PARENT DASHBOARD:
     - School/Class timeline scheduler showing today's classes and subjects.
     - Homework & Exam milestones checklist.
     - Customizable Attendance Progress Bar: An attendance tracker with an editable threshold slider in Settings (customizable from 50% to 100%, e.g., 75% for college, 85% for high school/10th class, or 90% for primary school). Calculates safe-to-skip days or mandatory attendance targets.
     - Attendance Risk Calendar Heatmap: Render a week/month calendar grid where days are color-coded based on attendance risk safety (Green: safe to skip, Orange: near threshold, Red: danger, must attend school).
     - Recording start/stop buttons connected to the backend digital loopback recording endpoint (for students to record online classes or lectures).
   - WORKING PROFESSIONAL DASHBOARD:
     - Daily standup timeline and meeting log panel.
     - Product release roadmap milestones showing Dev -> QA -> Release checkmarks.
     - Kanban sprint board showing billable client hours and quorum indicators.
     - File uploader dropzone for Excel, PDF, PPT, and CSV uploads.

5. FILE EXTRACTION, EXCEL GRAPHING & DEMO BYPASS:
   - To prevent LLM binary failures, implement client-side text pre-extraction before hitting the backend:
     - For PDFs: Use `pdfjs-dist` on the client to extract text page-by-page.
     - For Excel/CSV: Parse spreadsheets client-side into clean markdown tables.
     - INTERACTIVE EXCEL GRAPHS (CRITICAL): When Excel/CSV data is uploaded (e.g. grade sheet, task list, project budget, or attendance metrics), render interactive frontend graphs (pie charts for grade distributions, bar charts for task priorities, line graphs for billable hours trends) dynamically directly on the dashboard.
     - Send the parsed plain text to `POST /api/ingest` under the `rawText` field.
   - DEMO INGESTION BYPASS (CRITICAL): Add a "Load Demo Session" button next to the uploader. When clicked, it should completely bypass AI steps and instantly populate the database with a pre-configured realistic mock dataset (syllabus schedule, attendance history, tasks with confidence scores, and reasoning quotes) so anyone can test all visual pages and widgets without needing any API keys.

6. KANBAN WIDGET ENHANCEMENTS (CONFIDENCE SCORING & TRANSPARENCY):
   - Categorize columns dynamically based on active persona:
     - Student/Parent categories: 'HOMEWORK_SCHOOL', 'EXTRACURRICULAR', 'EXAM_PREP', 'PERSONAL'.
     - Professional categories: 'SAGE_SPRINT', 'PRODUCTION_OPS', 'CLIENT_CRM', 'LOGISTICS'.
   - On each Kanban task card, display:
     - A color-coded "Confidence Badge" based on the task's `confidenceScore` (Green badge for 4-5 high confidence, Orange for 3, Red for 1-2 needs review).
     - A collapsible "Why did the agent do this?" trace accordion. When expanded, display the exact `reasoningQuote` extracted from the specification.

7. ONE-CLICK EMAIL DRAFT:
   - In Professional Mode, add a "Draft Follow-up Email" / "Copy & open Gmail" button next to processed meeting summaries.
   - Clicking it should open a browser window using a mailto link prefilled with the subject "Meeting minutes & action items" and a structured markdown body containing meeting summary bullets and Kanban tasks.

8. MULTI-MODEL PROVIDER SUPPORT, SECURE KEYS & STATUS INDICATOR:
   - Add a Settings icon/modal in the navigation bar. Inside it, allow the user to select their preferred cloud LLM provider:
     - "Google Gemini" (default models: gemini-2.5-flash, gemini-2.5-pro)
     - "OpenAI GPT" (default models: gpt-4o, gpt-4o-mini)
     - "Anthropic Claude" (default models: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022)
   - Allow entering and saving their respective API keys. Store the selected provider, model, and active API key securely in the browser's `localStorage` so it persists.
   - When calling `POST /api/ingest`, send the `provider`, `model`, and `apiKey` values in the request body. If the user doesn't specify a key, the backend will safely fallback to the server-side environment secrets (e.g. GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY) so they don't leak.
   - Add a visible connectivity status indicator in the navigation bar:
     - Green dot: "Connected (Server Key Active)" if no custom local key is set but server default key is active.
     - Purple dot: "Custom Key Active (Local Settings)" if the user has configured their own custom key.
     - Red dot: "API Key Required" if neither is set.

9. WEBSOCKET SYNC & RECONNECT TOAST:
   - For real-time task updates via Lemma change stream, implement a WebSocket client in React.
   - Add a reconnect loop with exponential backoff and a non-blocking toast alert showing "Reconnecting to live sync..." when connection drops, updating to "Connected" when restored.

Ensure Vite React is configured to run on port 19211 and Express backend runs on port 8080. Follow the Muted Neo Brutalist styling rules (zero border radius, thick borders, hard offset shadows) defined in the CSS layout.
```

---

## 🏁 Step 3: Running the App Locally

Once the Replit Agent completes running the prompt:
1. Run `./launch.sh` in the `Scheduler-integrated` directory to spin up the backend and frontend servers.
2. Open your browser to: `http://localhost:19211`
3. Click the **Guest Mode Login Bypass** button to access the dashboards and start testing the pipeline!
```
