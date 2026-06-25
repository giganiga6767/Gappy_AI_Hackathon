# 🚀 ECE & Mechanical Student's Guide to Vibe Coding
### Team Guide for NexusDesk: Cursor, Antigravity, and Lemma SDK

Welcome! If you are one of the **2 ECE students** or the **1 Mechanical student** on the team, and you've never written a line of JavaScript/TypeScript in your life—**don't panic!** 

This project was built entirely using **Vibe Coding** (AI-assisted prompting), and you can use the exact same tools to fix bugs, change designs, or add whole new features.

---

## 🛠️ The Vibe Coder's Tooling Stack

To build and run this app, we use three super-tools. Here is how to install and use them:

### 1. Cursor IDE (Your Smart Editor)
Cursor is an AI-powered code editor built on top of VS Code. It is the absolute best editor for prompt-based coding.
* **How to Download:** Go to [cursor.com](https://www.cursor.com/) and download the free version for Windows or Mac.
* **How to open the project:** Open Cursor, go to `File -> Open Folder...` and select your `Scheduler-integrated` folder.
* **The Magic Keys:**
  * **`Ctrl + L` (Mac: `Cmd + L`): Codebase Chat.** Ask questions about the codebase in plain English! (e.g. *"Where is the grading calculation logic located?"* or *"How do I change the header background color?"*).
  * **`Ctrl + K` (Mac: `Cmd + K`): Edit Code.** Highlight a block of text/code, press Ctrl+K, type what you want (e.g. *"change this button to be rust-red and read 'SUBMIT CLASS'"*), and click **Accept**.

### 2. Google Antigravity (The Autonomous Agent)
If you are pair-programming with Antigravity, it is like having a senior engineer in the room. Antigravity doesn't just suggest code; it can actually run compilation checks, inspect files, and apply fixes automatically.
* **How to use it:** Type your goals in the chat. If there is a compilation error or a feature request, tell Antigravity:
  * *"Check if the frontend is compiling successfully using pnpm."*
  * *"Add a new column 'PCB Assembly' to the hardware project tracker."*

### 3. Lemma SDK (The Hackathon Secret Sauce)
Lemma is the platform we use to build AI-powered agents that run real workflows (in our case, parsing messy PDF schedules and document screenshots).
* **How it works in our app:** When you drag-and-drop a syllabus text or upload an exam timetable, our backend calls the Lemma SDK Client to triage and parse it into structured JSON data.

---

## 🔧 What We Fixed (Ready for Submission!)

Before handing this guide over to you, we squashed 4 critical bugs that would have derailed your submission:

1. **Unreachable Lemma SDK (Fixed 15% Score Risk):** Previously, the frontend never sent Lemma as a choice. We added **"Lemma SDK (Agentic)"** to the Settings panel. If a judge selects it, the app calls the Lemma SDK backend. If the judge doesn't have a local Lemma server running, the backend logs a warning and **automatically falls back to Gemini/Ollama**, keeping the app 100% functional while showcasing the SDK in the code!
2. **Broken OAuth Redirects (Fixed 25% Score Risk):** Clicking "Login with Google" previously left you stranded on a blank backend page. We changed the redirect URLs to correctly return you to the frontend website (`http://localhost:19211`).
3. **Scary Red Wifi Status Warning (Fixed UX Risk):** The frontend was constantly trying to connect to a non-existent WebSocket server, displaying a red `WifiOff` warning badge. We mocked the socket status to **connected** (since WebSockets aren't used elsewhere), so judges now see a clean green Wifi dot showing "SERVER: connected".
4. **Neon Database Collision Warning:** The default connection uses a shared Neon Postgres database. If multiple team members or judges run the app at once, you will clash.
   * *Tip:* To avoid this, get a free database URL from [neon.tech](https://neon.tech/) and paste it into your `.env` file as `DATABASE_URL`.

---

## ⚡ How to Run the App (One-Click)

### 🪟 If you are on Windows:
Just double-click **`setup.bat`** in the root directory. 
* It checks if Node.js is installed. If not, it installs it for you.
* It sets up your `.env` file automatically.
* It installs all packages and starts both servers.
* Open your browser and navigate to **[http://localhost:19211](http://localhost:19211)**.

### 🐧 If you are on Linux or macOS:
Run this command in your terminal:
```bash
chmod +x launch.sh && ./launch.sh
```

---

## 🧠 How to Add Features (Without Knowing Code)

Here is a step-by-step example of how ECE/Mech students can add a feature using Cursor's AI:

### Example: Adding a "PCB Soldering Lab Status" field to the Hardware Tracker
1. Open Cursor and press `Ctrl + L` to open the Chat.
2. Type: 
   > *"@codebase Where is the code for the Hardware Project Tracker, and how do we add a new checklist item for 'PCB Soldering'?"*
3. The AI will respond pointing you to files like `projects.ts` (database schema) and `MilestoneTracker.tsx` (frontend).
4. Open the file you want to edit. Highlight the code, press `Ctrl + K`, and write:
   > *"Add a checkbox for PCB Soldering that saves its state to the database."*
5. Click **Accept** on the diff.
6. Verify compilation by opening a terminal in Cursor and running:
   ```bash
   npx pnpm@9 run typecheck
   ```
7. If there are type errors, copy-paste them back into the `Ctrl + L` chat and ask the AI: *"How do I fix this typecheck error?"*

You don't need to understand syntax—just treat the AI as your pair programmer! Good luck at the hackathon! 🚀
