# 🛡️ BidIQ Database Backup Setup Guide

**Purpose:** Automated daily backups to prevent data loss (like Feb 7, 2026 incident)

---

## 📋 Prerequisites

### 1. Get Database Password from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **szifhqmrddmdkgschkkw**
3. Go to **Project Settings** (gear icon) → **Database**
4. Scroll to **Connection String** section
5. Click **Show** next to the connection string
6. Copy the password (after `password=` and before `@`)

### 2. Add Password to .env File

Open `bidiq-mvp/.env` and add:

```bash
DB_PASSWORD=your_actual_password_here
```

**IMPORTANT:** This password is sensitive. Never commit it to git.

---

## 🚀 Setup Instructions

### Option A: Windows (PowerShell) - Recommended

#### 1. Install PostgreSQL Client Tools

**Option 1 - Chocolatey (Easiest):**
```powershell
# Open PowerShell as Administrator
choco install postgresql
```

**Option 2 - Manual Download:**
- Download from: https://www.postgresql.org/download/windows/
- Install PostgreSQL (just the client tools, not the server)
- Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

#### 2. Test the Backup Script

```powershell
cd C:\Users\RyanElder\bidiq-mvp
.\scripts\backup-database.ps1
```

**Expected output:**
```
🔄 Starting BidIQ database backup...
📊 Database: db.szifhqmrddmdkgschkkw.supabase.co
💾 Backup file: bidiq_backup_20260214_143022.sql
✅ Backup completed successfully!
   File: .\backups\database\bidiq_backup_20260214_143022.sql
   Size: 2.5 MB
🗜️  Compressing backup...
✅ Compressed to bidiq_backup_20260214_143022.sql.zip
📦 1 backup(s) remaining
✅ Backup process complete!
```

#### 3. Schedule Daily Backups

**Option 1 - Task Scheduler (Recommended):**

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. **Name:** BidIQ Daily Backup
4. **Trigger:** Daily at 2:00 AM
5. **Action:** Start a program
6. **Program:** `powershell.exe`
7. **Arguments:** `-ExecutionPolicy Bypass -File "C:\Users\RyanElder\bidiq-mvp\scripts\backup-database.ps1"`
8. **Start in:** `C:\Users\RyanElder\bidiq-mvp`
9. Click **Finish**

**Option 2 - Quick PowerShell Command:**

Run this once (creates the scheduled task):

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Users\RyanElder\bidiq-mvp\scripts\backup-database.ps1" -WorkingDirectory "C:\Users\RyanElder\bidiq-mvp"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest
Register-ScheduledTask -TaskName "BidIQ Daily Backup" -Action $action -Trigger $trigger -Principal $principal -Description "Automated daily backup of BidIQ database"
```

---

### Option B: Git Bash / WSL (Linux/Mac Style)

#### 1. Install PostgreSQL Client

**Git Bash:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Install and add to PATH
```

