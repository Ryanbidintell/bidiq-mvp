# 🚀 BidIntell v1.6 - Supabase Deployment Guide

**Created:** February 5, 2026
**Version:** 1.6
**Status:** Ready for Production Deployment

---

## 📋 OVERVIEW

This guide covers deploying all Phase 1-4 database migrations and configuring Supabase for BidIntell v1.6.

**What's New:**
- Company type segmentation (Subcontractor/Distributor/Mfg Rep)
- Project fingerprinting for duplicate detection
- Beta feedback system
- Admin dashboard support
- GC alias management
- Enhanced RLS policies

---

## ⚠️ PRE-DEPLOYMENT CHECKLIST

Before applying migrations:

- [ ] **Backup your database** - Create a snapshot in Supabase dashboard
- [ ] **Test in staging first** - If you have a staging environment
- [ ] **Have rollback plan ready** - Know how to restore from backup
- [ ] **Schedule maintenance window** - Notify users if applicable
- [ ] **Verify Supabase access** - Ensure you have admin/owner role

---

## 🗄️ DATABASE MIGRATIONS

### Migration Order

Apply migrations in this exact order:

1. `003_company_types.sql` - Company type fields
2. `004_project_fingerprinting.sql` - Duplicate detection
3. `005_beta_feedback.sql` - Beta feedback widget

---

## 📝 MIGRATION 003: Company Types & Product Match

**Purpose:** Add company type selection and product line tracking

### What it does:
- Adds `company_type` field (subcontractor/distributor/manufacturer_rep)
- Adds `product_lines` array for distributors/mfg reps
- Adds `product_categories` array
- Adds `ghost_threshold_days` for passive ghost trigger
- Sets up proper defaults

### SQL to Execute:

```sql
-- Migration 003: Company Types & Product Match
-- Run this first

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS company_type TEXT
    DEFAULT 'subcontractor'
    CHECK (company_type IN ('subcontractor', 'distributor', 'manufacturer_rep')),

  ADD COLUMN IF NOT EXISTS provides_installation BOOLEAN
    DEFAULT true,

  ADD COLUMN IF NOT EXISTS product_lines TEXT[]
    DEFAULT '{}',

  ADD COLUMN IF NOT EXISTS product_categories TEXT[]
    DEFAULT '{}',

  ADD COLUMN IF NOT EXISTS ghost_threshold_days INTEGER
    DEFAULT 60
    CHECK (ghost_threshold_days > 0 AND ghost_threshold_days <= 365);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.company_type IS 'Business model: subcontractor (labor+materials), distributor (materials only), or manufacturer rep (brand representation)';
COMMENT ON COLUMN user_preferences.provides_installation IS 'Whether the company provides installation services (false for distributors/reps who only supply)';
COMMENT ON COLUMN user_preferences.product_lines IS 'Array of product brands/lines carried (for distributors and mfg reps)';
COMMENT ON COLUMN user_preferences.product_categories IS 'Array of product categories (electrical, hvac, lighting, etc.)';
COMMENT ON COLUMN user_preferences.ghost_threshold_days IS 'Number of days before auto-ghosting stale pending projects (default 60)';
```

### Verification:

```sql
-- Check if columns were added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences'
  AND column_name IN ('company_type', 'product_lines', 'product_categories', 'ghost_threshold_days');

-- Should return 4 rows
```

---

## 📝 MIGRATION 004: Project Fingerprinting

**Purpose:** Enable duplicate project detection and GC-specific scoring

### What it does:
- Adds `fingerprint` field to projects table for duplicate detection
- Adds `is_duplicate` and `original_project_id` for tracking
- Creates `project_gc_scores` table for multi-GC projects
- Adds indexes for fast lookups

### SQL to Execute:

```sql
-- Migration 004: Project Fingerprinting & Duplicate Detection
-- Run this second

-- Add fingerprint columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index on fingerprint for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_projects_fingerprint
  ON projects(fingerprint)
  WHERE fingerprint IS NOT NULL;

-- Create table for storing GC-specific scores (for multi-GC projects)
CREATE TABLE IF NOT EXISTS project_gc_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gc_id UUID NOT NULL REFERENCES general_contractors(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    recommendation TEXT CHECK (recommendation IN ('GO', 'REVIEW', 'PASS')),
    components JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gc_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_project
  ON project_gc_scores(project_id);

CREATE INDEX IF NOT EXISTS idx_project_gc_scores_gc
  ON project_gc_scores(gc_id);

-- Add comments for documentation
COMMENT ON COLUMN projects.fingerprint IS 'Normalized hash of project_name + city + state for duplicate detection';
COMMENT ON COLUMN projects.is_duplicate IS 'Whether this project was detected as a duplicate of an earlier upload';
COMMENT ON COLUMN projects.original_project_id IS 'Reference to the original project if this is a duplicate';
COMMENT ON TABLE project_gc_scores IS 'Stores per-GC scores for projects with multiple GCs bidding';
```

