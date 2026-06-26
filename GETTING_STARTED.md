# Getting Started with NexusDesk

This guide covers system setup, installation, running the services, CLI usage, and team workflows.

---

## 1. Setup & Installation

For a detailed platform-specific installation guide covering **Linux** and **Windows (WSL & Native)**, please refer to [INSTALL.md](./INSTALL.md).

### Quick Start (Linux/WSL)

1. **System Dependencies**:
   ```bash
   sudo apt update && sudo apt install ffmpeg alsa-utils pulseaudio-utils zip -y
   ```

2. **Run Setup**:
   ```bash
   bash setup.sh
   ```
   *(Creates `.env`, installs all Node and Python dependencies, and provisions the database schema)*

---

## 2. Running the App

Start the three background services concurrently by running:
```bash
bash launch.sh
```

This launch script starts the following services:

| Service | Port | Description | URL |
|---|---|---|---|
| **Vite Frontend** | `19211` | React Neo-Brutalist UI | [http://localhost:19211](http://localhost:19211) |
| **Express API** | `8080` | Express core REST server | [http://localhost:8080](http://localhost:8080) |
| **Lemma Backend** | `4000` | Lemma agentic background worker | [http://localhost:4000](http://localhost:4000) |

> [!NOTE]
> **Port Conflict Fix**: The Lemma Agentic Backend startup workflow explicitly runs on port `4000` to prevent port collisions with the root `PORT=8080` variable.

To shut down all running servers cleanly, press `Ctrl+C` in your terminal.

### Updating the Database Schema
After pulling changes that modify `lib/db/src/schema/`:
```bash
pnpm --filter @workspace/db push
```

---

## 3. CLI Tool — `nexus`

The `./bin/nexus` command provides terminal-first access to your academic desk without opening a browser.

### Ingestion & Capture
```bash
# Capture raw text (paste a syllabus, schedule, or meeting notes)
./bin/nexus capture --text "CS301 lectures: Mon/Wed 10-11am, Room 204, Prof. Kumar"

# Capture a local file (PDF, image, audio, notes)
./bin/nexus capture --file ./syllabus.pdf --title "CS301 Syllabus" --type pdf

# Capture a local file (shorthand alias)
./bin/nexus import ./syllabus.pdf --title "CS301 Syllabus"

# Record live microphone audio (Press Ctrl+C to stop)
./bin/nexus capture --record --title "CS301 Lecture - Week 3"

# Record system audio loopback (Zoom, YouTube, Google Meet)
./bin/nexus capture --record --system --title "Guest Lecture Recording"
```
After capturing, open the Web UI at `localhost:19211` ➔ **Inbox** to review, verify conflicts, and apply the extracted data.

### Zero Lock-In Export
```bash
# Full zip export (ZIP with calendar, notes, actions, recordings)
./bin/nexus export zip

# Calendar only (import into Google Calendar, Apple Calendar, Outlook)
./bin/nexus export ics

# Raw JSON dump
./bin/nexus export json

# Markdown progress summary
./bin/nexus export md
```

---

## 4. Team Workflow Guide

### Onboarding a New Team Member
```bash
# 1. Clone the repo
git clone <repo-url>
cd nexusdesk

# 2. Run setup (installs everything + creates sqlite.db)
bash setup.sh
# → Enter Gemini API key when prompted, or press Enter for offline mode

# 3. Launch the workspace
bash launch.sh

# 4. Open the UI
# → http://localhost:19211
```

### Day-to-Day Development
1. **Starting your day**: Run `bash launch.sh` and open `localhost:19211`.
2. **Capturing syllabus/schedule**: Run `./bin/nexus import ./syllabus.pdf`, then open the Web UI and review/apply the data.
3. **Pulling changes**:
   ```bash
   git pull
   # If schema changed:
   pnpm --filter @workspace/db push
   ```
4. **Shared Rules**:
   - Never commit `sqlite.db` or `.env` files (both are git-ignored).
   - After editing a DB schema, run `pnpm --filter @workspace/db push` locally and inform teammates.
   - Run `pip install -r requirements.txt` if python scripts/dependencies are updated.
