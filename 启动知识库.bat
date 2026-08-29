@echo off
cd /d "%~dp0"
rem Quick launcher for the knowledge base (V2)
rem If port 8765 is not listening yet, start the server first.
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "" http://localhost:8765/
  echo Knowledge base: http://localhost:8765/
  echo Close this window to stop the server.
  python -m http.server 8765
) else (
  start "" http://localhost:8765/
  echo Server already running, opening browser...
  timeout /t 2 >nul
)
