-- ============================================
-- Verify Billing Migrations
-- Run these queries to confirm everything worked
-- ============================================

-- 1. Check new columns in user_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name IN ('company_name', 'user_name', 'user_email', 'user_position')
ORDER BY column_name;
-- ✅ Should return 4 rows

-- 2. Check new tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_revenue', 'subscription_history')
ORDER BY table_name;
-- ✅ Should return 2 rows

-- 3. Check user_revenue table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_revenue'
ORDER BY ordinal_position;
-- ✅ Should show: id, user_id, stripe_customer_id, stripe_subscription_id, plan_name, mrr, status, beta_user, beta_end_date, etc.

-- 4. Check subscription_history table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscription_history'
ORDER BY ordinal_position;
-- ✅ Should show: id, user_id, event_type, old_plan, new_plan, old_mrr, new_mrr, stripe_event_id, metadata, created_at

-- 5. Verify indexes created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_revenue', 'subscription_history')
ORDER BY tablename, indexname;
-- ✅ Should show multiple indexes including idx_user_revenue_user_id, idx_user_revenue_stripe_customer, etc.

-- 6. Verify RLS policies
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_revenue', 'subscription_history')
ORDER BY tablename, policyname;
-- ✅ Should show "Users can read own revenue" and "Users can read own subscription history"

-- 7. Check RLS is enabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_revenue', 'subscription_history');
-- ✅ Both should have rowsecurity = true

-- ============================================
-- SUMMARY CHECK
-- ============================================
SELECT
    '✅ Migration Complete!' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name IN ('company_name', 'user_name', 'user_email', 'user_position')) as user_profile_columns,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_revenue', 'subscription_history')) as new_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('user_revenue', 'subscription_history')) as indexes_created,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_revenue', 'subscription_history')) as rls_policies;
-- ✅ Should show: 4 columns, 2 tables, 7+ indexes, 2 policies
