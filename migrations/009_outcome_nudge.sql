-- Migration 009: Outcome nudge tracking
-- Adds per-bid nudge counters to projects, and reminder preference to user_settings
-- Run in Supabase SQL Editor AFTER reviewing DATA_SAFETY_PROTOCOL.md
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING guards)

-- projects: track how many times a nudge was sent for this bid, and when
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome_nudge_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at timestamptz;

-- user_settings: store the user's preferred reminder window (null = use default 21)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS outcome_reminder_days integer DEFAULT 21;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'user_settings')
  AND column_name IN ('outcome_nudge_count', 'last_nudge_sent_at', 'outcome_reminder_days')
ORDER BY table_name, column_name;
