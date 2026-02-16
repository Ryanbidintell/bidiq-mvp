-- Migration 002: Add Outcome Tracking Fields to projects
-- Purpose: Track outcome decisions, confidence, and user overrides for intelligence layer
-- Date: February 16, 2026

-- Check if columns already exist (some may have been added in previous migrations)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS outcome_reason TEXT,
ADD COLUMN IF NOT EXISTS decision_confidence INTEGER,
ADD COLUMN IF NOT EXISTS user_override_direction TEXT,
ADD COLUMN IF NOT EXISTS user_override_score INTEGER;

COMMENT ON COLUMN projects.outcome IS 'won | lost | ghost | didnt_bid | pending';
COMMENT ON COLUMN projects.decision_confidence IS '1-5 scale, how confident in outcome';
COMMENT ON COLUMN projects.user_override_direction IS 'up | down | null — did user think score was too high or too low';
COMMENT ON COLUMN projects.user_override_score IS 'User-provided score if they disagreed with AI score';

-- Verify migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('outcome', 'outcome_date', 'decision_confidence', 'user_override_direction')
ORDER BY column_name;
