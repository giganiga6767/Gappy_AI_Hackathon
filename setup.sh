#!/usr/bin/env bash
# setup.sh
# Zero-friction automated installation and database provisioner for NexusDesk.

echo "================================================="
echo "   NEXUSDESK: AI ACADEMIC OS AUTO-INSTALLER      "
echo "================================================="

WORKSPACE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$WORKSPACE_DIR/.env"

# Load nvm if available (portable — works on any machine)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

# 1. System prerequisites check
echo "🔍 Checking system environment..."
if ! command -v node &>/dev/null; then
  echo "❌ Error: Node.js is not installed. Please install Node.js (v20+)."
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "⚠️  Warning: Node.js version is less than 20. Vite may require newer node."
fi

if ! command -v python3 &>/dev/null; then
  echo "❌ Error: Python3 is not installed. Please install Python3."
  exit 1
fi

if ! command -v ffmpeg &>/dev/null; then
  echo "⚠️  Warning: FFmpeg is not installed. Audio compression and local Whisper might fail."
  echo "   Install it via: sudo apt install ffmpeg"
fi

# 2. Configure .env file
echo -e "\n🔑 Configuring API Keys and local database..."
if [ -f "$ENV_FILE" ]; then
  echo "ℹ️  Found existing .env configuration."
else
  echo "No .env configuration found. Let's set it up."
  read -p "Enter your Google Gemini API Key (Press Enter to run offline/local LLM): " USER_KEY

  echo "DATABASE_URL=\"file:$WORKSPACE_DIR/sqlite.db\"" > "$ENV_FILE"
  echo "PORT=8080" >> "$ENV_FILE"
  echo "PORT_FRONTEND=19211" >> "$ENV_FILE"
  if [ -n "$USER_KEY" ]; then
    echo "GEMINI_API_KEY=\"$USER_KEY\"" >> "$ENV_FILE"
    echo "GOOGLE_API_KEY=\"$USER_KEY\"" >> "$ENV_FILE"
    echo "ANTIGRAVITY_API_KEY=\"$USER_KEY\"" >> "$ENV_FILE"
  else
    echo "GEMINI_API_KEY=\"\"" >> "$ENV_FILE"
  fi
  echo "✅ Configured .env with local database path."
fi

# Load env variables for Drizzle schema push
export $(grep -v '^#' "$ENV_FILE" | xargs 2>/dev/null)

# 3. Install Monorepo Node dependencies
echo -e "\n📦 Installing Node workspace dependencies (pnpm)..."
npx pnpm@9 install
if [ $? -ne 0 ]; then
  echo "❌ Error: Node package installation failed."
  exit 1
fi

# 4. Install Python dependencies
echo -e "\n🐍 Installing Python dependencies..."
if [ -f "$WORKSPACE_DIR/requirements.txt" ]; then
  python3 -m pip install -r requirements.txt --break-system-packages
  if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Python package installation returned an error. Local models might fail."
  fi
else
  echo "ℹ️  No requirements.txt found — skipping Python dependencies."
fi

# 5. Push Database Schemas (no full typecheck — just push the schema)
echo -e "\n🗄️ Provisioning local SQLite database schema..."
npx pnpm@9 --filter @workspace/db push
if [ $? -ne 0 ]; then
  echo "❌ Error: Database schema push failed."
  exit 1
fi

echo -e "\n🎉 INSTALLATION COMPLETED SUCCESSFULLY!"
echo "-------------------------------------------------"
echo "To start the AI Academic Command Center, run:"
echo "   bash launch.sh"
echo ""
echo "Access the dashboard in your browser:"
echo "   http://localhost:19211"
echo "-------------------------------------------------"
