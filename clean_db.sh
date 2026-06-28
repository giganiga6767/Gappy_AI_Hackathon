#!/usr/bin/env bash
# clean_db.sh
# Automated utility to clean the database (SQLite or PostgreSQL)

WORKSPACE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$WORKSPACE_DIR/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs 2>/dev/null)
fi

DB_URL="${DATABASE_URL:-$NEXUSDESK_DB_URL}"

if [[ "$DB_URL" =~ ^postgres(ql)?:// ]]; then
  echo "🔌 PostgreSQL database detected. Cleaning remote tables..."
  if ! node -e "require('pg')" &>/dev/null; then
    echo "📦 Installing pg driver..."
    npx pnpm@9 add -w pg
  fi
  node lib/db/wipe_db.cjs
else
  echo "🗄️ Local SQLite database detected. Wiping sqlite.db..."
  rm -f "$WORKSPACE_DIR/sqlite.db"
  npx pnpm@9 --filter @workspace/db push-force
fi
