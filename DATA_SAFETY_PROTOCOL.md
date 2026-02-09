# 🛡️ DATA SAFETY PROTOCOL

**Created:** February 7, 2026 after data loss incident

---

## ⚠️ WHAT HAPPENED

**Feb 7, 2026 - Data Loss Incident:**
- All projects (bids) deleted from database (0 rows)
- Most GCs deleted (only 2/many remained)
- User settings preserved (1 row)
- Cause: Unknown - possibly migration, code change, or manual action

**Impact:** Lost all historical bid data for ryan@fsikc.com

---

## 🚨 RULES - NEVER BREAK THESE

### 1. DAILY DATABASE BACKUP (Mandatory)

**Every day before making ANY changes:**

```bash
cd bidiq-mvp
node backup-database.js
```

This creates timestamped backup in `backups/YYYY-MM-DD/`

---

### 2. GIT COMMIT BEFORE EVERY CHANGE

**Before ANY code change:**

```bash
git add -A
git commit -m "Before [what you're changing]"
```

**Never make changes without a commit.**

---

### 3. SUPABASE AUTO-BACKUPS (Required)

**Enable Point-in-Time Recovery:**
1. Go to Supabase Dashboard → Settings → Database
2. Enable "Point-in-Time Recovery" (PITR)
3. Costs ~$0.12/GB/month but ESSENTIAL
4. Allows restore to any point in last 7 days

**Alternative (Free tier):**
- Weekly manual exports via Supabase Table Editor
- Save as CSV files in `backups/manual/`

---

### 4. NEVER DELETE IN PRODUCTION

**NEVER run these commands in production:**

```sql
❌ DELETE FROM projects;
❌ TRUNCATE TABLE general_contractors;
❌ DROP TABLE anything;
```

**Always use soft deletes:**

```sql
✅ UPDATE projects SET deleted_at = NOW() WHERE id = 'xxx';
```

---

### 5. SEPARATE ENVIRONMENTS

**Create 3 Supabase projects:**

1. **Development** (testing)
   - URL: dev-bidiq.supabase.co
   - Use for ALL testing
   - Safe to break

2. **Staging** (pre-production)
   - URL: staging-bidiq.supabase.co
   - Test before deploying to prod
   - Copy of production data

3. **Production** (real users)
   - URL: szifhqmrddmdkgschkkw.supabase.co
   - NEVER touch directly
   - NEVER test here
   - ONLY deploy tested code

---

### 6. MIGRATION SAFETY

**Before running ANY migration:**

```bash
# 1. Backup first
node backup-database.js

# 2. Test on development database
# (change .env to point to dev)
supabase migration up

# 3. Verify in dev dashboard

# 4. THEN run on production
# (change .env back to prod)
supabase migration up
```

**NEVER run untested migrations on production.**

---

## 📋 DAILY CHECKLIST

**Before starting work each day:**

- [ ] Run database backup script
- [ ] Git commit current state
- [ ] Verify backups exist in `backups/` folder
- [ ] Check Supabase has recent backup timestamp

**After making changes:**

- [ ] Git commit with clear message
- [ ] Test on dev environment first
- [ ] Verify data still loads correctly
- [ ] Check Supabase row counts unchanged (unless intentional)

---

## 🆘 RECOVERY PROCEDURES

### If Data Is Missing:

**Step 1: DON'T PANIC - Check First**
```javascript
// In browser console:
const { data, count } = await supabaseClient
  .from('projects')
  .select('*', { count: 'exact' });
console.log('Total projects:', count);
```

If count = 0 but should have data → proceed to recovery.

---

### Recovery Option 1: Supabase PITR

1. Go to Supabase Dashboard → Settings → Database
2. Click "Point-in-Time Recovery"
3. Select timestamp BEFORE data loss
4. Click "Restore"
5. Wait for restore to complete

---

### Recovery Option 2: Daily Backup

```bash
cd bidiq-mvp
node restore-from-backup.js
# Select date to restore from
```

---

### Recovery Option 3: Git History

```bash
# Find SQL files in git history
git log --all --full-history -- "*.sql"

# Restore specific file version
git show COMMIT_HASH:backup.sql > recovered-data.sql

# Run in Supabase SQL Editor
```

---

### Recovery Option 4: Test Data (Last Resort)

```bash
# If no backups exist, restore test data
# Run restore-test-data.sql in Supabase
```

**This is TEST DATA, not real data.**

---

## 🔧 BACKUP SCRIPTS TO CREATE

### 1. Automated Daily Backup

Create `backup-database.js`:

```javascript
// TODO: Create this script
// Should export all tables to JSON
// Save to backups/YYYY-MM-DD/
// Keep last 30 days
```

### 2. Restore Script

Create `restore-from-backup.js`:

```javascript
// TODO: Create this script
// List available backup dates
// Let user select date
// Restore data from JSON files
```

---

## 📊 MONITORING

### Daily Health Check

**Run this in Supabase SQL Editor daily:**

```sql
-- Row count health check
SELECT
  'projects' as table_name,
  COUNT(*) as rows,
  MAX(created_at) as last_entry
FROM projects
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3'

UNION ALL

SELECT
  'general_contractors',
  COUNT(*),
  MAX(created_at)
FROM general_contractors
WHERE user_id = 'd1989508-1d5e-4494-b3f8-d2899665d8b3';
```

**Expected counts (for ryan@fsikc.com):**
- Projects: Should increase over time (>0)
- GCs: Should be 5-20 (relatively stable)

**If counts drop unexpectedly → INVESTIGATE IMMEDIATELY**

---

## 🎯 IMPLEMENTATION PRIORITY

**This week:**
- [ ] Enable Supabase PITR (if on paid plan)
- [ ] Create backup-database.js script
- [ ] Create restore-from-backup.js script
- [ ] Set up cron job for daily backups
- [ ] Create dev/staging Supabase projects

**Next week:**
- [ ] Weekly manual backups (if free tier)
- [ ] Document recovery procedures
- [ ] Test restore process
- [ ] Create monitoring dashboard

---

## 📝 DATA LOSS LOG

| Date | Data Lost | Cause | Recovered? | Method |
|------|-----------|-------|------------|--------|
| 2026-02-07 | All projects, most GCs | Unknown | ⚠️ Partial | restore-test-data.sql |

---

## ✅ COMMITMENT

**I commit to:**
1. ✅ Never make changes without git commit
2. ✅ Daily database backups
3. ✅ Test on dev environment first
4. ✅ Enable Supabase PITR
5. ✅ Never delete data in production
6. ✅ Use soft deletes only

**Signature:** _________________
**Date:** February 7, 2026

---

**DATA IS IRREPLACEABLE. TREAT IT WITH EXTREME CARE.**
