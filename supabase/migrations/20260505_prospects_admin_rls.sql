-- Migration: Admin RLS policies for prospects and prospect_sequence_events
-- Allows admin.html (anon key + authenticated admin user) to read and manage prospects
-- Pattern mirrors 20260424_admin_rls_bypass.sql

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_sequence_events ENABLE ROW LEVEL SECURITY;

-- prospects: admin can read all rows (for funnel metrics + prospect list)
CREATE POLICY "Admin can read all prospects"
ON prospects FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- prospects: admin can update status (Pause, Resume, Mark Replied)
CREATE POLICY "Admin can update prospects"
ON prospects FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- prospect_sequence_events: admin can insert events (paused, resumed, reply_marked)
CREATE POLICY "Admin can insert prospect events"
ON prospect_sequence_events FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- Netlify functions use service_role key — no additional policies needed for INSERT/UPDATE/DELETE
-- The service_role bypasses RLS automatically

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('prospects', 'prospect_sequence_events')
ORDER BY tablename, cmd;