### Verification:

```sql
-- Check projects table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('fingerprint', 'is_duplicate', 'original_project_id');

-- Check project_gc_scores table was created
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'project_gc_scores';

-- Check indexes were created
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('projects', 'project_gc_scores');
```

---

## 📝 MIGRATION 005: Beta Feedback Widget

**Purpose:** Collect structured feedback from beta testers

### What it does:
- Creates `beta_feedback` table
- Sets up feedback type categories (bug/feature/ux/general)
- Adds rating fields (ease of use, accuracy)
- Implements status tracking workflow
- Creates RLS policies for user access

### SQL to Execute:

```sql
-- Migration 005: Beta Feedback Widget
-- Run this third

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_company TEXT,

    -- Feedback content
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'ux', 'general')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_location TEXT, -- Which page/feature they were using

    -- Rating fields
    ease_of_use INTEGER CHECK (ease_of_use BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    would_recommend BOOLEAN,

    -- Context data
    user_agent TEXT,
    screen_resolution TEXT,
    project_context JSONB, -- Optional: context about what they were analyzing

    -- Status tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_beta_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beta_feedback_updated_at
    BEFORE UPDATE ON beta_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_beta_feedback_updated_at();

-- Add RLS policies
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON beta_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON beta_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- Admin can view all feedback (replace with your admin user ID)
-- Note: Update 'YOUR_ADMIN_USER_ID' with actual admin user UUID after creating admin account
CREATE POLICY "Admin can view all feedback"
    ON beta_feedback FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'ryan@bidintell.com'
        )
    );

-- Admin can update feedback status
CREATE POLICY "Admin can update feedback"
    ON beta_feedback FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'ryan@bidintell.com'
        )
    );

-- Comments for documentation
COMMENT ON TABLE beta_feedback IS 'Stores feedback from beta testers';
COMMENT ON COLUMN beta_feedback.feedback_type IS 'Category: bug, feature request, UX issue, or general';
COMMENT ON COLUMN beta_feedback.page_location IS 'Which page/feature they were using when submitting feedback';
COMMENT ON COLUMN beta_feedback.project_context IS 'Optional context about the project they were analyzing';
```

### Verification:

```sql
-- Check table was created
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'beta_feedback';

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'beta_feedback';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'beta_feedback';

-- Check policies were created
SELECT policyname, tablename
FROM pg_policies
WHERE tablename = 'beta_feedback';

-- Should return 4 policies
```

---

## 🔐 ROW LEVEL SECURITY (RLS) REVIEW

Verify all tables have proper RLS policies:

```sql
-- Check which tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Expected RLS Status:

| Table | RLS Enabled | Policies Required |
|-------|------------|------------------|
| `user_preferences` | ✅ Yes | Users CRUD own data |
| `projects` | ✅ Yes | Users CRUD own projects |
| `general_contractors` | ✅ Yes | Users CRUD own GCs |
| `keywords` | ✅ Yes | Users CRUD own keywords |
| `beta_feedback` | ✅ Yes | Users insert/view own, admin view all |
| `project_gc_scores` | ✅ Yes | Users view own project scores |

---

## 🧪 POST-DEPLOYMENT TESTING

After applying all migrations:

### 1. Test Company Type Selection

```sql
-- Check default company type for existing users
SELECT id, email, company_type, product_lines
FROM auth.users
LEFT JOIN user_preferences ON auth.users.id = user_preferences.user_id
LIMIT 5;

-- Update a test user to distributor
UPDATE user_preferences
SET
    company_type = 'distributor',
    product_lines = ARRAY['Eaton', 'Square D', 'Lutron'],
    product_categories = ARRAY['electrical', 'lighting']
WHERE user_id = 'YOUR_TEST_USER_ID';
```

### 2. Test Duplicate Detection

```sql
-- Check fingerprint generation (should be null for existing projects)
SELECT id, extracted_data->>'project_name' as project_name, fingerprint
FROM projects
WHERE user_id = 'YOUR_TEST_USER_ID'
LIMIT 5;

