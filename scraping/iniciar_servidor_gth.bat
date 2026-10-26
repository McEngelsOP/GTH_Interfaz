@echo off
REM Servidor de GTH (envíos a Multitest, «Recalcular puntaje» y revisión de Bumeran cada 30 minutos): dejarlo abierto
REM mientras la laptop esté prendida. Si se cierra, la web muestra «Servidor apagado».
REM Bumeran se revisa con la ventana de Chrome (sin ventana lo bloquea). --ventana muestra tambien el Chrome de Multitest, o --sin-scraping para no revisar Bumeran.
cd /d "%~dp0\.."
:inicio
".venv\Scripts\python.exe" -m scraping.multitest_servidor %*
REM Si se cae por un error inesperado, se reinicia solo a los 30 segundos
timeout /t 30 /nobreak >nul
goto inicio
