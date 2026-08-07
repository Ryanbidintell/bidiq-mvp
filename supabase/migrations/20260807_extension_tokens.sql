-- 20260807_extension_tokens.sql
-- Chrome extension auth tokens.
--
-- Apply via the Supabase MCP `apply_migration` tool or the SQL Editor.
-- Do NOT run `supabase db push` (see CLAUDE.md — the tracking table is
-- intentionally incomplete and the CLI would replay ~50 historical files).
--
-- Design notes:
--  * Only the sha256 hash of the token is stored. The raw `bix_...` value is
--    returned to the extension exactly once and never persisted server-side.
--  * `expires_at` is NOT NULL with a 180-day default so a leaked token has a
--    bounded lifetime. The auth check in the edge function tests it.
--  * `revoked_at` is a soft delete (per DATA_SAFETY_PROTOCOL) — Disconnect sets
--    it rather than deleting the row, so we keep the audit trail.
--  * No `extension_source` column is added to `projects`. The existing pattern
--    is a `source` key inside the `extracted_data` / `scores` jsonb (today
--    'email_forward'); the extension path writes 'chrome_extension' there.

CREATE TABLE IF NOT EXISTS extension_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  text NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
    last_used_at timestamptz,
    revoked_at  timestamptz,
    label       text
);

CREATE INDEX IF NOT EXISTS idx_extension_tokens_user_id ON extension_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_tokens_hash    ON extension_tokens(token_hash);

ALTER TABLE extension_tokens ENABLE ROW LEVEL SECURITY;

-- Users can see and revoke their own tokens. Inserts happen server-side only
-- (service role, from netlify/functions/extension-token.js), so no INSERT policy
-- is granted to authenticated/anon.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'extension_tokens'
          AND policyname = 'Users can view own extension tokens'
    ) THEN
        CREATE POLICY "Users can view own extension tokens"
            ON extension_tokens FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'extension_tokens'
          AND policyname = 'Users can revoke own extension tokens'
    ) THEN
        CREATE POLICY "Users can revoke own extension tokens"
            ON extension_tokens FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;