-- Fingerprints will be generated on next analysis via app.html
```

### 3. Test Beta Feedback

```sql
-- Insert test feedback
INSERT INTO beta_feedback (
    user_id,
    user_email,
    feedback_type,
    title,
    description,
    ease_of_use,
    accuracy_rating
) VALUES (
    'YOUR_TEST_USER_ID',
    'test@example.com',
    'feature',
    'Test Feedback',
    'This is a test feedback submission',
    5,
    4
);

-- Verify it appears for the user
SELECT * FROM beta_feedback WHERE user_id = 'YOUR_TEST_USER_ID';
```

### 4. Test Admin Access

```sql
-- Verify admin can see all feedback
SELECT COUNT(*) as total_feedback FROM beta_feedback;

-- If logged in as ryan@bidintell.com, this should return all feedback
-- If logged in as regular user, should only return their own feedback
```

---

## 🔄 APPLYING MIGRATIONS VIA SUPABASE UI

### Method 1: Supabase Dashboard (Recommended for beginners)

1. **Navigate to SQL Editor:**
   - Go to https://app.supabase.com
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Run Migration 003:**
   - Copy the entire SQL from Migration 003 above
   - Paste into SQL Editor
   - Click "Run" button
   - Verify "Success" message

3. **Run Migration 004:**
   - Copy the entire SQL from Migration 004
   - Paste into SQL Editor
   - Click "Run"
   - Verify success

4. **Run Migration 005:**
   - Copy the entire SQL from Migration 005
   - Paste into SQL Editor
   - Click "Run"
   - Verify success

5. **Run Verification Queries:**
   - Copy each verification SQL block
   - Run to confirm migrations applied correctly

---

### Method 2: Supabase CLI (Recommended for production)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link to your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

4. **Apply migrations:**
   ```bash
   cd bidiq-mvp
   supabase db push
   ```

5. **Or apply individually:**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/003_company_types.sql
   psql $DATABASE_URL -f supabase/migrations/004_project_fingerprinting.sql
   psql $DATABASE_URL -f supabase/migrations/005_beta_feedback.sql
   ```

---

### Method 3: Direct Database Connection (Advanced)

1. **Get connection string:**
   - Supabase Dashboard → Settings → Database
   - Copy "Connection string" (Transaction mode)
   - Replace `[YOUR-PASSWORD]` with your database password

2. **Connect via psql:**
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```

3. **Run migrations:**
   ```sql
   \i supabase/migrations/003_company_types.sql
   \i supabase/migrations/004_project_fingerprinting.sql
   \i supabase/migrations/005_beta_feedback.sql
   ```

---

## 🚨 TROUBLESHOOTING

### Issue: "Column already exists"

**Cause:** Migration already partially applied

**Solution:**
```sql
-- Check which columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_preferences';

-- Skip the ADD COLUMN for existing columns
-- Or use IF NOT EXISTS (already in migration SQL)
```

### Issue: "Permission denied"

**Cause:** Not logged in as database owner

**Solution:**
- Ensure you're logged into Supabase dashboard as project owner
- Or use service_role key (not anon key) in API calls

### Issue: "Cannot add foreign key constraint"

**Cause:** Referenced table doesn't exist

**Solution:**
```sql
-- Check if general_contractors table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'general_contractors';

-- If missing, need to run earlier migrations first
```

### Issue: "RLS policy conflict"

**Cause:** Policy with same name already exists

**Solution:**
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert own feedback" ON beta_feedback;

-- Then re-run policy creation
```

---

## 📊 DATA MIGRATION FOR EXISTING USERS

If you have existing users, you may want to set defaults:

```sql
-- Set all existing users to 'subcontractor' company type
UPDATE user_preferences
SET company_type = 'subcontractor'
WHERE company_type IS NULL;

-- Set default ghost threshold for existing users
UPDATE user_preferences
SET ghost_threshold_days = 60
WHERE ghost_threshold_days IS NULL;

-- Verify
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN company_type = 'subcontractor' THEN 1 END) as subcontractors,
    COUNT(CASE WHEN company_type = 'distributor' THEN 1 END) as distributors,
    COUNT(CASE WHEN company_type = 'manufacturer_rep' THEN 1 END) as mfg_reps
FROM user_preferences;
```

---

## 🔙 ROLLBACK PROCEDURES

If something goes wrong:

### Rollback Migration 005 (Beta Feedback)

```sql
-- Drop table and all dependencies
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP FUNCTION IF EXISTS update_beta_feedback_updated_at() CASCADE;
```

