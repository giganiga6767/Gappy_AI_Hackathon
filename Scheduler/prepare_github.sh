#!/bin/bash
# Exit on error
set -e

echo "🧹 Cleaning up project folder..."
rm -f test_write.txt

echo "🗄️ Wiping database tables for clean initialization..."
if [ -f .env ]; then
  # Load env variables for wipe script
  export $(grep -v '^#' .env | xargs)
fi
node lib/db/wipe_db.cjs

echo "🏁 Initializing Git repository..."
if [ ! -d .git ]; then
  git init
fi

# Setup main branch
git checkout -b main || git branch -M main

echo "➕ Adding files to Git staging area..."
git add .

echo "💾 Creating initial commit..."
git commit -m "feat: Vibe-coded personal ECE command center (storage only)" || echo "Nothing new to commit."

echo "🔗 Linking remote GitHub repository..."
if git remote | grep -q 'origin'; then
  git remote set-url origin https://github.com/giganiga6767/NexusDesk.git
else
  git remote add origin https://github.com/giganiga6767/NexusDesk.git
fi

echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ All done! Database wiped clean, codebase initialized, and pushed to GitHub!"
