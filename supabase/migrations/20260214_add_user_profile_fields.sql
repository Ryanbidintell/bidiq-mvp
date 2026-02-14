-- Add user profile fields to user_settings table
-- Date: February 14, 2026

-- Add columns for user profile information
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_position TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.company_name IS 'Company/business name';
COMMENT ON COLUMN user_settings.user_name IS 'Full name of the user';
COMMENT ON COLUMN user_settings.user_email IS 'User contact email (may differ from auth email)';
COMMENT ON COLUMN user_settings.user_position IS 'Job title/position (e.g., Estimator, Project Manager)';