**WSL (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql-client
```

#### 2. Make Script Executable

```bash
cd /c/Users/RyanElder/bidiq-mvp
chmod +x scripts/backup-database.sh
```

#### 3. Test the Backup Script

```bash
./scripts/backup-database.sh
```

#### 4. Schedule with Cron (WSL only)

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /c/Users/RyanElder/bidiq-mvp && ./scripts/backup-database.sh >> ./logs/backup.log 2>&1
```

---

## 📦 Backup Storage

### Local Storage

**Location:** `bidiq-mvp/backups/database/`

**Retention:** Last 7 days (older backups auto-deleted)

**File format:** `bidiq_backup_YYYYMMDD_HHMMSS.sql.gz` or `.zip`

### Cloud Storage (Optional but Recommended)

#### Google Drive Sync

1. Install **Google Drive Desktop** (formerly Backup & Sync)
2. Add `C:\Users\RyanElder\bidiq-mvp\backups` to Google Drive sync
3. Backups automatically sync to cloud

#### Dropbox / OneDrive

Same process - add `backups` folder to sync

#### Manual Cloud Upload (rclone)

For advanced users, uncomment the rclone line in bash script:

```bash
# Install rclone
choco install rclone

# Configure Google Drive
rclone config

# Uncomment line in backup-database.sh:
rclone copy "${BACKUP_DIR}/${BACKUP_FILE}.gz" "googledrive:BidIQ-Backups/"
```

---

## 🔄 Restore from Backup

### When to Restore

- Accidental data deletion
- Database corruption
- Need to rollback changes

### How to Restore

#### PowerShell (Windows):

```powershell
# 1. Decompress backup
Expand-Archive .\backups\database\bidiq_backup_20260214_143022.sql.zip -DestinationPath .\backups\temp

# 2. Restore to Supabase
$env:PGPASSWORD = "your_db_password"
pg_restore -h db.szifhqmrddmdkgschkkw.supabase.co -U postgres -d postgres -c .\backups\temp\bidiq_backup_20260214_143022.sql
```

#### Bash (Git Bash / WSL):

```bash
# 1. Decompress backup
gunzip -k ./backups/database/bidiq_backup_20260214_143022.sql.gz

# 2. Restore to Supabase
PGPASSWORD="your_db_password" pg_restore -h db.szifhqmrddmdkgschkkw.supabase.co -U postgres -d postgres -c ./backups/database/bidiq_backup_20260214_143022.sql
```

### ⚠️ IMPORTANT: Restore Warnings

- **Restoration will DELETE current data and replace with backup**
- Always backup current state first before restoring
- Test restore on a development database first if possible

---

## ✅ Verification

### Check if Backups are Running

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Find "BidIQ Daily Backup"
3. Check "Last Run Result" (should be 0x0 = success)

**Check Backup Files:**
```powershell
# Should show recent backups
dir .\backups\database\bidiq_backup_*.zip
```

### Test Backup Integrity

```powershell
# List contents of backup (doesn't restore, just checks)
$env:PGPASSWORD = "your_db_password"
pg_restore -l .\backups\database\latest.sql
```

---

## 🆘 Troubleshooting

### "pg_dump not found"

**Solution:** Install PostgreSQL client tools (see Prerequisites above)

### "DB_PASSWORD not set in .env"

**Solution:** Add `DB_PASSWORD=your_password` to `.env` file

### "Connection refused"

**Solution:** Check Supabase project is active. Verify URL in `.env`

### Backup file is 0 bytes

**Solution:** Wrong password or connection error. Check credentials.

### Script won't run (PowerShell)

**Solution:** Run PowerShell as Administrator, then:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Monitoring

### Add to Your Morning Routine

Check backups weekly:
```powershell
# Show last 5 backups with size
Get-ChildItem .\backups\database\bidiq_backup_*.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

### Email Notifications (Advanced)

Modify script to send email on failure:

```powershell
# Add this at the end of backup-database.ps1 (requires SMTP setup)
if ($LASTEXITCODE -ne 0) {
    Send-MailMessage -To "your@email.com" -From "backup@bidiq.com" -Subject "BidIQ Backup Failed" -Body "Check logs" -SmtpServer "smtp.gmail.com"
}
```

---

## 🎯 Next Steps

After setup:

1. ✅ Test backup script manually (run once)
2. ✅ Schedule daily backups
3. ✅ Wait 24 hours, verify backup created
4. ✅ Test restore process on a copy of database
5. ✅ Set up cloud storage sync (Google Drive/Dropbox)

**You're now protected from data loss! 🛡️**

---

## 📝 Notes

- Backups compressed to save space (~50% size reduction)
- 7-day retention = ~7 backup files (~20 MB total)
- First backup might take longer (full database)
- Incremental backups not available (Supabase limitation)
- For PITR (Point-in-Time Recovery), upgrade to Supabase Pro ($25/mo)

---

**Questions?** Add to MEMORY.md or ask Claude during next session.
