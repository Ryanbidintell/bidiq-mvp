@echo off
echo ============================================
echo   BidIntell Database Migration Helper
echo ============================================
echo.
echo Opening migration file and SQL Editor...
echo.

REM Open the SQL file in VS Code or Notepad
if exist "C:\Users\RyanElder\AppData\Local\Programs\Microsoft VS Code\Code.exe" (
    start "" "C:\Users\RyanElder\AppData\Local\Programs\Microsoft VS Code\Code.exe" "%~dp0consolidated-migration.sql"
    echo [OK] Opened migration file in VS Code
) else (
    start notepad "%~dp0consolidated-migration.sql"
    echo [OK] Opened migration file in Notepad
)

REM Open Supabase SQL Editor
start https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor
echo [OK] Opened Supabase SQL Editor in browser
echo.

echo ============================================
echo   QUICK STEPS:
echo ============================================
echo.
echo 1. In the text editor: Select All (Ctrl+A)
echo 2. Copy (Ctrl+C)
echo 3. In SQL Editor: Paste (Ctrl+V)
echo 4. Click "Run" button
echo.
echo The migration will execute all 11 migrations!
echo.
pause
