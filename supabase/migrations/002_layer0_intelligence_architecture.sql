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
