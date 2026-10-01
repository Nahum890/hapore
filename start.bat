@echo off
rem Inicia PyFis IA. Uso: start.bat [preview^|dev^|mock]  (por defecto: preview)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-demo.ps1" %*
