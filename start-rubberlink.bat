@echo off
title RubberLink Launcher
echo ========================================================
echo          Starting RubberLink System Services
echo ========================================================
echo.

echo [1/4] Starting MariaDB Database (Port 3306)...
start "MariaDB-Database" /min cmd /c ""C:\Users\Santhush Premaweera\.cache\mariadb\mariadb-10.11.8-winx64\bin\mysqld.exe" --datadir="C:\Users\Santhush Premaweera\.cache\mariadb\data" --port=3306 --console"

timeout /t 2 /nobreak > nul

echo [2/4] Starting AI ML Service (Port 8000)...
start "RubberLink-ML-Service" /min cmd /c "cd /d "C:\Final\rubber-supply-chain-system\ml-service" && "C:\Users\Santhush Premaweera\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn main:app --port 8000 --host 0.0.0.0"

timeout /t 2 /nobreak > nul

echo [3/4] Starting Backend Server (Port 5000)...
start "RubberLink-Backend" /min cmd /c "cd /d "C:\Final\rubber-supply-chain-system\backend" && node server.js"

timeout /t 2 /nobreak > nul

echo [4/4] Starting Frontend Web App (Port 3000)...
start "RubberLink-Frontend" /min cmd /c "cd /d "C:\Final\rubber-supply-chain-system\frontend" && npm run dev -- --host 0.0.0.0 --port 3000"

echo.
echo ========================================================
echo All 4 services started successfully!
echo Opening http://localhost:3000 in your browser...
echo ========================================================
timeout /t 3 /nobreak > nul
start http://localhost:3000
