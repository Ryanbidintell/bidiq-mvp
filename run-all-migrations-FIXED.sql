-- ═══════════════════════════════════════════════════════════════════
-- BIDINTELL CONSOLIDATED MIGRATION SCRIPT (FIXED FOR CLIENTS TABLE)
-- Run this in Supabase SQL Editor to apply all pending migrations
-- Date: February 12, 2026
-- ═══════════════════════════════════════════════════════════════════

-- ===================================================================
-- MIGRATION 1: Add full_text column to projects table
-- File: 20260206_add_full_text_column.sql
-- ===================================================================

-- Add full_text column to store original document text
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Add comment
COMMENT ON COLUMN projects.full_text IS 'Full text content from uploaded documents for re-analysis with updated extraction prompts';

-- ===================================================================
-- MIGRATION 2: Add API usage tracking
-- File: 20260207_add_api_usage_tracking.sql
-- ===================================================================

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

-- ===================================================================
-- MIGRATION 3: Add client types to CLIENTS table (FIXED)
-- File: 20260207_add_client_types.sql
-- ===================================================================

-- Add client_type column to CLIENTS table (not general_contractors)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'general_contractor';

-- Add comment
COMMENT ON COLUMN clients.client_type IS 'Type of client: general_contractor, subcontractor, end_user, building_owner, municipality, distributor, manufacturer_rep';

-- Add check constraint to ensure valid client types (drop first in case it exists)
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS valid_client_type;

ALTER TABLE clients
DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
ADD CONSTRAINT clients_client_type_check CHECK (client_type IN ('general_contractor', 'subcontractor', 'end_user', 'building_owner', 'municipality', 'distributor', 'manufacturer_rep'));

-- Add index for querying by client type
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);

-- Add client_types array to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS client_types TEXT[] DEFAULT ARRAY['general_contractor'];

-- Add comment
COMMENT ON COLUMN user_settings.client_types IS 'Array of client types the user works with: general_contractor, subcontractor, end_user, building_owner, municipality, distributor, manufacturer_rep';

-- ===================================================================
-- MIGRATION 4: Add decision_time column
-- File: 20260208_add_decision_time.sql
-- ===================================================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS decision_time TEXT DEFAULT 'normal';

-- Add check constraint for valid values (drop first in case it exists)
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS valid_decision_time;

ALTER TABLE user_settings
ADD CONSTRAINT valid_decision_time
CHECK (decision_time IN ('quick', 'normal', 'thorough'));

-- Add comment
COMMENT ON COLUMN user_settings.decision_time IS 'How much time user takes for bid decisions: quick, normal, or thorough';

-- ===================================================================
-- MIGRATION 5: Add onboarding columns to user_settings
-- File: 20260208_add_onboarding_columns.sql
-- ===================================================================

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

-- NOTE: client_types was already added in migration 3, but we include IF NOT EXISTS for safety
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
COMMENT ON COLUMN user_settings.client_types IS 'Types of clients typically worked with (general_contractor, subcontractor, end_user, building_owner, municipality, distributor, manufacturer_rep)';
COMMENT ON COLUMN user_settings.ai_advisor_name IS 'Personalized name for AI advisor';
COMMENT ON COLUMN user_settings.ai_advisor_tone IS 'Personality tone of AI advisor recommendations';

-- ═══════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE!
-- All 5 migrations have been applied successfully.
-- ═══════════════════════════════════════════════════════════════════
