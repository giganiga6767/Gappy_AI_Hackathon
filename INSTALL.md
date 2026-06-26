# NexusDesk Installation Guide

This guide explains how to install, configure, and run NexusDesk on **Linux** and **Windows**.

---

## 🚀 New Laptop Quickstart (Single-Command Setup)

If you just bought a new laptop and want to get NexusDesk up and running in a single command, open your terminal (Ubuntu/Linux) or PowerShell (Windows 11) and run the command matching your operating system:

### 🐧 Linux (Ubuntu/Debian)
Open your terminal and run this single command to install all system dependencies (Git, Node, pnpm, Python, FFmpeg), clone the repository, and run the setup workflow:
```bash
sudo apt update && sudo apt install -y git curl ffmpeg alsa-utils pulseaudio-utils zip python3 python3-pip && curl -fsSL https://fnm.vercel.app/install | bash && export PATH="$HOME/.local/share/fnm:$PATH" && eval "`fnm env`" && fnm install 20 && fnm use 20 && npm install -g pnpm@9 && git clone https://github.com/YOUR_GITHUB_USERNAME/Gappy_AI_Hackathon.git && cd Gappy_AI_Hackathon && bash setup.sh
```
*(Note: Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)*

### 🪟 Windows (Powershell - Run as Administrator)
Open PowerShell as Administrator and run this command to install Git, Node.js, Python, FFmpeg, and Ollama automatically using the native Windows Package Manager:
```powershell
winget install -e --id Git.Git && winget install -e --id OpenJS.NodeJS.LTS && winget install -e --id Python.Python.3.11 && winget install -e --id Gyan.FFmpeg && winget install -e --id Ollama.Ollama
```
*After running, restart your terminal or PowerShell window to load the new system PATH environment variables, then run this final line to clone and bootstrap the database:*
```cmd
git clone https://github.com/YOUR_GITHUB_USERNAME/Gappy_AI_Hackathon.git && cd Gappy_AI_Hackathon && npm install -g pnpm@9 && copy .env.example .env && pnpm install && pip install -r requirements.txt && pnpm --filter @workspace/db push
```

---

## 📦 What About the Lemma SDK?
**You do not need to install anything manually for the Lemma SDK.** 
The SDK is an npm package dependency (`lemma-sdk`) configured directly inside our workspace `package.json` dependencies. It is downloaded and set up automatically during the `pnpm install` step of the setup scripts. No separate manual installation is needed!

---

## Prerequisites (Detailed Setup)
1. **Node.js** (v20 or higher)
2. **pnpm** (v9) - Install globally via `npm install -g pnpm@9`
3. **Python 3.10+** (Required for audio transcription, note-taking, and report generation)
4. **FFmpeg** (Required for converting WAV recordings to MP3)
5. **Google Gemini API Key** (Optional, but highly recommended for cloud transcription and agentic workflows. If not provided, the system runs in offline/local mode using CPU-quantized Whisper and local Ollama).

---

## 🐧 Linux Installation

### 1. Install System Dependencies
Install FFmpeg, audio tools, and development utilities:
```bash
sudo apt update
sudo apt install ffmpeg alsa-utils pulseaudio-utils zip -y
```

### 2. Run the Automatic Setup Script
Run the zero-friction installer in the project root:
```bash
bash setup.sh
```
This script will:
- Check for Node.js, Python3, and FFmpeg.
- Prompt for your Google Gemini API Key (press Enter to run offline with local models).
- Create a `.env` file referencing the local SQLite database.
- Install Node monorepo dependencies.
- Install Python dependencies (from `requirements.txt`).
- Provision the SQLite database and push the schema.

