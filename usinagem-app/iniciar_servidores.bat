@echo off
echo Iniciando servidores para teste da aplicacao de Usinagem
echo.

echo === Iniciando o Backend (FastAPI) ===
start cmd /k "cd backend && python -m pip install -r requirements.txt && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo Backend iniciado em http://localhost:8000
echo.

echo === Aguardando 5 segundos para o backend iniciar ===
timeout /t 5 /nobreak > nul

echo === Iniciando o Frontend (React + Vite) ===
start cmd /k "cd frontend && npm install && npm run dev"
echo Frontend iniciado (verifique a URL no terminal)
echo.

echo === Servidores iniciados com sucesso! ===
echo.
echo Acesse o frontend no navegador usando a URL fornecida no terminal do frontend
echo (geralmente http://localhost:5173)
echo.
echo Para encerrar os servidores, feche as janelas de terminal
echo.
pause
