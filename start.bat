@echo off
title Shiny Hunt Counter
cd /d "%~dp0"

REM Open the control page in your default browser after a short delay.
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:3620/control"

echo Starting Shiny Hunt Counter...
echo Keep this window OPEN while you stream. Close it (or Ctrl+C) to stop.
echo.
node server.js

echo.
echo Server stopped. Press any key to close.
pause >nul
