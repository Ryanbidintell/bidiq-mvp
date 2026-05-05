-- Migration 005: Allow Admin Frontend Access to Metrics Tables
-- Purpose: Let admin.html (using anon key) read metrics data
-- Date: February 16, 2026

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Service role can read all events" ON admin_events;
DROP POLICY IF EXISTS "Service role only" ON admin_metrics_snapshots;

-- Allow admin users to read all events (check email)
CREATE POLICY "Admin users can read all events"
ON admin_events FOR SELECT
USING (
    auth.role() = 'service_role' OR
    auth.email() IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
);

-- Keep insert policy for regular users
-- (already exists: "Users can insert own events")

-- Allow admin users to read all snapshots
CREATE POLICY "Admin users can read snapshots"
ON admin_metrics_snapshots FOR SELECT
USING (
    auth.role() = 'service_role' OR
    auth.email() IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
);

-- Allow service role to manage snapshots (for daily-snapshot function)
CREATE POLICY "Service role can manage snapshots"
ON admin_metrics_snapshots FOR ALL
USING (auth.role() = 'service_role');

COMMENT ON POLICY "Admin users can read all events" ON admin_events IS
    'Allows admin.html (frontend) to read events using anon key';

COMMENT ON POLICY "Admin users can read snapshots" ON admin_metrics_snapshots IS
    'Allows admin.html (frontend) to read snapshots using anon key';

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('admin_events', 'admin_metrics_snapshots')
ORDER BY tablename, policyname;
