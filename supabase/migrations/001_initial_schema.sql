-- ============================================
-- Migration 001: Initial Database Schema
-- Created: February 5, 2026
-- Purpose: Create base tables for BidIntell
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Location settings
    city TEXT,
    state TEXT,
    search_radius INTEGER DEFAULT 30,

    -- Trade/work settings
    trades TEXT[],

    -- Scoring weights
    weights JSONB DEFAULT '{"location": 25, "keywords": 30, "gc": 25, "trade": 20}'::jsonb,

    -- User preferences
    risk_tolerance TEXT DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    capacity TEXT DEFAULT 'steady' CHECK (capacity IN ('slow', 'steady', 'aggressive')),
    default_stars INTEGER DEFAULT 3 CHECK (default_stars BETWEEN 1 AND 5),

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. GENERAL CONTRACTORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS general_contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rating INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
    bids INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    risk_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gcs_user_id ON general_contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_gcs_name ON general_contractors(name);

-- Enable RLS
ALTER TABLE general_contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for general_contractors
CREATE POLICY "Users can view own GCs"
    ON general_contractors FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GCs"
    ON general_contractors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GCs"
    ON general_contractors FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own GCs"
    ON general_contractors FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. KEYWORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('good', 'risk')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, keyword, type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(type);

-- Enable RLS
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keywords
CREATE POLICY "Users can view own keywords"
    ON keywords FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keywords"
    ON keywords FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own keywords"
    ON keywords FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Extracted data from PDF
    extracted_data JSONB,

    -- Scores
    scores JSONB,

    -- Outcome tracking
    outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'won', 'lost', 'ghost', 'declined')),
    outcome_data JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_outcome ON projects(outcome);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_contractors_updated_at
    BEFORE UPDATE ON general_contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_settings IS 'Stores user preferences, scoring weights, and onboarding status';
COMMENT ON TABLE general_contractors IS 'User-specific GC relationships with ratings and win rates';
COMMENT ON TABLE keywords IS 'User-defined good terms and risk terms for bid analysis';
COMMENT ON TABLE projects IS 'Analyzed bid documents with scores and outcomes';

COMMENT ON COLUMN user_settings.weights IS 'JSONB object with location, keywords, gc, trade weights (must sum to 100)';
COMMENT ON COLUMN user_settings.risk_tolerance IS 'How conservative user is with contract risks (low/medium/high)';
COMMENT ON COLUMN user_settings.capacity IS 'How much work user can take on (slow/steady/aggressive)';

COMMENT ON COLUMN projects.extracted_data IS 'JSONB containing project_name, city, state, building_type, general_contractor, etc.';
COMMENT ON COLUMN projects.scores IS 'JSONB containing bidindex_score, recommendation, and score_components';
COMMENT ON COLUMN projects.outcome_data IS 'JSONB containing outcome-specific data (contract_amount, margin, etc.)';
