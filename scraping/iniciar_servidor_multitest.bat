@echo off
REM Servidor de envíos a Multitest: dejarlo abierto mientras la laptop esté prendida.
REM Si se cierra, la web muestra «Servidor apagado». Agrega --ventana para ver Chrome mientras trabaja.
cd /d "%~dp0\.."
:inicio
".venv\Scripts\python.exe" -m scraping.multitest_servidor %*
REM Si se cae por un error inesperado, se reinicia solo a los 30 segundos
timeout /t 30 /nobreak >nul
goto inicio
