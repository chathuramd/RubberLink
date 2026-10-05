@echo off
title RubberLink Stopper
echo Stopping all RubberLink services...
taskkill /f /im mysqld.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul
echo All services stopped cleanly.
timeout /t 2 > nul
