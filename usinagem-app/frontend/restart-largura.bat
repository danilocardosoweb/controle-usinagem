@echo off
cd /d "%~dp0"
echo Validando arquivo...
node -e "try { require('@babel/parser').parse(require('fs').readFileSync('src/components/PaleteVisualizacao3D.jsx','utf8'), {sourceType:'module',plugins:['jsx']}); console.log('OK: Arquivo validado') } catch(e) { console.log('ERRO:', e.message); process.exit(1) }"
if errorlevel 1 pause & exit /b 1
echo.
echo Limpando cache Vite...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo.
echo Iniciando servidor...
npm run dev
