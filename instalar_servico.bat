@echo off
REM Script para instalar Print Service como serviço Windows
REM Execute como Administrador

setlocal enabledelayedexpansion

REM Detectar caminho do Python
for /f "delims=" %%i in ('where python') do set PYTHON_PATH=%%i

if "%PYTHON_PATH%"=="" (
    echo ❌ Python não encontrado. Instale Python primeiro.
    pause
    exit /b 1
)

echo ✅ Python encontrado: %PYTHON_PATH%

REM Caminho do script
set SCRIPT_PATH=%~dp0print_service.py
set SERVICE_NAME=PrintServiceUsinagem

echo.
echo 📋 Instalando serviço Windows...
echo Serviço: %SERVICE_NAME%
echo Script: %SCRIPT_PATH%
echo.

REM Instalar serviço usando NSSM (NSSM precisa estar instalado)
REM Se não tiver NSSM, use o método alternativo abaixo

REM Método 1: Usando NSSM (recomendado)
if exist "C:\Program Files\nssm\nssm.exe" (
    echo Usando NSSM para instalar serviço...
    "C:\Program Files\nssm\nssm.exe" install %SERVICE_NAME% "%PYTHON_PATH%" "%SCRIPT_PATH%"
    "C:\Program Files\nssm\nssm.exe" start %SERVICE_NAME%
    echo ✅ Serviço instalado com sucesso!
    goto fim
)

REM Método 2: Usando pywin32 (alternativa)
echo Instalando dependência pywin32...
pip install pywin32
python -m pip install pywin32

echo.
echo 🔧 Criando wrapper para serviço Windows...

REM Criar arquivo wrapper para serviço
(
    echo import win32serviceutil
    echo import win32service
    echo import win32event
    echo import servicemanager
    echo import socket
    echo import sys
    echo import os
    echo.
    echo class PrintService(win32serviceutil.ServiceFramework):
    echo     _svc_name_ = "PrintServiceUsinagem"
    echo     _svc_display_name_ = "Print Service Usinagem"
    echo     _svc_description_ = "Serviço de impressão para TSC TE200"
    echo.
    echo     def __init__(self, args):
    echo         win32serviceutil.ServiceFramework.__init__(self, args)
    echo         self.isAlive = True
    echo.
    echo     def SvcStop(self):
    echo         self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
    echo         self.isAlive = False
    echo.
    echo     def SvcDoRun(self):
    echo         servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
    echo                                servicemanager.PYS_SERVICE_STARTED,
    echo                                (self._svc_name_, ''))
    echo         import print_service
    echo         print_service.iniciar_servidor()
    echo.
    echo if __name__ == '__main__':
    echo     win32serviceutil.HandleCommandLine(PrintService)
) > "%~dp0print_service_wrapper.py"

echo ✅ Wrapper criado: %~dp0print_service_wrapper.py
echo.
echo 📝 Para instalar o serviço, execute:
echo    python print_service_wrapper.py install
echo    python print_service_wrapper.py start
echo.
echo Para remover o serviço:
echo    python print_service_wrapper.py stop
echo    python print_service_wrapper.py remove
echo.

:fim
echo.
echo ✅ Instalação concluída!
echo.
echo 🚀 O serviço Print Service está rodando em http://localhost:9001
echo.
pause