### Rollback Migration 004 (Fingerprinting)

```sql
-- Drop project_gc_scores table
DROP TABLE IF EXISTS project_gc_scores CASCADE;

-- Remove columns from projects
ALTER TABLE projects
  DROP COLUMN IF EXISTS fingerprint,
  DROP COLUMN IF EXISTS is_duplicate,
  DROP COLUMN IF EXISTS original_project_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_projects_fingerprint;
DROP INDEX IF EXISTS idx_project_gc_scores_project;
DROP INDEX IF EXISTS idx_project_gc_scores_gc;
```

### Rollback Migration 003 (Company Types)

```sql
-- Remove columns from user_preferences
ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS company_type,
  DROP COLUMN IF EXISTS provides_installation,
  DROP COLUMN IF EXISTS product_lines,
  DROP COLUMN IF EXISTS product_categories,
  DROP COLUMN IF EXISTS ghost_threshold_days;
```

---

## 🎯 POST-DEPLOYMENT APP CONFIGURATION

After database migrations are complete:

### 1. Update Environment Variables

Ensure these are set in your hosting environment:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Claude API (for AI features)
CLAUDE_API_KEY=sk-ant-api03-...

# Admin Configuration
ADMIN_EMAIL=ryan@bidintell.com
```

### 2. Test Full Flow

1. **Sign up new test user**
2. **Complete onboarding** - Select company type
3. **Analyze test bid** - Should see company type-specific UI
4. **Check duplicate detection** - Upload same bid twice
5. **Submit feedback** - Test beta feedback widget
6. **Admin dashboard** - Login as ryan@bidintell.com and verify admin tab appears

### 3. Monitor Database

```sql
-- Check database size
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT
    'user_preferences' as table_name, COUNT(*) as rows FROM user_preferences
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'general_contractors', COUNT(*) FROM general_contractors
UNION ALL
SELECT 'beta_feedback', COUNT(*) FROM beta_feedback;
```

---

## ✅ DEPLOYMENT CHECKLIST

Use this checklist to track your deployment:

### Pre-Deployment
- [ ] Backup database in Supabase dashboard
- [ ] Review all migration SQL files
- [ ] Test migrations in staging environment
- [ ] Schedule maintenance window (if needed)

### Deployment
- [ ] Apply Migration 003 (Company Types)
- [ ] Verify Migration 003 with test queries
- [ ] Apply Migration 004 (Fingerprinting)
- [ ] Verify Migration 004 with test queries
- [ ] Apply Migration 005 (Beta Feedback)
- [ ] Verify Migration 005 with test queries
- [ ] Review RLS policies
- [ ] Update admin email in policies

### Testing
- [ ] Test onboarding flow (all 3 company types)
- [ ] Test bid analysis with new features
- [ ] Test duplicate detection
- [ ] Test beta feedback submission
- [ ] Test admin dashboard access
- [ ] Test mobile responsiveness
- [ ] Verify analytics charts load

### Monitoring
- [ ] Check database size and performance
- [ ] Monitor error logs
- [ ] Check API usage (Claude API calls)
- [ ] Review user feedback
- [ ] Monitor page load times

---

## 🆘 SUPPORT & RESOURCES

### Supabase Documentation
- [Database Migrations](https://supabase.com/docs/guides/database/migrations)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor](https://supabase.com/docs/guides/database/sql-editor)

### BidIntell Documentation
- [Implementation Game Plan](IMPLEMENTATION_GAME_PLAN.md)
- [Implementation Status](IMPLEMENTATION_STATUS.md)
- [Phase 1 Complete](PHASE_1_COMPLETE.md)
- [Product Bible v1.6](BidIntell_Product_Bible_v1_6.md)

### Getting Help
- Check Supabase dashboard logs: Dashboard → Logs → Database
- Review browser console for errors
- Check network tab for failed API requests
- Contact: ryan@bidintell.com

---

## 🎉 DEPLOYMENT COMPLETE!

Once all migrations are applied and tested, you're ready for beta testing!

**Next Steps:**
1. Recruit beta testers (10-20 subcontractors, 5-10 distributors, 3-5 mfg reps)
2. Monitor beta feedback via admin dashboard
3. Iterate based on user feedback
4. Plan Phase 5 features (if needed)

**Congratulations on deploying BidIntell v1.6!** 🚀

---

**Document Version:** 1.0
**Last Updated:** February 5, 2026
**Maintained By:** Claude Sonnet 4.5
