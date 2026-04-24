@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Iniciando Aplicação de Usinagem
echo ========================================
echo.

cd /d "%~dp0"

set "ROOT=%cd%"

REM Verificar se está no diretório correto
if not exist "usinagem-app" (
    echo Erro: Pasta 'usinagem-app' não encontrada!
    echo Este script deve ser executado no diretório raiz do projeto.
    pause
    exit /b 1
)

REM Instalar dependências do backend se necessário
echo [1/4] Verificando dependências do backend...
cd usinagem-app\backend

REM Procurar Python em locais comuns
set "PYTHON_CMD="
for %%P in (python python3 py) do (
    %%P --version >nul 2>&1
    if errorlevel 0 (
        set "PYTHON_CMD=%%P"
        goto :python_found
    )
)

REM Se não encontrou, procurar em caminhos específicos
if "!PYTHON_CMD!"=="" (
    if exist "C:\Python311\python.exe" (
        set "PYTHON_CMD=C:\Python311\python.exe"
    ) else if exist "C:\Python310\python.exe" (
        set "PYTHON_CMD=C:\Python310\python.exe"
    ) else if exist "C:\Python39\python.exe" (
        set "PYTHON_CMD=C:\Python39\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    )
)

:python_found
if "!PYTHON_CMD!"=="" (
    echo.
    echo ❌ ERRO: Python não foi encontrado!
    echo.
    echo Soluções:
    echo 1. Reinstale Python de: https://www.python.org/downloads/
    echo 2. Marque "Add Python to PATH" durante a instalação
    echo 3. Reinicie o computador após instalar
    echo 4. Tente executar este script novamente
    echo.
    pause
    exit /b 1
)

echo Python encontrado: !PYTHON_CMD!

if not exist "venv" (
    echo Criando ambiente virtual do backend...
    "!PYTHON_CMD!" -m venv venv
    if errorlevel 1 (
        echo Erro ao criar ambiente virtual!
        pause
        exit /b 1
    )
)

echo Instalando pacotes do backend...
call venv\Scripts\python -m pip install -q --upgrade pip
call venv\Scripts\python -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo Erro ao instalar dependências do backend!
    pause
    exit /b 1
)

REM Instalar dependências do frontend se necessário
echo [2/4] Verificando dependências do frontend...
cd ..\frontend
echo Instalando/atualizando dependências do frontend...
call npm install
if errorlevel 1 (
    echo Erro ao instalar dependências do frontend!
    pause
    exit /b 1
)

REM Iniciar o backend em uma nova janela
echo [3/4] Iniciando servidor backend...
cd ..\backend
start "Backend - Controle de Usinagem" cmd /k "cd /d \"%ROOT%\usinagem-app\backend\" && call venv\Scripts\activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Aguardar um pouco para o backend iniciar
timeout /t 3 /nobreak

REM Iniciar o frontend em uma nova janela
echo [4/4] Iniciando servidor frontend...
cd ..\frontend
start "Frontend - Controle de Usinagem" cmd /k "npm run dev"

REM Aguardar um pouco para o frontend iniciar
timeout /t 3 /nobreak

echo.
echo ========================================
echo   Aplicação iniciada com sucesso!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servidores continuarão rodando nas outras janelas)
pause

endlocal
