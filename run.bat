@echo off
title Viettel DMS Launcher
echo Starting Viettel Document Management System...

:: Start the backend in a new command window
echo [1/2] Starting Backend Server...
start "Viettel Backend" cmd /k "cd Backend && ..\venv\Scripts\activate && uvicorn main:app --reload --port 8080"

:: Start the frontend in a new command window
echo [2/2] Starting Frontend Server...
start "Viettel Frontend" cmd /k "cd Frontend && npm run dev"

echo.
echo Both servers are launching!
echo.
echo =====================================================================
echo IMPORTANT: To open the application in your browser, click into the
echo "Viettel Frontend" terminal window, type 'o' and press Enter.
echo =====================================================================
echo.
pause