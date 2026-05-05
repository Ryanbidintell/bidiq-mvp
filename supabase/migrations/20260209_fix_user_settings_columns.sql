-- Fix user_settings table issues
-- Run this in Supabase SQL Editor

-- 1. Add missing street and zip columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT;

-- 2. Fix decision_time constraint - should allow INTEGER not just TEXT enum
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS valid_decision_time;

-- decision_time is now INTEGER (minutes) - no constraint needed
-- If your database has it as TEXT, we'll convert it
DO $$
BEGIN
    -- Check if decision_time column exists and is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings'
        AND column_name = 'decision_time'
        AND data_type = 'text'
    ) THEN
        -- First, drop the default
        ALTER TABLE user_settings ALTER COLUMN decision_time DROP DEFAULT;

        -- Convert TEXT values to INTEGER minutes
        UPDATE user_settings
        SET decision_time = CASE
            WHEN decision_time = 'quick' THEN '30'
            WHEN decision_time = 'thorough' THEN '90'
            ELSE '45'  -- 'normal' or any other value
        END::TEXT;

        -- Change column type to INTEGER
        ALTER TABLE user_settings
        ALTER COLUMN decision_time TYPE INTEGER USING decision_time::integer;

        -- Now set the INTEGER default
        ALTER TABLE user_settings ALTER COLUMN decision_time SET DEFAULT 45;
    END IF;
END $$;

-- Verify columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name IN ('street', 'zip', 'decision_time')
ORDER BY column_name;
