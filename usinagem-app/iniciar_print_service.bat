@echo off
REM Script para iniciar Print Service Local
REM Execute este arquivo para rodar o serviço de impressão

echo.
echo ========================================
echo   Print Service Local - Usinagem
echo ========================================
echo.

REM Detectar Python
for /f "delims=" %%i in ('where python') do set PYTHON_PATH=%%i

if "%PYTHON_PATH%"=="" (
    echo ❌ ERRO: Python não encontrado!
    echo.
    echo Instale Python de: https://www.python.org/downloads/
    echo Certifique-se de marcar "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo ✅ Python encontrado: %PYTHON_PATH%
echo.

REM Instalar dependências
echo 📦 Instalando dependências...
pip install pywin32 --quiet

echo.
echo 🚀 Iniciando Print Service na porta 9001...
echo.
echo 📍 Endpoints disponíveis:
echo    POST http://localhost:9001/print - Enviar TSPL para impressora
echo    GET http://localhost:9001/status - Verificar status
echo    GET http://localhost:9001/printers - Listar impressoras
echo.
echo ⏹️  Pressione Ctrl+C para parar o serviço
echo.
echo ========================================
echo.

REM Executar Print Service
python "%~dp0print_service.py"

pause
