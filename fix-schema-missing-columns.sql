-- ============================================
-- FIX SCHEMA: Add Missing Columns to Projects Table
-- Run this in Supabase SQL Editor
-- Date: February 7, 2026
--
-- SAFE: Uses IF NOT EXISTS, won't break existing data
-- ============================================

-- Add all missing columns that app.html expects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS gcs JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS files TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS full_text TEXT,
ADD COLUMN IF NOT EXISTS outcome_data JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS good_found JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS bad_found JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS trades_found TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS user_agreement TEXT DEFAULT 'agree' CHECK (user_agreement IN ('agree', 'too_high', 'too_low')),
ADD COLUMN IF NOT EXISTS user_agreement_note TEXT,
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS market_metro_area TEXT,
ADD COLUMN IF NOT EXISTS building_type TEXT,
ADD COLUMN IF NOT EXISTS contract_risks JSONB,
ADD COLUMN IF NOT EXISTS validation_status JSONB DEFAULT '{"complete": false, "missing_fields": []}'::JSONB,
ADD COLUMN IF NOT EXISTS intelligence_tags JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS ai_advisor_output TEXT,
ADD COLUMN IF NOT EXISTS created_year INTEGER,
ADD COLUMN IF NOT EXISTS created_month INTEGER,
ADD COLUMN IF NOT EXISTS created_week INTEGER;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_outcome ON projects(outcome);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_fingerprint ON projects(fingerprint);
CREATE INDEX IF NOT EXISTS idx_projects_building_type ON projects(building_type);
CREATE INDEX IF NOT EXISTS idx_projects_intelligence_tags ON projects USING GIN (intelligence_tags);

-- Enable Row Level Security if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist (users can only see their own projects)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'projects'
        AND policyname = 'Users can view their own projects'
    ) THEN
        CREATE POLICY "Users can view their own projects"
            ON projects FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'projects'
        AND policyname = 'Users can insert their own projects'
    ) THEN
        CREATE POLICY "Users can insert their own projects"
            ON projects FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'projects'
        AND policyname = 'Users can update their own projects'
    ) THEN
        CREATE POLICY "Users can update their own projects"
            ON projects FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'projects'
        AND policyname = 'Users can delete their own projects'
    ) THEN
        CREATE POLICY "Users can delete their own projects"
            ON projects FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('gcs', 'files', 'full_text', 'outcome_data', 'good_found',
                      'bad_found', 'trades_found', 'user_agreement', 'user_agreement_note',
                      'fingerprint', 'market_metro_area', 'building_type', 'contract_risks',
                      'validation_status', 'intelligence_tags', 'ai_advisor_output',
                      'created_year', 'created_month', 'created_week')
ORDER BY column_name;

-- Show table info
SELECT
    'Total columns in projects table:' AS info,
    COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'projects';
