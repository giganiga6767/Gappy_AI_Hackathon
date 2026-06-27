# Onboarding Guide: Get Started in Under 5 Minutes

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

This guide walks you through setting up, running, and exploring NexusDesk.

---

## Step 1: Install System Prerequisites

First, open your Linux terminal or WSL shell to install the required system utilities:

```bash
sudo apt update && sudo apt install ffmpeg zip alsa-utils pulseaudio-utils -y
```

---

## Step 2: Run Setup

Run the automated bootstrapping script at the root of the project:

```bash
bash setup.sh
```

During setup, you will be prompted for a **Google Gemini API Key**. You can paste your key (see [INSTALL_LINUX.md](./INSTALL_LINUX.md) to get one for free) or press **Enter** to skip and run offline with local models.

### ? What just happened?
The `setup.sh` script automated the following configurations:
1. Created your local `.env` environment configuration.
2. Installed all Node.js workspace dependencies via `pnpm`.
3. Configured python requirements for local audio processing and parsing.
4. Initialized your local SQLite database file (`sqlite.db`) and pushed the tables.

---

## Step 3: Launch the Workspace

Start all concurrent services with a single command:

```bash
bash launch.sh
```

### ? What just happened?
The `launch.sh` script runs three background services simultaneously:

| Service | Port | Description | URL |
|---|---|---|---|
| **Vite Frontend** | `19211` | React Neo-Brutalist dashboard interface | [http://localhost:19211](http://localhost:19211) |
| **Express API Server** | `8080` | Express REST server managing data and local AI scripts | [http://localhost:8080](http://localhost:8080) |
| **Lemma Backend** | `4000` | Lemma background agents and workflows | [http://localhost:4000](http://localhost:4000) |

To stop all services cleanly, press `Ctrl+C` in your terminal.

---

## Terminal First: The `nexus` CLI

The `./bin/nexus` CLI tool gives you terminal-first control over your academic desk. Here are the most useful commands:

### 1. Zero Lock-In Exports
Export your data to external calendar apps or local backups instantly:
```bash
# Export compatible calendar (.ics) to import into Google/Apple Calendar
./bin/nexus export ics

# Pack all notes, summaries, tasks, and raw audio files into a ZIP archive
./bin/nexus export zip

# Export raw JSON data
./bin/nexus export json

# Export a Markdown summary report of your semester progress
./bin/nexus export md
```

### 2. Ingestion & Recording
Ingest content into your Inbox from the terminal:
```bash
# Capture raw text or syllabus paste
./bin/nexus capture --text "CS301 lectures: Mon/Wed 10-11am, Room 204, Prof. Kumar"

# Ingest a PDF file
./bin/nexus import ./syllabus.pdf --title "CS301 Syllabus"

# Interactively record mic audio (Press Ctrl+C to stop)
./bin/nexus capture --record --title "Systems Lecture - Week 3"

# Record loopback system audio (Zoom meetings, browser videos)
./bin/nexus capture --record --system --title "Meeting Recording"
```

After capturing, navigate to **Inbox** in the Web UI to preview and commit the data.

---

## Daily Team Workflows

If you are developing or using NexusDesk with a team, follow these best practices:

* **Starting the workspace**: Always run `bash launch.sh` and access the dashboard at `http://localhost:19211`.
* **Syncing schema updates**: If you pull changes that modify database schemas under `lib/db/src/schema/`, run:
  ```bash
  pnpm --filter @workspace/db push-force
  ```
* **Git hygiene**: Never commit `sqlite.db` or `.env` files (both are git-ignored).
