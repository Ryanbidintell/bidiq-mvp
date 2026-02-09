-- =====================================================
-- BIDINTELL DATABASE MIGRATIONS - CLEAN SLATE
-- =====================================================
-- Generated: 2026-02-08T00:39:51.627Z
-- This version drops all existing objects first
-- Then executes all migrations on a clean database
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- =====================================================

-- Drop all views
DROP VIEW IF EXISTS v_projects_by_market CASCADE;
DROP VIEW IF EXISTS v_projects_by_trade CASCADE;
DROP VIEW IF EXISTS v_projects_time_series CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings CASCADE;
DROP TRIGGER IF EXISTS update_general_contractors_updated_at ON general_contractors CASCADE;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects CASCADE;
DROP TRIGGER IF EXISTS beta_feedback_updated_at ON beta_feedback CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_tos ON auth.users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS validate_outcome_data(jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS update_beta_feedback_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_tos() CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS user_revenue CASCADE;
DROP TABLE IF EXISTS api_usage CASCADE;
DROP TABLE IF EXISTS project_gc_scores CASCADE;
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS general_contractors CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- =====================================================
-- STEP 2: EXECUTE ALL MIGRATIONS
-- =====================================================


-- =====================================================
-- MIGRATION 1/11: 001_initial_schema
-- =====================================================

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


-- =====================================================
-- MIGRATION 2/11: 002_layer0_intelligence_architecture
-- =====================================================

-- ============================================
-- Layer 0 Intelligence Architecture Migration
-- Adds market, time-series, and confidence tracking
-- Required for Intelligence Layer Framework (Product Bible v1.5)
-- ============================================

-- ============================================
-- TIER 1: Company Context (Required for Layer 0)
-- Based on BidIntell Company-Level Data Model
-- ============================================

-- Add company profile fields to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_size VARCHAR(20) CHECK (company_size IN ('1-10', '11-25', '26-50', '51-100', '100+'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS typical_project_size VARCHAR(20) CHECK (typical_project_size IN ('<$250k', '$250k-$1M', '$1M-$5M', '$5M-$20M', '$20M+'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS service_metros TEXT[]; -- Multiple metro areas

-- Add TIER 2 decision context tracking
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_capacity_update TIMESTAMPTZ;

-- Add onboarding completion tracking
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- ============================================
-- Layer 0 Intelligence Columns (Projects Table)
-- ============================================

-- Add Layer 0 columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS market_metro_area VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_type VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_risks JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outcome_confidence INTEGER CHECK (outcome_confidence >= 1 AND outcome_confidence <= 5);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS decline_reasons TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trades_found TEXT[];

-- Add TIER 3 performance signals
ALTER TABLE projects ADD COLUMN IF NOT EXISTS margin_band VARCHAR(20) CHECK (margin_band IN ('<10%', '10-20%', '20-30%', '30%+'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS time_to_outcome_days INTEGER;

-- Add time-series helper columns for fast querying
-- Note: These are regular columns, not generated, to avoid immutability issues
-- They will be populated by the application when creating projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_year INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_month INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_week INTEGER;

-- Backfill existing projects with time-series data
UPDATE projects
SET created_year = EXTRACT(YEAR FROM created_at::date),
    created_month = EXTRACT(MONTH FROM created_at::date),
    created_week = EXTRACT(WEEK FROM created_at::date)
WHERE created_year IS NULL;

-- Add indexes for fast Layer 1-3 intelligence queries
CREATE INDEX IF NOT EXISTS idx_projects_market_time ON projects(user_id, market_metro_area, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_trade_time ON projects(user_id, trades_found, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_building_type ON projects(building_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_year_month ON projects(created_year, created_month);
CREATE INDEX IF NOT EXISTS idx_projects_outcome_confidence ON projects(outcome, outcome_confidence);

-- Add comment documentation
COMMENT ON COLUMN projects.market_metro_area IS 'Metro area derived from project location (e.g., "Kansas City Metro", "Denver Metro") - required for Layer 2 market intelligence';
COMMENT ON COLUMN projects.building_type IS 'AI-extracted building classification: hospital, office, multifamily, retail, industrial, education, other';
COMMENT ON COLUMN projects.contract_risks IS 'AI-detected contract risks with severity and confidence scores: pay-if-paid, liquidated damages, indemnification, no damages for delay, etc.';
COMMENT ON COLUMN projects.outcome_confidence IS 'User confidence in outcome accuracy (1=unsure, 5=very confident) - used to weight training data';
COMMENT ON COLUMN projects.decline_reasons IS 'Structured decline reasons: too_many_gcs, gc_relationship, bad_contract, out_of_territory, capacity, pricing, scope_unclear, products_not_specified, other';

-- Create outcome_data structure validation function
CREATE OR REPLACE FUNCTION validate_outcome_data(data JSONB, outcome_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Won outcome requires: final_amount, margin_percent
    IF outcome_type = 'won' THEN
        RETURN data ? 'final_amount' AND data ? 'margin_percent';
    END IF;

    -- Lost outcome requires: how_high, winner (optional), other_competitors (optional)
    IF outcome_type = 'lost' THEN
        RETURN data ? 'how_high';
    END IF;

    -- Ghosted outcome requires: days_since_submission
    IF outcome_type = 'ghost' THEN
        RETURN data ? 'days_since_submission';
    END IF;

    -- Declined doesn't require outcome_data (uses decline_reasons array instead)
    IF outcome_type = 'declined' THEN
        RETURN TRUE;
    END IF;

    -- Pending doesn't require validation
    IF outcome_type = 'pending' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint for outcome_data structure
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_outcome_data_structure;
ALTER TABLE projects ADD CONSTRAINT check_outcome_data_structure
    CHECK (validate_outcome_data(outcome_data, outcome) = TRUE);

-- Add constraint: decline_reasons required when outcome = declined
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_decline_reasons_required;
ALTER TABLE projects ADD CONSTRAINT check_decline_reasons_required
    CHECK (outcome != 'declined' OR (decline_reasons IS NOT NULL AND array_length(decline_reasons, 1) > 0));

-- Add constraint: outcome_confidence required when outcome != pending
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_outcome_confidence_required;
ALTER TABLE projects ADD CONSTRAINT check_outcome_confidence_required
    CHECK (outcome = 'pending' OR outcome_confidence IS NOT NULL);

-- Create helper view for market intelligence (Layer 2 prep)
CREATE OR REPLACE VIEW v_projects_by_market AS
SELECT
    market_metro_area,
    building_type,
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE outcome = 'won') as wins,
    COUNT(*) FILTER (WHERE outcome = 'lost') as losses,
    COUNT(*) FILTER (WHERE outcome = 'ghost') as ghosted,
    COUNT(*) FILTER (WHERE outcome = 'declined') as declined,
    ROUND(AVG(CASE WHEN outcome != 'pending' THEN (scores->>'final')::INTEGER END), 1) as avg_score,
    ROUND(AVG(outcome_confidence), 2) as avg_confidence
FROM projects
WHERE outcome != 'pending'
GROUP BY market_metro_area, building_type;

-- Create helper view for trade intelligence (Layer 2 prep)
CREATE OR REPLACE VIEW v_projects_by_trade AS
SELECT
    user_id,
    unnest(trades_found) as trade,
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE outcome = 'won') as wins,
    COUNT(*) FILTER (WHERE outcome = 'lost') as losses,
    ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'won') / NULLIF(COUNT(*) FILTER (WHERE outcome IN ('won', 'lost')), 0), 1) as win_rate
FROM projects
WHERE trades_found IS NOT NULL AND array_length(trades_found, 1) > 0
GROUP BY user_id, trade;

-- Create helper view for time-series analytics (Layer 1-3 prep)
CREATE OR REPLACE VIEW v_projects_time_series AS
SELECT
    user_id,
    created_year,
    created_month,
    created_week,
    COUNT(*) as projects_count,
    COUNT(*) FILTER (WHERE outcome = 'won') as wins,
    COUNT(*) FILTER (WHERE outcome = 'lost') as losses,
    ROUND(AVG((scores->>'final')::INTEGER), 1) as avg_score,
    ROUND(AVG(outcome_confidence), 2) as avg_confidence
FROM projects
GROUP BY user_id, created_year, created_month, created_week
ORDER BY created_year DESC, created_month DESC, created_week DESC;

-- Success message
SELECT 'Layer 0 Intelligence Architecture migration complete!' as message,
       'Added: market_metro_area, building_type, outcome_confidence, decline_reasons[]' as columns,
       'Added: Time-series indexes, validation constraints, aggregation views' as infrastructure;


-- =====================================================
-- MIGRATION 3/11: 003_company_types
-- =====================================================

-- Migration 003: Company Types & Product Match
-- Created: February 5, 2026
-- Purpose: Add company type selection and product match scoring for distributors/mfg reps

-- Add company type fields to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'subcontractor'
    CHECK (company_type IN ('subcontractor', 'distributor', 'manufacturer_rep')),
  ADD COLUMN IF NOT EXISTS provides_installation BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_lines TEXT[],
  ADD COLUMN IF NOT EXISTS product_categories TEXT[];

-- Add ghost threshold for passive ghost trigger
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ghost_threshold_days INTEGER DEFAULT 60;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.company_type IS 'Type of company: subcontractor, distributor, or manufacturer_rep';
COMMENT ON COLUMN user_settings.provides_installation IS 'Whether company provides installation labor (for distributors/mfg reps)';
COMMENT ON COLUMN user_settings.product_lines IS 'Array of brands/product lines carried (for distributors/mfg reps)';
COMMENT ON COLUMN user_settings.product_categories IS 'Array of product categories (electrical, HVAC, etc.)';
COMMENT ON COLUMN user_settings.ghost_threshold_days IS 'Number of days before a project is auto-marked as ghosted';

-- Update default score weights based on company type
-- This will be handled in application logic, but we document the defaults here:
-- Subcontractor: Location 25%, Keywords 30%, GC 25%, Trade 20%
-- Distributor: Location 15%, Keywords 30%, GC 25%, Product 30%
-- Mfg Rep: Location 10%, Keywords 25%, GC 25%, Product 40%


-- =====================================================
-- MIGRATION 4/11: 004_project_fingerprinting
-- =====================================================

-- Migration 004: Project Fingerprinting & Duplicate Detection
-- Created: February 5, 2026
-- Purpose: Detect duplicate projects and store GC-specific scores

-- Add fingerprint column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index on fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_fingerprint ON projects(fingerprint) WHERE fingerprint IS NOT NULL;

-- Create table for storing GC-specific scores
CREATE TABLE IF NOT EXISTS project_gc_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gc_id UUID NOT NULL REFERENCES general_contractors(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    recommendation TEXT CHECK (recommendation IN ('GO', 'REVIEW', 'PASS')),
    components JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gc_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_project ON project_gc_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_gc ON project_gc_scores(gc_id);

-- Add comments for documentation
COMMENT ON COLUMN projects.fingerprint IS 'Normalized hash of project_name + city + state for duplicate detection';
COMMENT ON COLUMN projects.is_duplicate IS 'Whether this project was detected as a duplicate of an earlier upload';
COMMENT ON COLUMN projects.original_project_id IS 'Reference to the original project if this is a duplicate';
COMMENT ON TABLE project_gc_scores IS 'Stores per-GC scores for projects with multiple GCs bidding';


-- =====================================================
-- MIGRATION 5/11: 005_beta_feedback
-- =====================================================

-- Migration 005: Beta Feedback Widget
-- Created: February 5, 2026
-- Purpose: Collect structured feedback from beta testers

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_company TEXT,

    -- Feedback content
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'ux', 'general')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_location TEXT, -- Which page/feature they were using

    -- Rating fields
    ease_of_use INTEGER CHECK (ease_of_use BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    would_recommend BOOLEAN,

    -- Context data
    user_agent TEXT,
    screen_resolution TEXT,
    project_context JSONB, -- Optional: context about what they were analyzing

    -- Status tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_beta_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beta_feedback_updated_at
    BEFORE UPDATE ON beta_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_beta_feedback_updated_at();

-- Add RLS policies
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON beta_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON beta_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE beta_feedback IS 'Stores feedback from beta testers';
COMMENT ON COLUMN beta_feedback.feedback_type IS 'Category: bug, feature request, UX issue, or general';
COMMENT ON COLUMN beta_feedback.page_location IS 'Which page/feature they were using when submitting feedback';
COMMENT ON COLUMN beta_feedback.project_context IS 'Optional context about the project they were analyzing';


-- =====================================================
-- MIGRATION 6/11: 20260205_add_street_zip_columns
-- =====================================================

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


-- =====================================================
-- MIGRATION 7/11: 20260205_add_tos_acceptance_fields
-- =====================================================

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


-- =====================================================
-- MIGRATION 8/11: 20260206_add_full_text_column
-- =====================================================

-- Add full_text column to projects table for re-analysis
-- Migration: 20260206_add_full_text_column
-- Created: February 6, 2026

-- Add full_text column to store original document text
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Add comment
COMMENT ON COLUMN projects.full_text IS 'Full text content from uploaded documents for re-analysis with updated extraction prompts';


-- =====================================================
-- MIGRATION 9/11: 20260206_add_intelligence_engine_fields
-- =====================================================

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


-- =====================================================
-- MIGRATION 10/11: 20260207_add_api_usage_tracking
-- =====================================================

-- Add API usage tracking for cost and profitability analysis
-- Migration: 20260207_add_api_usage_tracking
-- Created: February 7, 2026

-- Create api_usage table to track all API calls
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    api_provider TEXT NOT NULL, -- 'anthropic', 'openai'
    model TEXT NOT NULL, -- 'claude-sonnet-4.5', 'claude-haiku-4', 'gpt-4o', etc.
    operation TEXT NOT NULL, -- 'extraction', 'intelligence', 'chat', 'contract_analysis'
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0, -- Cost in USD
    latency_ms INTEGER, -- Response time in milliseconds
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_provider ON api_usage(api_provider);

-- Add comment
COMMENT ON TABLE api_usage IS 'Tracks all API calls for cost analysis and profitability monitoring';

-- Create user_revenue table to track Stripe payments
CREATE TABLE IF NOT EXISTS user_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT, -- 'free', 'pro', 'enterprise'
    mrr DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Monthly Recurring Revenue
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_revenue_user_id ON user_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_user_revenue_stripe_customer_id ON user_revenue(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_revenue_status ON user_revenue(status);

COMMENT ON TABLE user_revenue IS 'Tracks user revenue and Stripe subscription data for profitability analysis';


-- =====================================================
-- MIGRATION 11/11: 20260207_add_client_types
-- =====================================================

-- Add client type tracking to general contractors table
-- Migration: 20260207_add_client_types
-- Created: February 7, 2026

-- Add client_type column to general_contractors table
ALTER TABLE general_contractors
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'gc';

-- Add comment
COMMENT ON COLUMN general_contractors.client_type IS 'Type of client: gc, subcontractor, developer, or municipality';

-- Add check constraint to ensure valid client types
ALTER TABLE general_contractors
ADD CONSTRAINT valid_client_type CHECK (client_type IN ('gc', 'subcontractor', 'developer', 'municipality'));

-- Add index for querying by client type
CREATE INDEX IF NOT EXISTS idx_general_contractors_client_type ON general_contractors(client_type);

-- Add client_types array to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS client_types TEXT[] DEFAULT ARRAY['gcs'];

-- Add comment
COMMENT ON COLUMN user_settings.client_types IS 'Array of client types the user works with: gcs, subcontractors, developers, municipalities';


-- =====================================================
-- STEP 3: RECORD MIGRATION EXECUTION
-- =====================================================

-- Create tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record all migrations
INSERT INTO schema_migrations (version, executed_at) VALUES
    ('001_initial_schema', NOW()),
    ('002_layer0_intelligence_architecture', NOW()),
    ('003_company_types', NOW()),
    ('004_project_fingerprinting', NOW()),
    ('005_beta_feedback', NOW()),
    ('20260205_add_street_zip_columns', NOW()),
    ('20260205_add_tos_acceptance_fields', NOW()),
    ('20260206_add_full_text_column', NOW()),
    ('20260206_add_intelligence_engine_fields', NOW()),
    ('20260207_add_api_usage_tracking', NOW()),
    ('20260207_add_client_types', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();

-- =====================================================
-- SUCCESS! MIGRATION COMPLETE
-- =====================================================

-- Show summary
SELECT
    'Migration completed successfully!' as status,
    COUNT(*) as total_migrations,
    MIN(executed_at) as started_at,
    MAX(executed_at) as completed_at
FROM schema_migrations;

-- List all tables created
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
