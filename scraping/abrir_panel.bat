@echo off
REM Abre el panel temporal del scraper
cd /d "%~dp0\.."
python -m scraping.panel
if errorlevel 1 pause
