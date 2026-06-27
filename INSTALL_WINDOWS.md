# 🪟 Windows Installation Guide (Native & WSL)

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

---

### 📦 Prerequisites at a Glance
Ensure you have these system utilities installed before proceeding:
- **Node.js**: v20+ (managed via NVM or winget)
- **pnpm**: v9+ (monorepo package manager)
- **Python**: v3.11+
- **System Packages**: `git`, `ffmpeg`, `zip` (for native) or Ubuntu WSL

---

## 💡 Method A: WSL (Windows Subsystem for Linux) — *Highly Recommended*

Since NexusDesk relies on bash scripts (`setup.sh`, `launch.sh`) and CLI audio recording, running it inside WSL (Ubuntu) provides the smoothest, zero-friction experience. 

### Why WSL is better:
* **Native Tooling**: Prevents Windows driver and shell incompatibilities with bash script configurations.
* **Audio Pipelines**: Handles loopback recording and Whisper audio compression libraries natively.
* **Node Environment**: Avoids Windows filesystem performance penalties with Node monorepos.

### Step 1: Install WSL
Open PowerShell **as Administrator** and run:
```powershell
wsl --install
```
*Restart your computer if prompted. This will install Ubuntu on your machine.*

### Step 2: Run Setup
Open your new Ubuntu terminal and follow the instructions in **[INSTALL_LINUX.md](./INSTALL_LINUX.md)**.

---

## 💻 Method B: Native Windows Setup (PowerShell / Command Prompt)

If you prefer running natively on Windows without Linux, follow these steps:

### Step 1: Install Prerequisites (One-Command winget Setup)
Open PowerShell **as Administrator** and run this single command to install Git, Node.js, Python, FFmpeg, and Ollama automatically using the native Windows Package Manager. If you are using standard Command Prompt (cmd) instead of PowerShell, you should run each command individually instead of using the chained format.

```powershell
winget install -e --id Git.Git; winget install -e --id OpenJS.NodeJS.LTS; winget install -e --id Python.Python.3.11; winget install -e --id Gyan.FFmpeg; winget install -e --id Ollama.Ollama
```

*After running, restart your PowerShell or Command Prompt window to refresh your PATH environment variables.*

---

### Step 2: Clone and Bootstrap the Workspace
Open PowerShell or Command Prompt, and run these commands to set up the project:

```cmd
git clone https://github.com/giganiga6767/Gappy_AI_Hackathon.git
cd Gappy_AI_Hackathon
npm install -g pnpm@9
copy .env.example .env
pnpm install
pip install -r requirements.txt
pnpm --filter @workspace/db push-force
```

---

### Step 3: Configure your AI Engine (Gemini vs Ollama)

| Metric | Option A: Google Gemini | Option B: Local Ollama |
|---|---|---|
| **Speed** | ⚡ Fast (API-driven processing) | 🐌 Dependent on local hardware CPU/GPU |
| **Quality** | High (Gemini 1.5/2.0 multimodal quality) | Variable (dependent on model size) |
| **Privacy** | Outgoing API requests | 🔒 100% Local, runs completely offline |
| **Setup** | Requires free API Key | Requires downloading models (~2GB) |

#### Option A: Cloud Mode (Google Gemini Key)
1. **Get your API Key**:
   - Sign in to [Google AI Studio](https://aistudio.google.com/).
   - Click **Get API Key** and create one.
2. **Save to Environment**:
   Open the `.env` file at the root of the project and add the key:
   ```env
   DATABASE_URL="file:./sqlite.db"
   NEXUSDESK_DB_URL="file:./sqlite.db"
   PORT=8080
   PORT_FRONTEND=19211
   GEMINI_API_KEY="your_api_key_here"
   GOOGLE_API_KEY="your_api_key_here"
   ANTIGRAVITY_API_KEY="your_api_key_here"
   ```
3. **Select in Web UI**: Toggle the dashboard settings to **ANTIGRAVITY PRO**.

#### Option B: Local Mode (Ollama Offline)
1. **Start Ollama**: Ollama runs automatically in your system tray on Windows.
2. **Download Models**:
   Open Command Prompt or PowerShell and pull the models:
   ```cmd
   # For text ingestion:
   ollama pull llama3.2
   # For screenshots/images:
   ollama pull llama3.2-vision
   ```
3. **Select in Web UI**: Toggle the dashboard settings to **OLLAMA (LOCAL)**.

---

### Step 4: Local Audio Transcription (Offline Whisper)
When transcribing lecture recordings locally:
- Select the **Local Whisper** option in the Class Notes page of the Web UI.
- On the first run, the Python script will automatically download the quantized `base.en` Whisper model (~150MB) to your machine. 

---

### Step 5: Launch the Application

To run all three servers simultaneously on native Windows:

```cmd
pnpm --filter @workspace/api-server --filter @workspace/nexusdesk --filter work-study-backend --parallel dev
```

---

## 🚦 Verify Everything is Working

Before using the app, run these checks to verify that the services are online and connected:

1. **Frontend UI Check**
   - Access [http://localhost:19211](http://localhost:19211) in your browser.
   - *Expected Response*: The Neo-brutalist dashboard loads.
2. **Express API Health Check**
   - Run: `curl -s http://localhost:8080/health`
   - *Expected Response*: `{"status":"ok"}`
3. **Lemma Agentic Health Check**
   - Run: `curl -s http://localhost:4000/api/digest` (or verify terminal logs).
   - *Expected Response*: JSON digest or event-listener reports.
