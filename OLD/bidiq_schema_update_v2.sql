-- ============================================
-- BidIQ Schema Update v2 - Data Moat Features
-- Run this in Supabase SQL Editor after initial schema
-- ============================================

-- Add risk_tags column to general_contractors
ALTER TABLE general_contractors 
ADD COLUMN IF NOT EXISTS risk_tags TEXT[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN general_contractors.risk_tags IS 'User-defined risk tags: slow_pay, pay_if_paid, change_order_hostile, bid_shopping, low_feedback, scope_creep';

-- ============================================
-- Done! Your GC table now supports risk tags.
-- ============================================
