@echo off
title NutriFrutas Pro
cd /d "%~dp0"
echo ======================================================
echo   Iniciando NutriFrutas Pro...
echo ======================================================
echo.
start http://localhost:8000
node server.js
pause
