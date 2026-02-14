-- Create billing and subscription tracking tables
-- Date: February 14, 2026

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER REVENUE TABLE
-- Tracks subscription and billing information
-- ============================================
CREATE TABLE IF NOT EXISTS user_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe IDs
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,

    -- Subscription details
    plan_name TEXT DEFAULT 'Free Beta',
    mrr DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'past_due', 'inactive')),

    -- Beta period tracking
    beta_user BOOLEAN DEFAULT true,
    beta_end_date TIMESTAMPTZ DEFAULT '2026-04-01 00:00:00+00',

    -- Billing dates
    billing_cycle_anchor TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_revenue_user_id ON user_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_user_revenue_stripe_customer ON user_revenue(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_revenue_stripe_subscription ON user_revenue(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_revenue_status ON user_revenue(status);

-- Comments
COMMENT ON TABLE user_revenue IS 'Tracks user subscriptions and billing status';
COMMENT ON COLUMN user_revenue.beta_user IS 'True if user signed up during beta period';
COMMENT ON COLUMN user_revenue.beta_end_date IS 'When beta period ends (default: April 1, 2026)';
COMMENT ON COLUMN user_revenue.mrr IS 'Monthly Recurring Revenue in dollars';

-- ============================================
-- SUBSCRIPTION HISTORY TABLE
-- Tracks all subscription changes for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL,
    old_plan TEXT,
    new_plan TEXT,
    old_mrr DECIMAL(10,2),
    new_mrr DECIMAL(10,2),

    -- Metadata
    stripe_event_id TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);

COMMENT ON TABLE subscription_history IS 'Audit log of all subscription changes';

-- ============================================
-- RLS POLICIES
-- ============================================

-- user_revenue: Users can only read their own revenue data
ALTER TABLE user_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own revenue"
    ON user_revenue FOR SELECT
    USING (auth.uid() = user_id);

-- subscription_history: Users can read their own history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription history"
    ON subscription_history FOR SELECT
    USING (auth.uid() = user_id);
