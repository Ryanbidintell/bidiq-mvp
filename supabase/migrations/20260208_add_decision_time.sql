-- Add decision_time column to user_settings
-- Migration: 20260208_add_decision_time
-- Created: February 8, 2026

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS decision_time TEXT DEFAULT 'normal';

-- Add check constraint for valid values
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS valid_decision_time;

ALTER TABLE user_settings
ADD CONSTRAINT valid_decision_time
CHECK (decision_time IN ('quick', 'normal', 'thorough'));

-- Add comment
COMMENT ON COLUMN user_settings.decision_time IS 'How much time user takes for bid decisions: quick, normal, or thorough';
