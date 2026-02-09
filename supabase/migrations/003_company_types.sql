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
