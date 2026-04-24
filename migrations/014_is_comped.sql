-- Migration 014: Add is_comped flag to user_settings
-- Enables comped accounts without Stripe — access gate checks this alongside user_revenue.status
-- To comp a user: UPDATE user_settings SET is_comped = true WHERE user_id = '<id>';

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS is_comped BOOLEAN NOT NULL DEFAULT false;

-- Allow admin.html (anon key) to update is_comped and other user_settings fields
-- Mirrors the SELECT policy added in migration 012
CREATE POLICY "Admin users can update user_settings"
ON user_settings FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings' AND column_name = 'is_comped';
