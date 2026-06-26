#!/bin/bash

# Navigate to the workspace root
CDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$CDIR"

# Load nvm if available (portable — works on any machine)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found! Please run setup.sh first."
  exit 1
fi

echo "Starting NexusDesk Academic Command Center..."

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "Stopping NexusDesk servers..."
  kill $API_PID $FE_PID $BACKEND_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start API Server (runs on port 8080)
echo "Starting Express API Server on port 8080..."
PORT=8080 npx pnpm@9 --filter @workspace/api-server run dev &
API_PID=$!

# 2. Start Frontend React App (runs on port 19211)
echo "Starting Vite Frontend on port 19211..."
PORT=19211 BASE_PATH="/" npx pnpm@9 --filter @workspace/nexusdesk run dev &
FE_PID=$!

# 3. Start Lemma Agentic Backend (runs on port 4000)
echo "Starting Lemma Agentic Backend on port 4000..."
PORT=4000 npx pnpm@9 --filter work-study-backend run dev &
BACKEND_PID=$!

# Wait for all processes to complete
wait $API_PID $FE_PID $BACKEND_PID
