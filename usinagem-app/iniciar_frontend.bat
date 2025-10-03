@echo off
echo Iniciando servidor frontend para a aplicacao de Usinagem
echo.

cd frontend
echo === Instalando dependencias do frontend ===
call npm install

echo.
echo === Iniciando o servidor frontend ===
call npm run dev

pause
