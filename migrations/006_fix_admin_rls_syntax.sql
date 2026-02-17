-- Migration 006: Fix Admin RLS Policy Syntax
-- Purpose: Correct syntax for checking admin emails in RLS policies
-- Date: February 17, 2026
-- Issue: auth.email() doesn't exist, need to query auth.users table

-- Drop policies with incorrect syntax
DROP POLICY IF EXISTS "Admin users can read all events" ON admin_events;
DROP POLICY IF EXISTS "Admin users can read snapshots" ON admin_metrics_snapshots;
DROP POLICY IF EXISTS "Service role can manage snapshots" ON admin_metrics_snapshots;

-- ========================================
-- ADMIN_EVENTS TABLE
-- ========================================

-- Allow admin users to read all events (correct syntax)
CREATE POLICY "Admin users can read all events"
ON admin_events FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- ========================================
-- ADMIN_METRICS_SNAPSHOTS TABLE
-- ========================================

-- Allow admin users to read snapshots (correct syntax)
CREATE POLICY "Admin users can read snapshots"
ON admin_metrics_snapshots FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- Allow service role to insert/update snapshots (for daily-snapshot function)
CREATE POLICY "Service role can manage snapshots"
ON admin_metrics_snapshots FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update snapshots"
ON admin_metrics_snapshots FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "Admin users can read all events" ON admin_events IS
    'Allows admin.html to read events by checking user email from auth.users table';

COMMENT ON POLICY "Admin users can read snapshots" ON admin_metrics_snapshots IS
    'Allows admin.html to read snapshots by checking user email from auth.users table';

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('admin_events', 'admin_metrics_snapshots')
ORDER BY tablename, policyname;
