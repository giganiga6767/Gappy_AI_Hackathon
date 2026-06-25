#!/bin/bash

# Navigate to the workspace root
CDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$CDIR"

# Add Node.js 20 to the path so Vite and pnpm run with a compatible version
export PATH="/home/niranjan/.nvm/versions/node/v20.20.2/bin:$PATH"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found! Please create it."
  exit 1
fi

echo "Starting NexusDesk Academic Command Center..."

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "Stopping NexusDesk servers..."
  kill $API_PID $FE_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# Start API Server (runs on port 8080)
echo "Starting Express API Server on port 8080..."
PORT=8080 npx pnpm@9 --filter @workspace/api-server run dev &
API_PID=$!

# Start Frontend React App (runs on port 19211)
echo "Starting Vite Frontend on port 19211..."
PORT=19211 BASE_PATH="/" npx pnpm@9 --filter @workspace/nexusdesk run dev &
FE_PID=$!

# Wait for both processes to complete
wait $API_PID $FE_PID
