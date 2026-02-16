# Admin Metrics Dashboard - Setup Guide

## Overview

The admin metrics system tracks key business metrics daily and displays them in a real-time dashboard at `/admin.html`.

**Components:**
1. **Database tables** - Store events and daily snapshots
2. **Event logging** - Tracks user actions in real-time (app.html)
3. **Admin dashboard** - Displays metrics and trends (admin.html)
4. **Daily snapshot function** - Captures metrics at midnight (daily-snapshot.js)

---

## 1. Database Setup

**Already completed!** The following migrations have been run:

✅ `migrations/001_add_subscription_tracking.sql` - Subscription fields in user_settings
✅ `migrations/002_add_outcome_tracking_fields.sql` - Outcome tracking in projects
✅ `migrations/003_create_admin_events_table.sql` - Event logging table
✅ `migrations/004_create_admin_metrics_snapshots.sql` - Daily metrics snapshots

**Verify in Supabase:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('admin_events', 'admin_metrics_snapshots');

-- Check recent events
SELECT event_type, COUNT(*)
FROM admin_events
GROUP BY event_type
ORDER BY COUNT(*) DESC;
```

---

## 2. Admin Dashboard Access

**URL:** https://bidintell.ai/admin.html

**Access Control:**
- Only accessible to: `ryan@fsikc.com` and `ryan@bidintell.ai`
- Automatically redirects non-admins to `/app.html`
- Uses Supabase service role for database queries (bypasses RLS)

**Navigation:**
- Admin nav item appears in app.html sidebar (only for admin users)
- Click "Admin" to open dashboard in same tab

---

## 3. Daily Snapshot Function

**Purpose:** Captures daily metrics at midnight UTC for trend analysis

**Location:** `netlify/functions/daily-snapshot.js`

**Metrics Captured:**
- Total users, paid users, beta users
- Starter/Professional tier breakdown
- Monthly Recurring Revenue (MRR)
- New signups today
- Cancellations today
- Bids analyzed today
- Outcomes recorded today

### Netlify Scheduled Functions (Pro/Enterprise Tier)

If your Netlify account is on Pro or Enterprise, the function is **already scheduled** via `netlify.toml`:

```toml
[[functions]]
  name = "daily-snapshot"
  schedule = "0 0 * * *"  # Daily at midnight UTC
```

**Verify in Netlify Dashboard:**
1. Go to Netlify Dashboard → Site → Functions
2. Look for "daily-snapshot" with schedule indicator
3. Check function logs for successful runs

### Alternative: Manual Trigger (All Tiers)

The function can also be triggered manually via HTTP:

**Test Locally:**
```bash
netlify dev
# Then in another terminal:
curl -X POST http://localhost:8888/.netlify/functions/daily-snapshot
```

**Trigger in Production:**
```bash
curl -X POST https://bidintell.ai/.netlify/functions/daily-snapshot
```

**Response (success):**
```json
{
  "success": true,
  "snapshot": {
    "snapshot_date": "2026-02-16",
    "total_users": 12,
    "paid_users": 0,
    "beta_users": 12,
    "starter_users": 0,
    "professional_users": 0,
    "mrr_cents": 0,
    "new_signups_today": 3,
    "cancellations_today": 0,
    "bids_analyzed_today": 5,
    "outcomes_recorded_today": 2
  },
  "message": "Daily snapshot for 2026-02-16 saved successfully"
}
```

### External Scheduler Options (Free Tier)

If you're on Netlify's free tier, use an external service to trigger the function daily:

#### Option A: GitHub Actions (Recommended)

Create `.github/workflows/daily-snapshot.yml`:

```yaml
name: Daily Metrics Snapshot
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Netlify Function
        run: |
          curl -X POST https://bidintell.ai/.netlify/functions/daily-snapshot
```

**Enable:**
1. Commit file to repository
2. Push to GitHub
3. Go to Actions tab → Daily Metrics Snapshot
4. Click "Enable workflow"

#### Option B: Cron-Job.org

1. Go to https://cron-job.org (free account)
2. Create new cron job:
   - **URL:** `https://bidintell.ai/.netlify/functions/daily-snapshot`
   - **Schedule:** Daily at 00:00 UTC
   - **Method:** POST
3. Save and enable

#### Option C: EasyCron.com

1. Go to https://www.easycron.com (free account)
2. Create new cron job:
   - **URL:** `https://bidintell.ai/.netlify/functions/daily-snapshot`
   - **Cron Expression:** `0 0 * * *`
   - **HTTP Method:** POST
3. Save

---

## 4. Testing the Complete System

### Test Event Logging

1. **Signup event:**
   - Create new test account
   - Complete onboarding (all 11 steps)
   - Check Supabase:
     ```sql
     SELECT * FROM admin_events WHERE event_type = 'signup' ORDER BY created_at DESC LIMIT 1;
     ```

2. **First bid event:**
   - Upload bid document as new user
   - Wait for analysis to complete
   - Check Supabase:
     ```sql
     SELECT * FROM admin_events WHERE event_type = 'first_bid' ORDER BY created_at DESC LIMIT 1;
     ```

3. **Outcome recorded event:**
   - Save a project
   - Record outcome (won/lost/ghost/didnt_bid)
   - Check Supabase:
     ```sql
     SELECT * FROM admin_events WHERE event_type = 'outcome_recorded' ORDER BY created_at DESC LIMIT 1;
     ```

