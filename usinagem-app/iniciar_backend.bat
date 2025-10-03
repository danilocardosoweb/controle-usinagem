@echo off
echo Iniciando servidor backend para a aplicacao de Usinagem
echo.

cd backend
echo === Instalando dependencias do backend ===
python -m pip install -r requirements.txt

echo.
echo === Iniciando o servidor backend ===
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

pause
