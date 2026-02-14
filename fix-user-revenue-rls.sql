-- Fix user_revenue RLS policy issue
-- The 406 error means RLS is blocking SELECT queries

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read own revenue" ON user_revenue;

-- Create policy that allows users to read their own revenue data
CREATE POLICY "Users can read own revenue"
    ON user_revenue
    FOR SELECT
    USING (auth.uid() = user_id);

-- Also allow users to INSERT their own revenue data (for initial setup)
DROP POLICY IF EXISTS "Users can insert own revenue" ON user_revenue;

CREATE POLICY "Users can insert own revenue"
    ON user_revenue
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own revenue data
DROP POLICY IF EXISTS "Users can update own revenue" ON user_revenue;

CREATE POLICY "Users can update own revenue"
    ON user_revenue
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE user_revenue ENABLE ROW LEVEL SECURITY;

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_revenue';
