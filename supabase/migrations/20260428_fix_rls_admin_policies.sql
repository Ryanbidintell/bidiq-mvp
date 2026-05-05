-- Migration 015: Fix broken RLS admin policies on user_settings
-- Both admin policies used EXISTS (SELECT 1 FROM auth.users WHERE ...) which throws
-- "permission denied for table users" when any user executes an UPDATE, blocking
-- all saves (including onboarding completion) even though the per-user policy would have allowed it.
-- Replaced with auth.jwt() ->> 'email' checks — reads from the token, no DB query, never throws.

DROP POLICY IF EXISTS "Admin users can update user_settings" ON user_settings;

CREATE POLICY "Admin users can update user_settings"
ON user_settings FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    (auth.jwt() ->> 'email') = ANY (ARRAY['ryan@fsikc.com', 'ryan@bidintell.ai'])
);

DROP POLICY IF EXISTS "Admin users can read all user_settings" ON user_settings;

CREATE POLICY "Admin users can read all user_settings"
ON user_settings FOR SELECT
USING (
    auth.role() = 'service_role' OR
    (auth.jwt() ->> 'email') = ANY (ARRAY['ryan@fsikc.com', 'ryan@bidintell.ai'])
);
