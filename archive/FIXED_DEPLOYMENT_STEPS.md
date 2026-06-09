# 🚀 FIXED: BidIntell v1.6 Deployment Steps

**Issue:** Table name mismatch fixed - migrations now use correct table name

---

## ⚡ QUICK DEPLOYMENT (15 minutes)

### Step 1: Go to Supabase SQL Editor

1. Open https://app.supabase.com
2. Select your BidIntell project
3. Click **"SQL Editor"** in left sidebar

### Step 2: Run Migrations in Order

Copy and paste each SQL file into the SQL Editor and click **"Run"** after each one.

#### Migration 1: Initial Schema (REQUIRED FIRST)

**File:** `supabase/migrations/001_initial_schema.sql`

This creates:
- ✅ `user_settings` table
- ✅ `general_contractors` table
- ✅ `keywords` table
- ✅ `projects` table
- ✅ RLS policies for all tables

**Run this first!**

---

#### Migration 2: Layer 0 Intelligence (if exists)

**File:** `supabase/migrations/002_layer0_intelligence_architecture.sql`

Skip if this file doesn't exist or is empty.

---

#### Migration 3: Company Types

**File:** `supabase/migrations/003_company_types.sql`

This adds:
- ✅ `company_type` column (subcontractor/distributor/manufacturer_rep)
- ✅ `product_lines` array
- ✅ `product_categories` array
- ✅ `ghost_threshold_days` integer

**Fixed:** Now correctly references `user_settings` table

---

#### Migration 4: Project Fingerprinting

**File:** `supabase/migrations/004_project_fingerprinting.sql`

This adds:
- ✅ `fingerprint` column to projects
- ✅ `is_duplicate` and `original_project_id` columns
- ✅ `project_gc_scores` table
- ✅ Indexes for performance

---

#### Migration 5: Beta Feedback

**File:** `supabase/migrations/005_beta_feedback.sql`

This creates:
- ✅ `beta_feedback` table
- ✅ Rating fields (ease_of_use, accuracy_rating)
- ✅ Status tracking workflow
- ✅ RLS policies for users and admin

---

### Step 3: Update Admin Email in Migration 5

Before running migration 5, edit the SQL file and replace `ryan@bidintell.com` with your admin email:

```sql
-- Find these lines in 005_beta_feedback.sql:
WHERE email = 'ryan@bidintell.com'

-- Replace with:
WHERE email = 'YOUR_ADMIN_EMAIL@example.com'
```

---

### Step 4: Verify Success

Run this SQL to verify all migrations applied:

```sql
-- Check all tables exist
SELECT
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') as user_settings_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'general_contractors') as gcs_exist,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'keywords') as keywords_exist,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') as projects_exist,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'beta_feedback') as feedback_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'project_gc_scores') as gc_scores_exist;

-- Should return all TRUE
```

**Check new columns exist:**

```sql
-- Check company type columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name IN ('company_type', 'product_lines', 'ghost_threshold_days');

-- Should return 3 rows
```

---

### Step 5: Update app.html Admin Email

**Find and replace in app.html:**

Search for: `ryan@bidintell.com`
Replace with: `YOUR_ADMIN_EMAIL@example.com`

This appears in 2 places:
1. Admin tab visibility check
2. Admin dashboard access check

---

## ✅ YOU'RE DONE!

Your database is now ready for BidIntell v1.6.

**Test the app:**
1. Sign up as new user
2. Complete onboarding (select company type)
3. Upload test bid
4. Submit feedback
5. Login as admin → see Admin tab

---

## 🚨 TROUBLESHOOTING

### If you get "table already exists" errors:

**Option A:** Skip that migration (table was already created)

**Option B:** Drop and recreate:
```sql
-- Be careful! This deletes all data
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS general_contractors CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP TABLE IF EXISTS project_gc_scores CASCADE;

-- Then run Migration 001 again
```

### If you get column already exists:

This is normal - the migration uses `IF NOT EXISTS` so it's safe to ignore.

---

## 📋 COMPLETE MIGRATION CHECKLIST

- [ ] Run Migration 001 (Initial Schema)
- [ ] Run Migration 002 (Layer 0) - if applicable
- [ ] Run Migration 003 (Company Types)
- [ ] Run Migration 004 (Fingerprinting)
- [ ] Edit Migration 005 with your admin email
- [ ] Run Migration 005 (Beta Feedback)
- [ ] Verify all tables exist
- [ ] Update admin email in app.html
- [ ] Deploy app.html
- [ ] Test full flow

---

**Total Time:** ~15 minutes
**Difficulty:** Easy (just copy/paste SQL)
**Risk:** Low (uses IF NOT EXISTS for safety)

**Ready to deploy!** 🚀