### 3. Launch the Application
Start the frontend, API server, and agentic backend concurrently:
```bash
bash launch.sh
```
Access the application at:
- **Frontend Dashboard**: [http://localhost:19211](http://localhost:19211)
- **Express API Server**: [http://localhost:8080](http://localhost:8080)
- **Lemma Agentic Backend**: [http://localhost:4000](http://localhost:4000)

---

## 🪟 Windows Installation

You can install NexusDesk on Windows using either **WSL (Recommended)** or **Native Windows**.

---

### Method A: WSL (Windows Subsystem for Linux) — *Recommended*
Since the repository relies on bash scripts (`setup.sh`, `launch.sh`) and command-line recording utilities, running it inside WSL (Ubuntu) provides the smoothest, zero-configuration experience.

1. **Open WSL Terminal**:
   If WSL is not installed, open PowerShell as Administrator and run:
   ```powershell
   wsl --install
   ```
2. **Follow Linux Steps**:
   Follow the **Linux Installation** steps above inside your WSL Ubuntu terminal.

---

### Method B: Native Windows (cmd / PowerShell / Git Bash)
If you prefer running natively on Windows, follow these steps:

#### 1. Install Node.js & pnpm
- Download and run the Node.js installer (v20+) from [nodejs.org](https://nodejs.org/).
- Open Command Prompt or PowerShell and install `pnpm`:
  ```cmd
  npm install -g pnpm@9
  ```

#### 2. Install Python & Dependencies
- Download and install Python 3.10+ from the Microsoft Store or [python.org](https://www.python.org/). **Make sure to check "Add Python to PATH" during installation.**
- In your terminal, verify Python is available:
  ```cmd
  python --version
  ```

#### 3. Install FFmpeg
- Download FFmpeg for Windows from [ffmpeg.org](https://ffmpeg.org/download.html) or install it via winget (Windows Package Manager):
  ```cmd
  winget install Gyan.FFmpeg
  ```
- Verify FFmpeg is accessible in your PATH:
  ```cmd
  ffmpeg -version
  ```

#### 4. Configure Environment Variables
- Copy the `.env.example` file to `.env` in the project root:
  ```cmd
  copy .env.example .env
  ```
- Edit `.env` using a text editor (e.g., Notepad or VS Code) to set your Gemini API Key and local database paths:
  ```env
  DATABASE_URL="file:./sqlite.db"
  NEXUSDESK_DB_URL="file:./sqlite.db"
  PORT=8080
  PORT_FRONTEND=19211
  GEMINI_API_KEY="your_gemini_api_key_here"
  GOOGLE_API_KEY="your_gemini_api_key_here"
  ANTIGRAVITY_API_KEY="your_gemini_api_key_here"
  ```

#### 5. Install Node & Python dependencies
- Install Monorepo Node dependencies:
  ```cmd
  pnpm install
  ```
- Install Python requirements:
  ```cmd
  pip install -r requirements.txt
  ```

#### 6. Push Database Schema
- Initialize the SQLite database and push the tables:
  ```cmd
  pnpm --filter @workspace/db push
  ```

#### 7. Launch the Application
To run all three servers simultaneously:
- **Using Git Bash (or WSL terminal if available)**:
  ```bash
  bash launch.sh
  ```
- **Using Command Prompt / PowerShell**:
  Run each service in a separate terminal window, or use pnpm to run them in parallel:
  ```cmd
  pnpm --filter @workspace/api-server --filter @workspace/nexusdesk --filter work-study-backend --parallel dev
  ```
- Access the app at [http://localhost:19211](http://localhost:19211).

---

## 🎙️ Note on Audio Recording
- **Web UI Recording**: The record button inside the web application (using Google Chrome, MS Edge, or Firefox) works perfectly on both Windows and Linux. It uses the browser's built-in MediaRecorder API to capture audio streams.
- **CLI Recording**: The CLI command `./bin/nexus capture --record` uses Linux-specific tools (`arecord`/`parecord`) and will not function natively on Windows command prompt. For Windows CLI recording, please run the application inside WSL.

---

---

## 🤖 How to Use AI Features for Free

NexusDesk offers two ways to use advanced AI features (Timetable/Syllabus Ingestion, Task Extraction, Notes Generation, and Report Compilation) completely for free:

### Option A: Cloud Mode (Free Google Gemini API Key) — *Fastest & Highest Quality*
Google AI Studio offers a free-tier API key with generous rate limits (up to 15 requests per minute), which is more than enough for student use.
1. **Get a Key**: Go to [Google AI Studio](https://aistudio.google.com/) and click **Get API Key**. Create a new key.
2. **Configure It**:
   - **Method 1 (Recommended)**: Open your `.env` file in the project root and paste the key:
     ```env
     GEMINI_API_KEY="your_ai_studio_api_key_here"
     GOOGLE_API_KEY="your_ai_studio_api_key_here"
     ANTIGRAVITY_API_KEY="your_ai_studio_api_key_here"
     ```
   - **Method 2**: Paste it directly in the Web UI. Go to the Ingest page or Inbox page, toggle settings, and enter the key.
3. **Toggle Web UI Provider**: In the Web UI settings (beside the dropzone), make sure the active provider is set to **ANTIGRAVITY PRO**.

---

### Option B: Local Mode (100% Free & Offline via Ollama) — *Private & Private Data Local Processing*
If you don't have internet or want to run everything locally on your own machine without sending data to the cloud:
1. **Download Ollama**: Download and install the Ollama client from [ollama.com](https://ollama.com/).
2. **Download Models**: Open a command prompt or terminal and pull the models:
   - For text-based ingestion and task structuring:
     ```bash
     ollama pull llama3
     ```
   - For processing screenshots, syllabus images, or PDF dropzones:
     ```bash
     ollama pull llama3.2-vision
     ```
3. **Start Ollama Server**: Make sure Ollama is running in the background (usually runs as a system tray icon, or run `ollama serve` in a terminal).
4. **Toggle Web UI Provider**: In the Web UI settings (beside the dropzone), toggle the active provider to **OLLAMA (LOCAL)**.

---

### 🎙️ Local Audio Transcription (100% Free & Offline via Whisper)
For transcribing classroom lecture recordings:
- When you select the **Local Whisper** transcription mode in the Web UI or run `bash class_notes.sh use_local <file>` in your CLI, the system uses the Python `faster-whisper` package.
- It will automatically download the CPU-quantized `base.en` model (~150MB) on the very first run. All future transcriptions run locally on your laptop's CPU with no API key or internet connection required.

---

## 🧠 Lemma SDK & Backend Requirement

### Is the Lemma SDK required?
**Yes.** The agentic backend (`work-study-backend`, port `4000`) depends on the **Lemma SDK** to coordinate background agents. 

The Lemma SDK manages:
- **Triage Agent** (`triageAgent`): Automates incoming transcript sorting into academic or enterprise databases.
- **Academic Copilot** (`academicCopilot`): Generates tailored study strategies and curates learning resources (such as YouTube videos and practice sites) based on upcoming deadlines.
- **Enterprise Architect** (`enterpriseSolutionArch`): Provides unblocking suggestions for professional tasks when they are marked as `BLOCKED`.

The dependency `lemma-sdk` is defined in the package manager config and is automatically installed when you run `bash setup.sh` (or `pnpm install`). Make sure the backend service is running (which `launch.sh` starts automatically) for background agentic operations.
