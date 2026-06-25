# 🤝 Team Collaboration Guide
### Reviewing & Developing with Cursor IDE & Antigravity

This project was built using advanced agentic AI pair programming. To make reviewing, understanding, and modifying this codebase easy for the entire team (even if it is your first time dealing with web projects!), we highly recommend using **Cursor IDE** and **Antigravity**.

---

## 🚀 Recommended Tooling

### 1. Cursor IDE
[Cursor](https://www.cursor.com/) is an AI-powered code editor built on top of VS Code. It allows you to:
- **Chat with your Codebase**: Press `Ctrl + L` (Windows) / `Cmd + L` (Mac) to ask questions like:
  * *"Where is the routing configured?"*
  * *"How is the meeting filter set up in the Professional Dashboard?"*
  - Add `@Files` or `@Folders` to your query to focus the AI's context on specific code sections.
- **Auto-Edit Code**: Press `Ctrl + K` / `Cmd + K` inside any file, write your instruction (e.g., *"change this text to uppercase"* or *"fix this type signature"*), and the editor will draft the changes as a diff block you can accept with one key.

### 2. Google Antigravity
If you have access to Google Antigravity:
- It runs as an autonomous agent that can read instructions, run compilation checks (`pnpm run typecheck`), edit code, and verify builds for correctness.
- You can recommend a goal (e.g. `pnpm run build`) or let the agent write entire backend integrations for you.

---

## 🔍 How to Review the Codebase

Here are the key places to inspect to get familiar with the project:

### 📱 The Frontend Layout & Design
The user interface is built on **React + Vite + TailwindCSS (v4)**.
- **Routing**: [src/App.tsx](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/nexusdesk/src/App.tsx) contains all navigation endpoints.
- **Top Bar & Mode Selector**: [src/components/layout/TopBar.tsx](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/nexusdesk/src/components/layout/TopBar.tsx) handles switching between Student and Professional workspaces.
- **Professional Space**: Check out the timeline and sprint metrics in [src/components/professional/ProfessionalDashboard.tsx](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/nexusdesk/src/components/professional/ProfessionalDashboard.tsx).
- **Student Space**: Check out course modules in [src/components/student/StudentDashboard.tsx](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/nexusdesk/src/components/student/StudentDashboard.tsx).

### 🖥️ The Backend API
The server is an **Express** app running on Node.
- **Routes**: [artifacts/api-server/src/routes/](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/api-server/src/routes) contains files for each category of endpoints (e.g., `events.ts`, `tasks.ts`, `courses.ts`, and `ingest.ts`).
- **AI Document Parsing**: In [ingest.ts](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/artifacts/api-server/src/routes/ingest.ts), search for `provider === "lemma"` or `provider === "antigravity"` to see how timetables are processed via LLM.

### 🗄️ Database & Schema
The project uses **Drizzle ORM** with **PostgreSQL**.
- Check [lib/db/src/schema/](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/lib/db/src/schema) to see the tables, fields, and relations defined for the database.

---

## 💡 Quick Tips for Resolving Issues
If you encounter a bug or need to change a feature:
1. **Explain the issue to the IDE Chat**: Write `@codebase explain the flow when adding a new project milestone`.
2. **Auto-fix Type Errors**: Run `pnpm run typecheck` in the terminal. If it fails, copy the TypeScript error and paste it into Cursor with `Ctrl + K` to auto-resolve the error.
3. **Seed Clean Data**: If your local database state gets cluttered, run `node lib/db/wipe_db.cjs` to clear the tables, then click "Load Demo Session" on the Ingest page to re-initialize cleanly.
