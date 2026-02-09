-- Add street and zip columns to user_settings table
-- Migration: 20260205_add_street_zip_columns
-- Created: February 5, 2026

-- Add street and zip columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN user_settings.street IS 'User office street address (optional, for more accurate distance calculations)';
COMMENT ON COLUMN user_settings.zip IS 'User office ZIP code (optional)';
