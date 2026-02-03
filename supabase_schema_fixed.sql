-- ============================================
-- BidIQ Complete Database Schema - FIXED
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLEAN SLATE: Drop everything first
-- ============================================

-- Drop all policies first
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can update their own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can insert their own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can view their own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can update their own keywords" ON user_keywords;
DROP POLICY IF EXISTS "Users can insert their own keywords" ON user_keywords;
DROP POLICY IF EXISTS "Users can view their own keywords" ON user_keywords;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Anyone can view their own application by email" ON beta_applications;
DROP POLICY IF EXISTS "Anyone can submit beta application" ON beta_applications;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_beta_applications_updated_at ON beta_applications;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_general_contractors_updated_at ON general_contractors;
DROP TRIGGER IF EXISTS update_user_keywords_updated_at ON user_keywords;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all tables
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS general_contractors CASCADE;
DROP TABLE IF EXISTS user_keywords CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS beta_applications CASCADE;

-- ============================================
-- 1. BETA APPLICATIONS TABLE
-- ============================================
CREATE TABLE beta_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    primary_trade TEXT,
    service_area TEXT,
    monthly_bids TEXT,
    current_tools TEXT,
    pain_points TEXT,
    how_heard TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beta_applications_email ON beta_applications(email);
CREATE INDEX idx_beta_applications_status ON beta_applications(status);

-- ============================================
-- 2. USER SETTINGS TABLE
-- ============================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT,
    state TEXT,
    radius INTEGER DEFAULT 50,
    location_matters BOOLEAN DEFAULT true,
    trades TEXT[] DEFAULT ARRAY['23', '26'],
    risk_tolerance TEXT DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    capacity TEXT DEFAULT 'steady' CHECK (capacity IN ('hungry', 'steady', 'maxed')),
    weights_location INTEGER DEFAULT 25,
    weights_keywords INTEGER DEFAULT 30,
    weights_gc INTEGER DEFAULT 25,
    weights_trade INTEGER DEFAULT 20,
    decision_time INTEGER DEFAULT 45,
    default_stars INTEGER DEFAULT 3,
    ghost_timeline_days INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- 3. USER KEYWORDS TABLE
-- ============================================
CREATE TABLE user_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    good_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    bad_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_keywords_user_id ON user_keywords(user_id);

-- ============================================
-- 4. GENERAL CONTRACTORS TABLE
-- ============================================
CREATE TABLE general_contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rating INTEGER DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
    bids INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    risk_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_general_contractors_user_id ON general_contractors(user_id);
CREATE INDEX idx_general_contractors_name ON general_contractors(name);

-- ============================================
-- 5. PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    extracted_data JSONB DEFAULT '{}'::JSONB,
    scores JSONB DEFAULT '{}'::JSONB,
    gcs JSONB DEFAULT '[]'::JSONB,
    files TEXT[] DEFAULT ARRAY[]::TEXT[],
    good_found JSONB DEFAULT '[]'::JSONB,
    bad_found JSONB DEFAULT '[]'::JSONB,
    trades_found TEXT[] DEFAULT ARRAY[]::TEXT[],
    user_agreement TEXT DEFAULT 'agree' CHECK (user_agreement IN ('agree', 'too_high', 'too_low')),
    user_agreement_note TEXT,
    outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'won', 'lost', 'ghost', 'declined')),
    outcome_data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_outcome ON projects(outcome);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- User keywords policies
CREATE POLICY "Users can view their own keywords"
    ON user_keywords FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keywords"
    ON user_keywords FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords"
    ON user_keywords FOR UPDATE
    USING (auth.uid() = user_id);

-- General contractors policies
CREATE POLICY "Users can view their own GCs"
    ON general_contractors FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GCs"
    ON general_contractors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GCs"
    ON general_contractors FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GCs"
    ON general_contractors FOR DELETE
    USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Beta applications policies
CREATE POLICY "Anyone can submit beta application"
    ON beta_applications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view their own application by email"
    ON beta_applications FOR SELECT
    USING (true);

-- ============================================
-- 7. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_keywords_updated_at
    BEFORE UPDATE ON user_keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_contractors_updated_at
    BEFORE UPDATE ON general_contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beta_applications_updated_at
    BEFORE UPDATE ON beta_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT 'Schema setup complete!' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('beta_applications', 'user_settings', 'user_keywords', 'general_contractors', 'projects')
ORDER BY table_name;
