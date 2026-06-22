@echo off

echo --------------------------------------------------
echo Running Backend...
echo --------------------------------------------------
start "Backend Server" cmd /k "call .\venv\Scripts\activate && cd Backend && uvicorn main:app --host 0.0.0.0 --port 8080 --reload"

echo --------------------------------------------------
echo Running Frontend...
echo --------------------------------------------------
start "Frontend Server" cmd /k "call .\venv\Scripts\activate && cd Frontend && npm run dev"

echo --------------------------------------------------
echo Successfully started both servers
echo --------------------------------------------------
pause