# 🐧 Linux Installation Guide (Ubuntu / Debian / Mint)

Students don't fail to stay organized because they lack apps — they fail because manual data entry is too tedious to sustain. NexusDesk eliminates that friction entirely. Drop a blurry timetable photo, a 50-page syllabus PDF, or a messy lecture recording — and your entire semester is set up in seconds.

---

### 📦 Prerequisites at a Glance
Ensure you have these system utilities installed before proceeding:
- **Node.js**: v20+ (managed via NVM)
- **pnpm**: v9+ (monorepo package manager)
- **Python**: v3.11+
- **System Packages**: `git`, `curl`, `ffmpeg`, `alsa-utils`, `pulseaudio-utils`, `zip`

---

## 🚀 Step 1: Install System Dependencies

Open your terminal and run this command to install the required system libraries:

```bash
sudo apt update && sudo apt install -y git curl ffmpeg alsa-utils pulseaudio-utils zip python3 python3-pip
```

---

## 📦 Step 2: Configure Node.js (v20) & pnpm (v9)

We will install Node.js v20 via Node Version Manager (NVM) and install pnpm globally:

1. **Install NVM**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```
2. **Reload Shell Profile**:
   ```bash
   source ~/.bashrc
   ```
3. **Install Node.js v20**:
   ```bash
   nvm install 20 && nvm use 20
   ```
4. **Install pnpm globally**:
   ```bash
   npm install -g pnpm@9
   ```

---

## 📥 Step 3: Clone the Repository & Run Setup

Clone your repository and execute the automated setup script:

```bash
git clone https://github.com/giganiga6767/Gappy_AI_Hackathon.git
cd Gappy_AI_Hackathon
bash setup.sh
```

---

## 🤖 Step 4: Configure your AI Engine (Gemini vs Ollama)

NexusDesk allows processing syllabi, calendars, and text using either Cloud Gemini APIs or 100% offline local AI models.

| Metric | Option A: Google Gemini | Option B: Local Ollama |
|---|---|---|
| **Speed** | ⚡ Fast (API-driven processing) | 🐌 Dependent on local hardware CPU/GPU |
| **Quality** | High (Gemini 1.5/2.0 multimodal quality) | Variable (dependent on model size) |
| **Privacy** | Outgoing API requests | 🔒 100% Local, runs completely offline |
| **Setup** | Requires free API Key | Requires downloading models (~2GB) |

### Option A: Cloud Mode (Google Gemini)
1. **Get your API Key**:
   - Sign in to [Google AI Studio](https://aistudio.google.com/).
   - Click **Get API Key** and create one.
2. **Save to Environment**:
   Open the `.env` file at the root of the project and add the key:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   GOOGLE_API_KEY="your_api_key_here"
   ANTIGRAVITY_API_KEY="your_api_key_here"
   ```
3. **Select in Web UI**: Toggle the dashboard settings to **ANTIGRAVITY PRO**.

### Option B: Local Mode (Ollama Offline)
1. **Install Ollama**:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. **Download Models**:
   ```bash
   # For text ingestion & task extraction:
   ollama pull llama3.2
   # For screenshot / image timetables:
   ollama pull llama3.2-vision
   ```
3. **Select in Web UI**: Toggle the dashboard settings to **OLLAMA (LOCAL)**.

---

### 🎙️ Local Audio Transcription (Offline Whisper)
When transcribing lecture recordings locally:
- Select the **Local Whisper** option in the Class Notes page of the Web UI.
- On the first run, the Python script will automatically download the quantized `base.en` Whisper model (~150MB) to your machine. 

---

## ⚡ Step 5: Launch the Application

Start the concurrently running servers:

```bash
bash launch.sh
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
