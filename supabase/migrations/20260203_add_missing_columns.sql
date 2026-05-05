-- ============================================
-- Migration: Add missing weight columns to user_settings
-- Run this in Supabase SQL Editor
-- Date: February 3, 2026
-- ============================================

-- Add weight columns if they don't exist
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS weights_location INTEGER DEFAULT 25;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS weights_keywords INTEGER DEFAULT 30;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS weights_gc INTEGER DEFAULT 25;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS weights_trade INTEGER DEFAULT 20;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS decision_time INTEGER DEFAULT 45;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_stars INTEGER DEFAULT 3;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS ghost_timeline_days INTEGER DEFAULT 60;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name LIKE 'weights_%'
ORDER BY column_name;
