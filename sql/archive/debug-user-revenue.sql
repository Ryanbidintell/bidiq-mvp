-- Debug user_revenue table and RLS issues

-- 1. Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_revenue'
) as table_exists;

-- 2. Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_revenue';

-- 3. Check current policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_revenue';

-- 4. Check if user has any revenue records
SELECT COUNT(*) as record_count
FROM user_revenue;

-- 5. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_revenue'
ORDER BY ordinal_position;

-- 6. Try to insert a test record for current user (OPTIONAL - run if needed)
-- Replace 'YOUR_USER_ID' with actual user_id
-- INSERT INTO user_revenue (user_id, beta_user, beta_end_date)
-- VALUES ('d1989508-1d5e-4494-b3f8-d2899665d8b3', true, '2026-04-01 00:00:00+00')
-- ON CONFLICT (user_id) DO NOTHING;
