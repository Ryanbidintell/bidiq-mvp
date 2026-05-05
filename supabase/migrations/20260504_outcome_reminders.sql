-- Migration: Outcome reminder snooze + attribution tracking
-- BID-2: Automated outcome logging reminders
-- Safe to run multiple times (IF NOT EXISTS guards)

-- projects: per-bid snooze (user clicked "Remind me in 7 days" link in email)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome_snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_reminder_token text;

-- Unique index on token so we can look up by it
CREATE UNIQUE INDEX IF NOT EXISTS projects_outcome_reminder_token_idx
  ON projects (outcome_reminder_token)
  WHERE outcome_reminder_token IS NOT NULL;

-- For attribution: track when the most recent reminder was sent per bid
-- (last_nudge_sent_at already exists from migration 009; this is an alias doc comment)

-- user_settings: ensure outcome_reminder_days column exists with correct default
-- (already added in 20260410_outcome_nudge.sql, but safe to re-run)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS outcome_reminder_days integer DEFAULT 21;

-- Verify
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'user_settings')
  AND column_name IN (
    'outcome_nudge_count',
    'last_nudge_sent_at',
    'outcome_reminder_days',
    'outcome_snooze_until',
    'outcome_reminder_token'
  )
ORDER BY table_name, column_name;
