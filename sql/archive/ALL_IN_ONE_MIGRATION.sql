-- ============================================
-- BidIntell v1.6 - ALL-IN-ONE MIGRATION
-- Run this single file to set up everything
-- Created: February 5, 2026
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: BASE TABLES
-- ============================================

-- USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT,
    state TEXT,
    search_radius INTEGER DEFAULT 30,
    trades TEXT[],
    weights JSONB DEFAULT '{"location": 25, "keywords": 30, "gc": 25, "trade": 20}'::jsonb,
    risk_tolerance TEXT DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    capacity TEXT DEFAULT 'steady' CHECK (capacity IN ('slow', 'steady', 'aggressive')),
    default_stars INTEGER DEFAULT 3 CHECK (default_stars BETWEEN 1 AND 5),
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- GENERAL CONTRACTORS TABLE
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

CREATE INDEX IF NOT EXISTS idx_gcs_user_id ON general_contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_gcs_name ON general_contractors(name);
ALTER TABLE general_contractors ENABLE ROW LEVEL SECURITY;

-- KEYWORDS TABLE
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('good', 'risk')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, keyword, type)
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(type);
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    extracted_data JSONB,
    scores JSONB,
    outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'won', 'lost', 'ghost', 'declined')),
    outcome_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_outcome ON projects(outcome);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: ADD NEW COLUMNS FOR v1.6
-- ============================================

-- Company Type fields
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'subcontractor'
    CHECK (company_type IN ('subcontractor', 'distributor', 'manufacturer_rep'));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS provides_installation BOOLEAN DEFAULT true;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS product_lines TEXT[];

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS product_categories TEXT[];

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ghost_threshold_days INTEGER DEFAULT 60;

-- Project Fingerprinting
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_fingerprint ON projects(fingerprint) WHERE fingerprint IS NOT NULL;

-- Project GC Scores table
CREATE TABLE IF NOT EXISTS project_gc_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gc_id UUID NOT NULL REFERENCES general_contractors(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    recommendation TEXT CHECK (recommendation IN ('GO', 'REVIEW', 'PASS')),
    components JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gc_id)
);

CREATE INDEX IF NOT EXISTS idx_project_gc_scores_project ON project_gc_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_gc ON project_gc_scores(gc_id);

-- Beta Feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_company TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'ux', 'general')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_location TEXT,
    ease_of_use INTEGER CHECK (ease_of_use BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    would_recommend BOOLEAN,
    user_agent TEXT,
    screen_resolution TEXT,
    project_context JSONB,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: RLS POLICIES (DROP & RECREATE)
-- ============================================

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- General Contractors Policies
DROP POLICY IF EXISTS "Users can view own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can insert own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can update own GCs" ON general_contractors;
DROP POLICY IF EXISTS "Users can delete own GCs" ON general_contractors;

CREATE POLICY "Users can view own GCs" ON general_contractors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own GCs" ON general_contractors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own GCs" ON general_contractors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own GCs" ON general_contractors FOR DELETE USING (auth.uid() = user_id);

-- Keywords Policies
DROP POLICY IF EXISTS "Users can view own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can insert own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can delete own keywords" ON keywords;

CREATE POLICY "Users can view own keywords" ON keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON keywords FOR DELETE USING (auth.uid() = user_id);

-- Projects Policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Beta Feedback Policies
DROP POLICY IF EXISTS "Users can insert own feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Admin can view all feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Admin can update feedback" ON beta_feedback;

CREATE POLICY "Users can insert own feedback" ON beta_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON beta_feedback FOR SELECT USING (auth.uid() = user_id);

-- IMPORTANT: Replace YOUR_ADMIN_EMAIL with your actual admin email
CREATE POLICY "Admin can view all feedback" ON beta_feedback FOR SELECT
    USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL@example.com'));

CREATE POLICY "Admin can update feedback" ON beta_feedback FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL@example.com'));

-- ============================================
-- STEP 4: TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_general_contractors_updated_at ON general_contractors;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS beta_feedback_updated_at ON beta_feedback;

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_contractors_updated_at
    BEFORE UPDATE ON general_contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER beta_feedback_updated_at
    BEFORE UPDATE ON beta_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: BETA FEEDBACK UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_beta_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beta_feedback_updated_at_trigger ON beta_feedback;

CREATE TRIGGER beta_feedback_updated_at_trigger
    BEFORE UPDATE ON beta_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_beta_feedback_updated_at();

-- ============================================
-- ✅ MIGRATION COMPLETE!
-- ============================================

-- Verify everything was created:
SELECT
    'user_settings' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') as exists,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'company_type') as has_v16_fields
UNION ALL
SELECT
    'general_contractors',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'general_contractors'),
    true
UNION ALL
SELECT
    'keywords',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'keywords'),
    true
UNION ALL
SELECT
    'projects',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'projects'),
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'fingerprint')
UNION ALL
SELECT
    'beta_feedback',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'beta_feedback'),
    true
UNION ALL
SELECT
    'project_gc_scores',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'project_gc_scores'),
    true;

-- All rows should show TRUE for 'exists' and 'has_v16_fields'
