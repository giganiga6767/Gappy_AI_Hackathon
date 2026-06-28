# 📖 NexusDesk CLI User Manual
Welcome to the NexusDesk Command Line interface manual. NexusDesk is designed with a **terminal-first, local-offline design**. This manual covers all CLI utilities and control scripts to manage your academic command center.

---

## 🚀 Lifecycle Scripts

### 1. Bootstrapping: `setup.sh`
Used to install dependencies, construct local configuration, and provision schemas.
```bash
bash setup.sh
```

### 2. Startup: `launch.sh`
Launches the concurrent workspace servers locally.
```bash
bash launch.sh
```
This runs three background services:
- **Vite Frontend**: `http://localhost:19211`
- **Express API Server**: `http://localhost:8080`
- **Lemma Backend**: `http://localhost:4000`

---

## 🗄️ Database Management Shortcuts

### 3. Cleaning the Database: `clean_db.sh` or `db:clean`
Wipes and resets the configured database (SQLite or PostgreSQL) to a pristine clean state.
```bash
# Option A: Run bash script directly
bash clean_db.sh

# Option B: Run via package shortcut
npx pnpm@9 db:clean
```
> [!NOTE]
> This command automatically detects whether your `.env` is configured with SQLite or PostgreSQL, installs dependencies if necessary, and clean-wipes all tables.

---

## 🛠️ The `nexus` CLI (`./bin/nexus`)
The primary tool to interact with your workspace from the terminal. 

### 1. Capture Raw Text
Instantly drop lecture notes, syllabus snippets, or exam dates into the Inbox:
```bash
./bin/nexus capture --text "CS301 lectures: Mon/Wed 10:00 AM - 11:00 AM, Room 204" --title "CS301 Slot info"
```

### 2. Import Files (Syllabus, PDFs, Images, Audio)
Ingest an academic document or audio recording for AI parsing:
```bash
# Import a syllabus
./bin/nexus import ./syllabus.pdf --title "ECE 401 Syllabus"

# Import a lecture recording
./bin/nexus import ./lecture_week1.mp3 --title "Lecture Week 1"
```
> [!TIP]
> The `import` command copies the asset into the corresponding workspace directory and queues it in the Web UI Inbox for processing.

### 3. Capture Live Voice Recording
Capture microphone input directly from your terminal:
```bash
./bin/nexus capture --record --title "My Brainstorming Session"
```
*Press `Ctrl + C` when finished to save and queue the audio file in the Inbox.*

### 4. Capture System Audio (Online Meetings, Zoom, YouTube)
Record system loopback audio to transcribe an online webinar, Zoom meeting, or class video:
```bash
./bin/nexus capture --record --system --title "Guest Lecture Live Stream"
```
*Press `Ctrl + C` when finished to stop the recording.*

---

## 📤 Zero Lock-In Export Commands
You own your academic data. Extract everything in universal formats:

```bash
# 1. Export calendar to universal iCalendar format (.ics)
./bin/nexus export ics

# 2. Export progress report and tasks to markdown (.md)
./bin/nexus export md

# 3. Export all metadata to structured JSON files
./bin/nexus export json

# 4. Export all notes, summaries, tasks, and raw audios compressed into a ZIP archive
./bin/nexus export zip
```

---

## 📥 Processing Ingested Data
Once you run a capture or import command, the items appear in the **Inbox** of the Web UI (`http://localhost:19211/inbox`):
1. Navigate to the **Inbox** page.
2. Click **Process/Review** on the captured item.
3. The AI agent will parse, transcribe, and extract semesters, courses, schedules, assignments, and study tasks.
4. Click **Apply / Commit** to provision them in the database!
