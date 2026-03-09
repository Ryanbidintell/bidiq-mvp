-- Admin bypass policy for user_settings
-- Allows ryan@fsikc.com and ryan@bidintell.ai to read ALL rows
-- (existing per-user SELECT policy still works for regular users via OR logic)
--
-- Run this once in Supabase SQL Editor → Run

CREATE POLICY "admin_read_all_user_settings"
ON user_settings
FOR SELECT
USING (
    auth.jwt() ->> 'email' IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
);
