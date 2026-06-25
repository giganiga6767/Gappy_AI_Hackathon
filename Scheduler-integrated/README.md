# NexusDesk Scheduler Integrated (Gappy AI) Setup Guide

This guide describes how to run and configure the application. If you are on Windows and Windows Smart App Control (SAC) blocks `setup.bat` from running, please follow the **Manual Setup Steps** below.

---

## Prerequisites
Before setting up the project, make sure you have the following installed on your system:
- **Node.js** (v18 or newer; v20+ recommended)
- **pnpm** (If not installed, run `npm install -g pnpm`)

---

## Manual Setup Steps (Recommended for Windows / SAC Blocks)

If Windows Smart App Control blocks the execution of `setup.bat`, you can run the exact commands manually in your terminal (Command Prompt, PowerShell, or Git Bash). Manual command execution bypasses script-execution security policies.

### 1. Copy the Environment Variables File
Create the `.env` configuration file from the template:

**In PowerShell:**
```powershell
Copy-Item .env.example .env
```

**In Command Prompt (cmd):**
```cmd
copy .env.example .env
```

**In Git Bash / WSL:**
```bash
cp .env.example .env
```

### 2. Install Project Dependencies
Run `pnpm install` in the root directory:
```bash
pnpm install
```

### 3. Provision the Database
Run the setup script to automatically provision a personal database on the cloud Neon cluster and push the Drizzle schema:
```bash
node prepare_db.cjs
```

### 4. Start the Development Servers
Run the API and Frontend concurrently:
```bash
pnpm --filter @workspace/api-server --filter @workspace/nexusdesk --parallel run dev
```

The servers will start on:
- **API Server:** `http://localhost:8080`
- **Vite Frontend:** `http://localhost:19211`

---

## Alternative Solutions for Smart App Control (SAC) Block

If your teammate still wants to use the shortcut script:

### 1. Unblock the Script
1. Open File Explorer and navigate to the project directory.
2. Right-click [setup.bat](file:///home/niranjan/Desktop/Gappy_AI_Hackathon/Scheduler-integrated/setup.bat) and choose **Properties**.
3. Under the **General** tab at the bottom, check the **Unblock** checkbox (if present) and click **Apply** / **OK**.

### 2. Use Git Bash
If Git Bash is installed, they can execute standard bash commands or run:
```bash
bash launch.sh
```
*(Ensure `.env` exists before running).*
