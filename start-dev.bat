@echo off
title Siscop Launcher
echo Starting Siscop environment...
powershell -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
pause
