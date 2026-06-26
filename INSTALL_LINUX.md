# 🐧 Linux Installation Guide (Ubuntu / Debian / Mint)

This guide provides a fully spoon-fed, step-by-step procedure to get NexusDesk running on your Linux machine with zero friction.

---

## 🚀 Step 1: Install System Dependencies

Open your terminal and run this single command to install all required system libraries:

```bash
sudo apt update && sudo apt install -y git curl ffmpeg alsa-utils pulseaudio-utils zip python3 python3-pip
```

---

## 📦 Step 2: Set Up Node.js (v20) & pnpm (v9)

We will install Node.js v20 via NVM (Node Version Manager) and install pnpm globally.

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

Clone your repository and run the automated setup script:

```bash
git clone https://github.com/giganiga6767/Gappy_AI_Hackathon.git
cd Gappy_AI_Hackathon
bash setup.sh
```

During the setup script execution:
- It will install all Node monorepo packages.
- It will download and install Python requirements (`requirements.txt`).
- It will initialize your local SQLite database (`sqlite.db`) and push the tables.
- It will prompt you for a **Google Gemini API Key**. (See the section below on how to obtain one for free, or press Enter to skip and run 100% locally).

---

## 🤖 Step 4: Configure your AI Engine (Gemini or Local Ollama)

NexusDesk lets you process syllabus files, tasks, and notes using either cloud Gemini APIs or 100% offline local AI models.

### Option A: Cloud Mode (Google Gemini Key) — *Fastest & Highest Quality*
Google AI Studio offers a free-tier API key (up to 15 requests per minute), which is extremely high quality and totally free.

1. **Get your API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/).
   - Sign in with any Google account.
   - Click the blue **Get API Key** button at the top left.
   - Click **Create API Key**, copy it.
2. **Save it in your environment**:
   Open the `.env` file at the root of the project with a text editor (like nano) and add the key to these three fields:
   ```env
   GEMINI_API_KEY="your_copied_api_key"
   GOOGLE_API_KEY="your_copied_api_key"
   ANTIGRAVITY_API_KEY="your_copied_api_key"
   ```
3. **Select in Web UI**: In the web dashboard settings, make sure the active provider toggle is set to **ANTIGRAVITY PRO**.

---

### Option B: Local Mode (100% Free & Offline via Ollama)
If you prefer running everything locally on your own CPU/GPU without cloud access:

1. **Install Ollama**:
   Open a new terminal window and run:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. **Download recommended efficient models**:
   - For text ingestion & task extraction (smart & lightweight, perfect for standard laptops):
     ```bash
     ollama pull llama3.2
     ```
   - For screenshots or PDF images (vision capabilities):
     ```bash
     ollama pull llama3.2-vision
     ```
3. **Verify Ollama is running**:
   ```bash
   ollama list
   ```
4. **Select in Web UI**: In the web dashboard settings, toggle the active provider to **OLLAMA (LOCAL)**.

---

### 🎙️ Local Audio Transcription (Offline Whisper)
When transcribing class recordings locally (without cloud keys):
- Simply select the **Local Whisper** option in the Class Notes page.
- On the very first run, the Python script will automatically download the quantized `base.en` Whisper model (~150MB) to your machine. 
- All future recordings will transcribe locally on your CPU offline.

---

## ⚡ Step 5: Launch the Application

Run the concurrently executing servers:

```bash
bash launch.sh
```

This starts:
1. **Frontend App**: [http://localhost:19211](http://localhost:19211)
2. **Express API Server**: [http://localhost:8080](http://localhost:8080)
3. **Lemma Background Backend**: [http://localhost:4000](http://localhost:4000)

Open [http://localhost:19211](http://localhost:19211) in your browser to start using NexusDesk!
To stop the servers, press `Ctrl+C` in your terminal.
