@echo off
echo.
echo ========================================
echo   Starting Netlify Dev Server
echo ========================================
echo.
echo This will start the app with backend functions working!
echo.
echo App will be available at: http://localhost:8888
echo.
echo Press Ctrl+C to stop
echo.
cd /d "%~dp0"
netlify dev
