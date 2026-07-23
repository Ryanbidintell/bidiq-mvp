-- Per-contractor prevailing-wage preference (Jul 23 2026).
-- want | neutral | avoid — tunes THIS contractor's BidIndex when a bid requires
-- prevailing/union wages. Additive, nullable, app-defaulted to 'neutral'.
-- NO CHECK constraint on purpose (see the Jul 22 typical_project_size incident:
-- a strict enum CHECK that the form value didn't match rejected the whole
-- user_settings upsert). The app is the source of truth for the 3 values.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prevailing_wage_pref TEXT DEFAULT 'neutral';
