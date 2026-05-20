@echo off
echo.
echo  Iniciando Fluxo...
echo.

start "Fluxo - Servidor" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 2 /nobreak > nul
start "Fluxo - Cliente" cmd /k "cd /d "%~dp0client" && npm run dev"

echo  Servidor: http://localhost:3001
echo  App:      http://localhost:5173
echo.
echo  Pressione qualquer tecla para fechar esta janela...
pause > nul
