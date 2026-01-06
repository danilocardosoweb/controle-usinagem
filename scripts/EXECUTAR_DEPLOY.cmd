@echo off
title Deploy Sistema Usinagem para GitHub

echo ========================================
echo EXECUTANDO DEPLOY PARA GITHUB
echo ========================================
echo.

echo Executando script PowerShell...
echo.

PowerShell -ExecutionPolicy Bypass -File "Deploy-GitHub.ps1"

echo.
echo ========================================
echo Script executado!
echo ========================================

pause
