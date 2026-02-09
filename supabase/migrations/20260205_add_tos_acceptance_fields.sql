-- Add Terms of Service and Privacy Policy acceptance tracking fields
-- Migration: 20260205_add_tos_acceptance_fields
-- Created: February 5, 2026

-- Add TOS acceptance columns to user_settings table (this is the user profile table)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tos_version TEXT,
ADD COLUMN IF NOT EXISTS privacy_version TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN user_settings.tos_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN user_settings.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';
COMMENT ON COLUMN user_settings.tos_version IS 'Version of Terms accepted (date format: YYYY-MM-DD)';
COMMENT ON COLUMN user_settings.privacy_version IS 'Version of Privacy Policy accepted (date format: YYYY-MM-DD)';

-- Create a function to handle new user signup and populate TOS acceptance from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_tos()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user_settings record with TOS acceptance data from auth metadata
    INSERT INTO public.user_settings (
        user_id,
        tos_accepted_at,
        privacy_accepted_at,
        tos_version,
        privacy_version
    ) VALUES (
        NEW.id,
        (NEW.raw_user_meta_data->>'tos_accepted_at')::timestamptz,
        (NEW.raw_user_meta_data->>'privacy_accepted_at')::timestamptz,
        NEW.raw_user_meta_data->>'tos_version',
        NEW.raw_user_meta_data->>'privacy_version'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tos_accepted_at = COALESCE(user_settings.tos_accepted_at, EXCLUDED.tos_accepted_at),
        privacy_accepted_at = COALESCE(user_settings.privacy_accepted_at, EXCLUDED.privacy_accepted_at),
        tos_version = COALESCE(user_settings.tos_version, EXCLUDED.tos_version),
        privacy_version = COALESCE(user_settings.privacy_version, EXCLUDED.privacy_version);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to populate user_settings with TOS acceptance
DROP TRIGGER IF EXISTS on_auth_user_created_tos ON auth.users;
CREATE TRIGGER on_auth_user_created_tos
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_tos();

-- NOTE: TOS acceptance data is also stored in auth.users.raw_user_meta_data during signup
-- This trigger copies it to user_settings for easier querying and reporting
