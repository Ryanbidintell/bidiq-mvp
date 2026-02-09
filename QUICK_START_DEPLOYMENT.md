# ⚡ BidIntell v1.6 - Quick Start Deployment

**Goal:** Get BidIntell v1.6 into production in under 30 minutes

---

## 🚀 5-MINUTE DEPLOYMENT CHECKLIST

### Step 1: Backup Database (2 minutes)
```
1. Go to https://app.supabase.com
2. Select your BidIntell project
3. Click "Database" → "Backups"
4. Click "Create backup" (or note the latest automatic backup)
```

### Step 2: Apply Migrations (10 minutes)

**Method: Supabase SQL Editor (Easiest)**

1. **Navigate:** Dashboard → SQL Editor
2. **Run Migration 003:**
   - Open file: `supabase/migrations/003_company_types.sql`
   - Copy all SQL
   - Paste into SQL Editor
   - Click **"Run"**
   - ✅ Verify "Success"

3. **Run Migration 004:**
   - Open file: `supabase/migrations/004_project_fingerprinting.sql`
   - Copy all SQL
   - Paste into SQL Editor
   - Click **"Run"**
   - ✅ Verify "Success"

4. **Run Migration 005:**
   - Open file: `supabase/migrations/005_beta_feedback.sql`
   - Copy all SQL
   - Paste into SQL Editor
   - Click **"Run"**
   - ✅ Verify "Success"

### Step 3: Update Admin Email (2 minutes)

**In Supabase SQL Editor:**

```sql
-- Update admin policies to use your email
-- Find and replace 'ryan@bidintell.com' with your actual admin email

-- For beta_feedback table admin policies:
DROP POLICY IF EXISTS "Admin can view all feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Admin can update feedback" ON beta_feedback;

CREATE POLICY "Admin can view all feedback"
    ON beta_feedback FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL@example.com'
        )
    );

CREATE POLICY "Admin can update feedback"
    ON beta_feedback FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL@example.com'
        )
    );
```

**Replace `YOUR_ADMIN_EMAIL@example.com` with your actual email**

### Step 4: Update app.html (1 minute)

**Find and replace:**
- Search for: `ryan@bidintell.com`
- Replace with: `YOUR_ADMIN_EMAIL@example.com`
- Save file

**This appears in 2 places:**
1. Admin tab visibility check
2. Admin dashboard access check

### Step 5: Deploy app.html (5 minutes)

**Upload to your hosting:**

- **If using Vercel:**
  ```bash
  cd bidiq-mvp
  vercel --prod
  ```

- **If using Netlify:**
  ```bash
  cd bidiq-mvp
  netlify deploy --prod
  ```

- **If using custom hosting:**
  - Upload `app.html` to your web server
  - Ensure `lib/` folder is uploaded
  - Test URL: `https://yourdomain.com/app.html`

### Step 6: Test Critical Paths (10 minutes)

**Quick smoke test:**

1. **Sign up new user** → Should reach onboarding
2. **Select company type** → Subcontractor/Distributor/Mfg Rep
3. **Complete onboarding** → Should reach dashboard
4. **Upload test bid PDF** → Should analyze successfully
5. **Click Analytics tab** → Should see charts
6. **Submit feedback** → Should save to database
7. **Login as admin** → Should see Admin tab

✅ **If all tests pass, you're live!**

---

## 🎯 30-SECOND VERIFICATION

After deployment, run this SQL to verify everything:

```sql
-- Check all migrations applied
SELECT
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'company_type') as migration_003,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'fingerprint') as migration_004,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'beta_feedback') as migration_005;

-- Should return: true, true, true
```

---

## 🚨 ROLLBACK (If Something Goes Wrong)

### Quick Rollback Script

```sql
-- Rollback all migrations (use only if needed)

-- Rollback Migration 005
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP FUNCTION IF EXISTS update_beta_feedback_updated_at() CASCADE;

-- Rollback Migration 004
DROP TABLE IF EXISTS project_gc_scores CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS fingerprint CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS is_duplicate CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS original_project_id CASCADE;

-- Rollback Migration 003
ALTER TABLE user_preferences DROP COLUMN IF EXISTS company_type CASCADE;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS provides_installation CASCADE;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS product_lines CASCADE;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS product_categories CASCADE;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS ghost_threshold_days CASCADE;

-- Restore from backup
-- Go to Dashboard → Database → Backups → Restore
```

---

## 📋 POST-DEPLOYMENT CHECKLIST

After going live:

- [ ] Test onboarding for all 3 company types
- [ ] Verify multi-signal trade detection works
- [ ] Upload duplicate bid and verify warning
- [ ] Submit test feedback
- [ ] Check admin dashboard (login as admin)
- [ ] Test mobile view
- [ ] Monitor Supabase logs for errors
- [ ] Check Claude API usage

---

## 🎉 DONE!

Your BidIntell v1.6 is now live with:

✅ Company type segmentation
✅ Multi-signal trade detection
✅ Duplicate project warnings
✅ Enhanced analytics with charts
✅ Beta feedback system
✅ Admin dashboard
✅ Mobile-responsive design

**Next:** Recruit beta testers and collect feedback!

---

## 🆘 QUICK HELP

**Database issues?**
- Check Supabase logs: Dashboard → Logs → Database
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

**App not working?**
- Check browser console for errors (F12)
- Verify Supabase keys in app.html
- Check network tab for failed API requests

**Need detailed help?**
- See: `SUPABASE_DEPLOYMENT_GUIDE.md` (comprehensive guide)
- See: `COMPLETE_IMPLEMENTATION_SUMMARY.md` (full feature list)

---

**Deployment Time:** ~30 minutes
**Difficulty:** Easy (just copy/paste SQL)
**Risk:** Low (we have backups!)

**Ready? Let's deploy! 🚀**
