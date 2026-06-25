# 🖥️ NexusDesk (aka Nexus Deck)
### Academic & Professional Command Center

Welcome to **NexusDesk**—a standalone Academic & Professional Command Center built with a gorgeous **Muted Neo-Brutalist** design. This app integrates a fluid standup/meeting timeline, automated document parsing via AI, course attendance tracking, CGPA simulation, Kanban task boards, project roadmap tracking, and daily routine logs.

---

## ⚡ Easy Setup (One-Click / Single-Command)

To make it as easy as possible for everyone, **no local database installation is required** because the project uses a hosted development database by default.

### 🪟 Windows Users (Standard Command)
1. Clone or download this repository.
2. Double-click the **`setup.bat`** file in the root folder, or run it in your terminal:
   ```cmd
   setup.bat
   ```
   *This script will automatically detect and install Node.js (via winget if missing), install `pnpm`, set up your `.env` configuration, download all dependencies, and launch the site.*

### 🐧 Linux / macOS Users
1. Clone or download this repository.
2. Run the launch script in your terminal:
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```

Once the script completes, the app will be running at:
- **Frontend App**: [http://localhost:19211/](http://localhost:19211/)
- **API Server**: [http://localhost:8080/](http://localhost:8080/)

---

## 🛑 What is NexusDesk?
**NexusDesk** is an all-in-one productivity suite that bridges academic and professional workflows. You can toggle between **Student Mode** (classes, timetable, syllabus uploads, CGPA simulators) and **Professional Mode** (billable hours tracker, sprints, standups, client follow-up email templates) using the toggle switcher in the top navigation bar.

---

## 🎨 Brutal Design Rules
NexusDesk features a high-contrast, tactile design system:
1. **Zero Border Radius**: Flat blocks with `border-radius: 0px` globally.
2. **Neo-Brutalist Colors**: High-contrast texts, clean backgrounds (`#F1F0E8` / `#E8E7DF`), and strong borders (`#2D2D2D`).
3. **Offset Shadows**: Solid block offset shadows (`shadow-brutal`) instead of fuzzy blurs.

---

## 📂 Project Structure
```
├── artifacts/
│   ├── api-server/       # Express Backend API server
│   └── nexusdesk/        # React + Vite Frontend application
├── lib/
│   └── db/               # PostgreSQL Database schemas (Drizzle ORM)
├── .env.example          # Template environment configurations
├── setup.bat             # Single-command setup for Windows
└── launch.sh             # Launch script for Unix-like systems
```

---

## 🧠 Cognitive Ingestion (AI Syllabus Scan)
If you wish to parse custom files or timetables using the AI cognitive scanner, you can enter your **Gemini API key** in the Settings icon (top-right gear) on the interface, or supply it in the `.env` file as `GEMINI_API_KEY`. 
If you do not have an API key, you can click **"LOAD DEMO SESSION"** on the Ingest page to populate the app with realistic demo data instantly without any keys.
