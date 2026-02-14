# Quick Backup Setup Script
# Automates backup setup for BidIQ

Write-Host "🛡️ BidIQ Backup Setup Wizard" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env file in bidiq-mvp directory" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if DB_PASSWORD is set
$DbPassword = Get-Content ".env" | Select-String "^DB_PASSWORD=" | ForEach-Object { $_.ToString().Split('=')[1] }

if (-not $DbPassword) {
    Write-Host "⚠️  DB_PASSWORD not found in .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Let's set it up now:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Select your project" -ForegroundColor White
    Write-Host "3. Project Settings → Database → Connection String" -ForegroundColor White
    Write-Host "4. Copy the password (after 'password=' in connection string)" -ForegroundColor White
    Write-Host ""
    $Password = Read-Host "Paste your database password here"

    if ($Password) {
        Add-Content -Path ".env" -Value "`nDB_PASSWORD=$Password"
        Write-Host "✅ Password added to .env" -ForegroundColor Green
    } else {
        Write-Host "❌ No password entered. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Step 3: Check for pg_dump
Write-Host ""
Write-Host "Checking for PostgreSQL client tools..." -ForegroundColor Cyan

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pg_dump not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Chocolatey (Easiest):" -ForegroundColor Cyan
    Write-Host "  choco install postgresql" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Manual Download:" -ForegroundColor Cyan
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host ""
    $Install = Read-Host "Open download page in browser? (Y/N)"
    if ($Install -eq "Y" -or $Install -eq "y") {
        Start-Process "https://www.postgresql.org/download/windows/"
    }
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ pg_dump found" -ForegroundColor Green
}

# Step 4: Test backup
Write-Host ""
Write-Host "Testing backup script..." -ForegroundColor Cyan
Write-Host ""

try {
    & ".\scripts\backup-database.ps1"
    Write-Host ""
    Write-Host "✅ Backup test successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup test failed: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Schedule daily backups
Write-Host ""
Write-Host "Would you like to schedule daily backups at 2:00 AM? (Y/N)" -ForegroundColor Cyan
$Schedule = Read-Host

if ($Schedule -eq "Y" -or $Schedule -eq "y") {
    try {
        $ScriptPath = Resolve-Path ".\scripts\backup-database.ps1"
        $WorkingDir = Resolve-Path "."

        $action = New-ScheduledTaskAction `
            -Execute "powershell.exe" `
            -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`"" `
            -WorkingDirectory $WorkingDir

        $trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

        $principal = New-ScheduledTaskPrincipal `
            -UserId "$env:USERNAME" `
            -RunLevel Highest

        Register-ScheduledTask `
            -TaskName "BidIQ Daily Backup" `
            -Action $action `
            -Trigger $trigger `
            -Principal $principal `
            -Description "Automated daily backup of BidIQ Supabase database" `
            -Force | Out-Null

        Write-Host "✅ Daily backup scheduled at 2:00 AM" -ForegroundColor Green
        Write-Host "   View in Task Scheduler: taskschd.msc" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Failed to schedule task: $_" -ForegroundColor Red
        Write-Host "   You may need to run PowerShell as Administrator" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipped scheduling. You can run backups manually:" -ForegroundColor Yellow
    Write-Host "   .\scripts\backup-database.ps1" -ForegroundColor White
}

# Step 6: Cloud storage recommendation
Write-Host ""
Write-Host "📦 Backup Storage Recommendation" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local backups: .\backups\database\" -ForegroundColor White
Write-Host "Retention: 7 days" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Sync backups to cloud for extra safety:" -ForegroundColor Yellow
Write-Host "   • Google Drive Desktop (auto-sync)" -ForegroundColor White
Write-Host "   • Dropbox" -ForegroundColor White
Write-Host "   • OneDrive" -ForegroundColor White
Write-Host ""
Write-Host "Add .\backups\ folder to your cloud storage sync" -ForegroundColor White

# Summary
Write-Host ""
Write-Host "🎉 Backup Setup Complete!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Database password configured" -ForegroundColor Green
Write-Host "✅ PostgreSQL client tools installed" -ForegroundColor Green
Write-Host "✅ Backup script tested" -ForegroundColor Green
if ($Schedule -eq "Y" -or $Schedule -eq "y") {
    Write-Host "✅ Daily backups scheduled" -ForegroundColor Green
}
Write-Host ""
Write-Host "📖 Full documentation: .\scripts\BACKUP_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Verify backups daily:" -ForegroundColor Yellow
Write-Host "   dir .\backups\database\bidiq_backup_*.zip" -ForegroundColor White
Write-Host ""
Write-Host "You're now protected from data loss! 🛡️" -ForegroundColor Green
