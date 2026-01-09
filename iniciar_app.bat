@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Iniciando Aplicação de Usinagem
echo ========================================
echo.

cd /d "%~dp0"

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
if not exist "venv" (
    echo Criando ambiente virtual do backend...
    python -m venv venv
)

echo Instalando pacotes do backend...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo Erro ao instalar dependências do backend!
    pause
    exit /b 1
)

REM Instalar dependências do frontend se necessário
echo [2/4] Verificando dependências do frontend...
cd ..\frontend
if not exist "node_modules" (
    echo Instalando dependências do frontend...
    call npm install
    if errorlevel 1 (
        echo Erro ao instalar dependências do frontend!
        pause
        exit /b 1
    )
)

REM Iniciar o backend em uma nova janela
echo [3/4] Iniciando servidor backend...
cd ..\backend
start "Backend - Controle de Usinagem" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

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
