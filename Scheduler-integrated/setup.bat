@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   NexusDesk -- Windows Local Installation Script
echo ===================================================
echo.

:: Step 1: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not detected on this system.
    echo [*] Attempting to install Node.js using Windows Package Manager (winget)...
    echo.
    winget install -e --id OpenJS.NodeJS
    if !errorlevel! neq 0 (
        echo [ERROR] Automatic Node.js installation failed.
        echo Please download and install Node.js manually from: https://nodejs.org/
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Node.js installed successfully! Please restart this script in a new terminal window to apply path changes.
    pause
    exit /b 0
) else (
    echo [ok] Node.js is already installed.
)

:: Step 2: Install pnpm globally if not present
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Installing pnpm globally...
    npm install -g pnpm
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install pnpm globally.
        pause
        exit /b 1
    )
) else (
    echo [ok] pnpm is already installed.
)

:: Step 3: Setup environment variables file (.env)
if not exist .env (
    echo [*] Creating .env file from .env.example...
    copy .env.example .env
) else (
    echo [ok] .env file already exists.
)

:: Step 4: Install workspace dependencies
echo [*] Installing project dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] pnpm install failed.
    pause
    exit /b 1
)

:: Step 5: Automatically provision isolated database and apply schema
echo [*] Provisioning personal database...
node prepare_db.cjs
if %errorlevel% neq 0 (
    echo [ERROR] Database provisioning failed.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo [SUCCESS] All dependencies installed successfully!
echo ===================================================
echo.
echo [*] Starting API Server and Frontend concurrently...
echo.

:: Run both dev servers in parallel in the same terminal using pnpm's --parallel flag
call pnpm --filter @workspace/api-server --filter @workspace/nexusdesk --parallel run dev

pause
