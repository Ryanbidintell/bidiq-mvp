-- Migration 001: Add Subscription Tracking to user_settings
-- Purpose: Track subscription tiers, status, and acquisition source for admin metrics
-- Date: February 16, 2026

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'beta',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN user_settings.subscription_tier IS 'beta | starter | professional';
COMMENT ON COLUMN user_settings.subscription_status IS 'active | cancelled | past_due | trialing';
COMMENT ON COLUMN user_settings.acquisition_source IS 'network | linkedin | referral | google | forum | other';

-- Verify migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name IN ('subscription_tier', 'subscription_status', 'acquisition_source')
ORDER BY column_name;
