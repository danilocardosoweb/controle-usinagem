@echo off
cd /d "%~dp0"
echo Validando arquivos...
node -e "try { require('@babel/parser').parse(require('fs').readFileSync('src/components/ModalPalete3D.jsx','utf8'), {sourceType:'module',plugins:['jsx']}); console.log('OK: ModalPalete3D.jsx') } catch(e) { console.log('ERRO ModalPalete3D:', e.message); process.exit(1) }"
if errorlevel 1 pause & exit /b 1
node -e "try { require('@babel/parser').parse(require('fs').readFileSync('src/components/PaleteVisualizacao3D.jsx','utf8'), {sourceType:'module',plugins:['jsx']}); console.log('OK: PaleteVisualizacao3D.jsx') } catch(e) { console.log('ERRO PaleteVisualizacao3D:', e.message); process.exit(1) }"
if errorlevel 1 pause & exit /b 1
echo.
echo Limpando cache Vite...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo.
echo Iniciando servidor...
npm run dev
