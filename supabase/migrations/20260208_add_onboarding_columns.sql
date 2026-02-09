-- Migration: Add missing onboarding columns to user_settings
-- Date: 2026-02-08

-- Add company profile columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS company_type TEXT CHECK (company_type IN ('subcontractor', 'distributor', 'manufacturer_rep'));

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS provides_installation BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS product_lines TEXT[];

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS product_categories TEXT[];

-- Add location preference
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS location_matters BOOLEAN DEFAULT true;

-- Add client type tracking
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS client_types TEXT[];

-- Add AI advisor personalization
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS ai_advisor_name TEXT DEFAULT 'Sam';

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS ai_advisor_tone TEXT DEFAULT 'supportive' CHECK (ai_advisor_tone IN ('supportive', 'straight_shooter', 'data_nerd'));

-- Add comments for clarity
COMMENT ON COLUMN user_settings.company_type IS 'Type of company: subcontractor, distributor, or manufacturer rep';
COMMENT ON COLUMN user_settings.provides_installation IS 'Whether company provides installation services';
COMMENT ON COLUMN user_settings.product_lines IS 'List of product brands/lines carried (for distributors/mfg reps)';
COMMENT ON COLUMN user_settings.product_categories IS 'Product categories carried (electrical, lighting, hvac, etc)';
COMMENT ON COLUMN user_settings.location_matters IS 'Whether project location is important for this user';
COMMENT ON COLUMN user_settings.client_types IS 'Types of clients typically worked with (gcs, subcontractors, developers, municipalities)';
COMMENT ON COLUMN user_settings.ai_advisor_name IS 'Personalized name for AI advisor';
COMMENT ON COLUMN user_settings.ai_advisor_tone IS 'Personality tone of AI advisor recommendations';
