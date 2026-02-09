-- Add Intelligence Engine fields to user_settings and projects tables
-- Migration: 20260206_add_intelligence_engine_fields
-- Created: February 6, 2026

-- Add AI advisor preferences to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS ai_advisor_name TEXT DEFAULT 'Sam',
ADD COLUMN IF NOT EXISTS ai_advisor_tone TEXT DEFAULT 'supportive';

-- Add comments
COMMENT ON COLUMN user_settings.ai_advisor_name IS 'User preferred AI advisor name (Sam, Scout, Jake, etc.)';
COMMENT ON COLUMN user_settings.ai_advisor_tone IS 'User preferred AI advisor tone (supportive, straight_shooter, data_nerd)';

-- Add Intelligence Engine tracking to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS score_agreement_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS intelligence_tags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_advisor_output TEXT,
ADD COLUMN IF NOT EXISTS validation_status JSONB DEFAULT '{"complete": false, "missing_fields": []}';

-- Add comments
COMMENT ON COLUMN projects.score_agreement_timestamp IS 'When user provided feedback on score accuracy';
COMMENT ON COLUMN projects.intelligence_tags IS 'Analytics tags for Layer 1-3 intelligence (company_type, trade, building_type, etc.)';
COMMENT ON COLUMN projects.ai_advisor_output IS 'Personalized AI advisor response shown to user';
COMMENT ON COLUMN projects.validation_status IS 'Data validation results for analytics readiness';

-- Create index on intelligence_tags for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_intelligence_tags ON projects USING GIN (intelligence_tags);

-- Create index on validation_status for analytics queries
CREATE INDEX IF NOT EXISTS idx_projects_validation_status ON projects USING GIN (validation_status);
