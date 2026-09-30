@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-release.ps1"
set "WEBBIT_BUILD_RESULT=%errorlevel%"
if not "%WEBBIT_BUILD_RESULT%"=="0" (
  echo Build failed. Read the error above, resolve it, and run build.bat again.
  if not defined WEBBIT_NO_PAUSE pause
)
exit /b %WEBBIT_BUILD_RESULT%
