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
