-- ============================================================
-- Fix Supabase Security Advisor: UNRESTRICTED Tables
-- Created: February 18, 2026
--
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste and run this entire script
-- 3. Check Security Advisor again to confirm issues resolved
--
-- TABLES FIXED: api_usage, user_revenue, project_gc_scores,
--               schema_migrations, v_projects_by_market,
--               v_projects_by_trade, v_projects_time_series
--
-- TABLES FLAGGED (manual check needed):
--   - users    → check if this is a public mirror of auth.users
--   - outcomes → check if this is used; may be orphaned
-- ============================================================


-- ============================================================
-- 1. api_usage
-- Has user_id. No RLS was ever added in the original migration.
-- Two access patterns:
--   a) Frontend inserts user's own records (line 4286 in app.html)
--   b) Admin panel reads ALL users' records (line 13155 in app.html)
-- ============================================================

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert their own API usage records
DROP POLICY IF EXISTS "Users can insert own api_usage" ON api_usage;
CREATE POLICY "Users can insert own api_usage"
ON api_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read their own API usage records
DROP POLICY IF EXISTS "Users can read own api_usage" ON api_usage;
CREATE POLICY "Users can read own api_usage"
ON api_usage FOR SELECT
USING (auth.uid() = user_id);

-- Admin can read ALL usage (for profitability dashboard in admin.html)
-- Multiple permissive SELECT policies are OR'd — regular users still only see their own
DROP POLICY IF EXISTS "Admin can read all api_usage" ON api_usage;
CREATE POLICY "Admin can read all api_usage"
ON api_usage FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);


-- ============================================================
-- 2. user_revenue
-- Has user_id. RLS was added in the Feb 14 billing migration
-- but admin.html reads ALL users' revenue (needs admin policy).
-- Stripe webhook uses service_role to INSERT/UPDATE.
-- ============================================================

ALTER TABLE user_revenue ENABLE ROW LEVEL SECURITY;

-- Remove old policies to avoid duplicates/conflicts
DROP POLICY IF EXISTS "Users can read own revenue" ON user_revenue;
DROP POLICY IF EXISTS "Users can insert own revenue" ON user_revenue;
DROP POLICY IF EXISTS "Users can update own revenue" ON user_revenue;
DROP POLICY IF EXISTS "Service role can manage revenue" ON user_revenue;
DROP POLICY IF EXISTS "Admin can read all revenue" ON user_revenue;

-- Users can read their own subscription status
CREATE POLICY "Users can read own revenue"
ON user_revenue FOR SELECT
USING (auth.uid() = user_id);

-- Service role (Stripe webhook) can fully manage all revenue records
CREATE POLICY "Service role can manage revenue"
ON user_revenue FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admin can read ALL revenue (for profitability dashboard)
CREATE POLICY "Admin can read all revenue"
ON user_revenue FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);


-- ============================================================
-- 3. project_gc_scores
-- No user_id column — access controlled via project_id → projects.
-- Not currently used in app.html but created by migration 004.
-- ============================================================

ALTER TABLE project_gc_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own project_gc_scores" ON project_gc_scores;
CREATE POLICY "Users can manage own project_gc_scores"
ON project_gc_scores FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_gc_scores.project_id
        AND projects.user_id = auth.uid()
    )
);


-- ============================================================
-- 4. schema_migrations
-- Internal Supabase migration tracking table.
-- Contains ZERO user data — only migration metadata.
-- App never queries this. Restrict to service_role only.
-- ============================================================

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON schema_migrations;
CREATE POLICY "Service role only"
ON schema_migrations FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 5. Analytics Views (v_projects_by_market, v_projects_by_trade,
--    v_projects_time_series)
--
-- These query the `projects` table which has RLS enabled.
-- Setting security_invoker = true ensures RLS on the underlying
-- table is respected when the view is queried.
-- (PostgreSQL 15+ feature — Supabase supports this)
-- ============================================================

ALTER VIEW v_projects_by_market SET (security_invoker = true);
ALTER VIEW v_projects_by_trade SET (security_invoker = true);
ALTER VIEW v_projects_time_series SET (security_invoker = true);


-- ============================================================
-- MANUAL CHECK REQUIRED — These tables are not in any local
-- migration files. Run the queries below to inspect them before
-- deciding what to do.
-- ============================================================

-- Check 1: What is the 'users' table?
-- (Could be a public mirror of auth.users — if so, may need to
-- either DROP it or restrict it heavily)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'users'
-- ORDER BY ordinal_position;

-- Check 2: What is the 'outcomes' table?
-- (Outcomes are stored in the projects table — this might be orphaned)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'outcomes'
-- ORDER BY ordinal_position;

-- Check 3: How many rows in each?
-- SELECT COUNT(*) FROM users;    -- if 0, safe to DROP
-- SELECT COUNT(*) FROM outcomes; -- if 0, safe to DROP


-- ============================================================
-- VERIFY: Check policies were created correctly
-- ============================================================
SELECT schemaname, tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN (
    'api_usage', 'user_revenue', 'project_gc_scores', 'schema_migrations'
)
ORDER BY tablename, policyname;