4. **Score override event:**
   - After analysis, click "Was this score accurate?"
   - Select "Too high" or "Too low"
   - Add feedback note
   - Check Supabase:
     ```sql
     SELECT * FROM admin_events WHERE event_type = 'score_override' ORDER BY created_at DESC LIMIT 1;
     ```

### Test Daily Snapshot Function

**Trigger manually:**
```bash
curl -X POST https://bidintell.ai/.netlify/functions/daily-snapshot
```

**Check Supabase:**
```sql
-- View today's snapshot
SELECT * FROM admin_metrics_snapshots
WHERE snapshot_date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 1;

-- View last 7 days
SELECT
  snapshot_date,
  total_users,
  paid_users,
  mrr_cents / 100.0 as mrr_dollars,
  new_signups_today,
  bids_analyzed_today
FROM admin_metrics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY snapshot_date DESC;
```

### Test Admin Dashboard

1. Open https://bidintell.ai/admin.html
2. Verify all metric cards display correctly:
   - ✅ MRR shows $0.00 during beta
   - ✅ User counts match Supabase auth.users
   - ✅ Churn rate is 0% during beta
   - ✅ Activation funnel shows percentages
   - ✅ Phase gates show completion status
3. Check browser console for errors (F12)
4. Verify data refreshes on page reload

---

## 5. Monitoring & Maintenance

### Check Function Logs

**Netlify Dashboard:**
1. Go to Site → Functions
2. Click "daily-snapshot"
3. View recent invocations and logs

**Look for:**
- ✅ "✅ Daily snapshot saved successfully"
- ❌ "❌ Daily snapshot failed" (investigate immediately)

### Database Health Checks

**Weekly review:**
```sql
-- Check for gaps in snapshots
SELECT
  snapshot_date,
  LAG(snapshot_date) OVER (ORDER BY snapshot_date) as prev_date,
  snapshot_date - LAG(snapshot_date) OVER (ORDER BY snapshot_date) as gap_days
FROM admin_metrics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date DESC;

-- Event volume by type (last 30 days)
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM admin_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY event_type
ORDER BY event_count DESC;
```

### Backfill Historical Data (if needed)

If you need to generate snapshots for past dates:

```bash
# Trigger manually for each date (function uses current date)
# Would need to modify function to accept date parameter
curl -X POST https://bidintell.ai/.netlify/functions/daily-snapshot
```

---

## 6. Troubleshooting

### Admin dashboard shows "Loading..." forever

**Check:**
1. Browser console (F12) for JavaScript errors
2. Are you logged in as admin email?
3. Is Supabase accessible? (check network tab)

**Fix:**
- Clear browser cache
- Check Supabase service key in Netlify env vars
- Verify RLS policies allow service role access

### Snapshot function returns 500 error

**Check Netlify function logs:**
```bash
netlify logs:function daily-snapshot
```

**Common issues:**
- Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- Database permissions (service key should bypass RLS)
- Table doesn't exist (run migrations)

### Events not appearing in admin_events table

**Check:**
1. Is the event code actually running? (add console.log)
2. Are there JavaScript errors preventing event logging?
3. Check RLS policies - users should be able to INSERT their own events

**Test in browser console:**
```javascript
// Should not throw error
await supabaseClient.from('admin_events').insert({
    event_type: 'test',
    user_id: currentUser.id,
    event_data: { test: true }
});
```

---

## 7. Next Steps

### Before April 1, 2026 (Paid Launch)

1. **Verify billing integration:**
   - Ensure Stripe webhook syncs to user_revenue table
   - Test MRR calculation with test subscriptions
   - Verify churn tracking when subscriptions cancel

2. **Monitor beta metrics:**
   - Track activation funnel (onboarding → first bid %)
   - Identify drop-off points
   - Collect outcome data for AI training

3. **Set phase gate targets:**
   - Phase 0: 20 beta users with 60+ bids
   - Phase 1: $15K MRR with 80%+ outcome tracking

### After Paid Launch

1. **Daily dashboard review:**
   - Check MRR trend (should grow)
   - Monitor churn rate (target <5%)
   - Track acquisition sources (optimize marketing)

2. **Segmented analysis:**
   - Compare starter vs professional churn
   - Analyze outcome confidence by user
   - Identify power users (high bid volume + outcomes)

3. **AI intelligence layer:**
   - Export outcome data for AI retraining
   - Track score override patterns
   - Improve confidence in AI recommendations

---

## 8. Security Notes

**Admin dashboard:**
- Only accessible via email whitelist (hardcoded)
- Uses service role key (stored in Netlify env vars only)
- No public API endpoints expose admin data

**Event logging:**
- Fire-and-forget pattern (never blocks user flow)
- Wrapped in try/catch (errors logged, not thrown)
- RLS policies prevent users from reading others' events

**Daily snapshot function:**
- Can be triggered by anyone via HTTP POST
- This is safe - function only reads data and saves aggregate metrics
- No user-identifiable information in snapshots (only counts/sums)
- Consider adding API key authentication if concerned

---

## Questions?

**Issues with setup:**
- Check Netlify function logs
- Review Supabase query logs
- Test locally with `netlify dev`

**Feature requests:**
- Add new metrics to daily snapshot
- Create custom dashboard views
- Export data to CSV/Excel

**Need help?**
- Review code comments in daily-snapshot.js
- Check admin.html for metric calculation logic
- Refer to Product Bible v1.8 for phase gate definitions
