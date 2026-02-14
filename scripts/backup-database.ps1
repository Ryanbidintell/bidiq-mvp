# BidIQ Database Backup Script (PowerShell)
# Backs up Supabase PostgreSQL database to local storage

param(
    [string]$BackupDir = ".\backups\database"
)

# Configuration
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "bidiq_backup_$Timestamp.sql"
$KeepDays = 7

Write-Host "🔄 Starting BidIQ database backup..." -ForegroundColor Green

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Load environment variables from .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    exit 1
}

# Extract project reference from Supabase URL
$SupabaseUrl = [System.Environment]::GetEnvironmentVariable("SUPABASE_URL", "Process")
$ProjectRef = $SupabaseUrl -replace "https://", "" -replace ".supabase.co", ""

# Get database password
$DbPassword = [System.Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")

if (-not $DbPassword) {
    Write-Host "⚠️  DB_PASSWORD not set in .env" -ForegroundColor Yellow
    Write-Host "   Get it from: Supabase Dashboard → Project Settings → Database → Connection String" -ForegroundColor Yellow
    Write-Host "   Add to .env: DB_PASSWORD=your_password_here" -ForegroundColor Yellow
    exit 1
}

# Connection details
$DbHost = "db.$ProjectRef.supabase.co"
$DbPort = "5432"
$DbName = "postgres"
$DbUser = "postgres"

Write-Host "📊 Database: $DbHost" -ForegroundColor Green
Write-Host "💾 Backup file: $BackupFile" -ForegroundColor Green

# Check if pg_dump is available
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pg_dump not found. Please install PostgreSQL client tools:" -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "   Or install via Chocolatey: choco install postgresql" -ForegroundColor Yellow
    exit 1
}

# Set password environment variable for pg_dump
$env:PGPASSWORD = $DbPassword

# Run backup
$BackupPath = Join-Path $BackupDir $BackupFile

try {
    pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f $BackupPath 2>&1 | Where-Object { $_ -notmatch "NOTICE" }

    if (Test-Path $BackupPath) {
        $Size = (Get-Item $BackupPath).Length / 1MB
        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "   File: $BackupPath" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($Size, 2)) MB" -ForegroundColor Green

        # Compress backup
        Write-Host "🗜️  Compressing backup..." -ForegroundColor Green
        Compress-Archive -Path $BackupPath -DestinationPath "$BackupPath.zip" -Force
        Remove-Item $BackupPath
        Write-Host "✅ Compressed to $BackupFile.zip" -ForegroundColor Green
    } else {
        Write-Host "❌ Backup failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during backup: $_" -ForegroundColor Red
    exit 1
}

# Clean up old backups
Write-Host "🧹 Cleaning up old backups (keeping last $KeepDays days)..." -ForegroundColor Green
$CutoffDate = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $BackupDir -Filter "bidiq_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force

$Remaining = (Get-ChildItem -Path $BackupDir -Filter "bidiq_backup_*.zip").Count
Write-Host "📦 $Remaining backup(s) remaining" -ForegroundColor Green

Write-Host "✅ Backup process complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 To restore from backup:" -ForegroundColor Yellow
Write-Host "   1. Decompress: Expand-Archive $BackupPath.zip" -ForegroundColor Yellow
Write-Host "   2. Restore: pg_restore -h HOST -U postgres -d postgres -c $BackupPath" -ForegroundColor Yellow
