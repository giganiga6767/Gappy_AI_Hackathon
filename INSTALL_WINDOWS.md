# 🪟 Windows Installation Guide (Native & WSL)

This guide provides a fully spoon-fed, step-by-step procedure to get NexusDesk running on Windows. You can run it natively in Windows or inside WSL (Ubuntu).

---

## 💡 Method A: WSL (Windows Subsystem for Linux) — *Highly Recommended*

Since NexusDesk relies on bash scripts (`setup.sh`, `launch.sh`) and CLI audio recording, running it inside WSL (Ubuntu) provides the smoothest, zero-friction experience.

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
pnpm --filter @workspace/db push
```

---

### Step 3: Configure your AI Engine (Gemini or Local Ollama)

#### Option A: Cloud Mode (Google Gemini Key) — *Fastest & Highest Quality*
1. **Get your API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/).
   - Sign in with any Google account.
   - Click the blue **Get API Key** button at the top left.
   - Click **Create API Key**, copy it.
2. **Save it in your environment**:
   Open the `.env` file at the root of the project with a text editor (like Notepad or VS Code) and add the key to these three fields:
   ```env
   DATABASE_URL="file:./sqlite.db"
   NEXUSDESK_DB_URL="file:./sqlite.db"
   PORT=8080
   PORT_FRONTEND=19211
   GEMINI_API_KEY="your_copied_api_key"
   GOOGLE_API_KEY="your_copied_api_key"
   ANTIGRAVITY_API_KEY="your_copied_api_key"
   ```
3. **Select in Web UI**: In the web dashboard settings, make sure the active provider toggle is set to **ANTIGRAVITY PRO**.

#### Option B: Local Mode (100% Free & Offline via Ollama)
If you prefer running everything locally on your own machine without cloud access:

1. **Start Ollama**: Ollama runs automatically in your system tray on Windows.
2. **Download recommended efficient models**:
   Open Command Prompt or PowerShell and pull the models:
   - For text ingestion & task extraction:
     ```cmd
     ollama pull llama3.2
     ```
   - For screenshots or PDF images:
     ```cmd
     ollama pull llama3.2-vision
     ```
3. **Select in Web UI**: In the web dashboard settings, toggle the active provider to **OLLAMA (LOCAL)**.

---

### Step 4: Local Audio Transcription (Offline Whisper)
When transcribing class recordings locally (without cloud keys):
- Simply select the **Local Whisper** option in the Class Notes page of the Web UI.
- On the very first run, the Python script will automatically download the quantized `base.en` Whisper model (~150MB) to your machine. 

---

### Step 5: Launch the Application

To run all three servers simultaneously on native Windows:

```cmd
pnpm --filter @workspace/api-server --filter @workspace/nexusdesk --filter work-study-backend --parallel dev
```

Open your browser and navigate to:
- **Frontend Dashboard**: [http://localhost:19211](http://localhost:19211)

Press `Ctrl+C` in your terminal window to shut down the servers.
