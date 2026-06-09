-- Migration: Company Context Snapshot + Company Size / Typical Project Size
-- Date: June 9, 2026
-- Purpose: Make every analyzed bid self-describing for time-series / Phase-B
--          intelligence. Two parts:
--   1. projects.company_context (jsonb) — a frozen snapshot of the user's
--      operating context AT THE MOMENT OF THE BID (capacity, size, trades,
--      risk tolerance, etc.). user_settings is overwrite-in-place, so without
--      this snapshot we lose the ability to know what the company looked like
--      when each historical bid was made. Cannot be backfilled — start now.
--   2. user_settings.company_size + typical_project_size — Tier-1 company
--      context the data model requires but the schema never captured. Bucketed
--      (never raw headcount/revenue) per the "least sensitive signal" rule.
--
-- Safe to re-run (idempotent). Existing rows get NULL — that's correct
-- (we simply didn't know these values yet), and CHECK passes on NULL.

-- 1. Per-bid company context snapshot --------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS company_context JSONB;

COMMENT ON COLUMN projects.company_context IS
  'Snapshot of the user''s operating context at the time this bid was analyzed (capacity, company_size, typical_project_size, risk_tolerance, trades, search_radius, target_margin, office city/state). Frozen for time-series analysis — never updated after insert.';

-- 2. Company size bucket (employees) ---------------------------------------
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS company_size TEXT;

COMMENT ON COLUMN user_settings.company_size IS
  'Bucketed employee count: 1-10 | 11-25 | 26-50 | 51-100 | 100+ (null = not set). Bucketed by design — never store exact headcount.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_company_size_check'
  ) THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_company_size_check
      CHECK (company_size IS NULL OR company_size IN
        ('1-10', '11-25', '26-50', '51-100', '100+'));
  END IF;
END $$;

-- 3. Typical project size band ---------------------------------------------
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS typical_project_size TEXT;

COMMENT ON COLUMN user_settings.typical_project_size IS
  'Bucketed typical project size: <250k | 250k-1m | 1m-5m | 5m-20m | 20m+ (null = not set). Range band, never exact dollars.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_typical_project_size_check'
  ) THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_typical_project_size_check
      CHECK (typical_project_size IS NULL OR typical_project_size IN
        ('<250k', '250k-1m', '1m-5m', '5m-20m', '20m+'));
  END IF;
END $$;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'projects' AND column_name = 'company_context')
    OR (table_name = 'user_settings' AND column_name IN ('company_size', 'typical_project_size')))
ORDER BY table_name, column_name;
