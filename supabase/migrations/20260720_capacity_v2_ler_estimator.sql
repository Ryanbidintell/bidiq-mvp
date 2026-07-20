-- ============================================================================
-- BidIntell Capacity v2 — labor-efficiency financial model + estimator role
-- ============================================================================
-- Part A: rebuild the money layer on a labor-efficiency-ratio (LER) waterfall
--   (gross margin → contribution margin → pretax), two labor buckets
--   (direct field vs management), owner comp, profit-target revenue math.
-- Part B: estimators as pursuit-side labor (demand from pipeline bid due dates).
-- Additive only — no columns dropped. Existing cost_class is retained; the new
-- labor_bucket is backfilled from it so current data keeps working.
-- Applied via MCP apply_migration. DO NOT `db push`.
-- ============================================================================

-- Part A — company financial assumptions
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS owner_comp_annual      NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS gm_basis               TEXT    NOT NULL DEFAULT 'before'; -- 'before' | 'after' field labor
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS profit_target_pct      NUMERIC NOT NULL DEFAULT 0.10;
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS direct_ler_target      NUMERIC NOT NULL DEFAULT 2.0;
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS mgmt_ler_target        NUMERIC NOT NULL DEFAULT 3.0;
ALTER TABLE cap_settings ADD COLUMN IF NOT EXISTS coverage_floor_months  NUMERIC NOT NULL DEFAULT 2;
-- NOTE: existing monthly_fixed_overhead is repurposed as the non-labor opex line
-- (below management labor in the waterfall) — no schema change, UI relabel only.

-- Part A — two-bucket labor classification, backfilled from cost_class
ALTER TABLE cap_people ADD COLUMN IF NOT EXISTS labor_bucket TEXT; -- 'direct' | 'management'
UPDATE cap_people SET labor_bucket = CASE WHEN cost_class='variable' THEN 'direct' ELSE 'management' END WHERE labor_bucket IS NULL;

-- Part B — estimating (pursuit-side labor)
ALTER TABLE cap_settings      ADD COLUMN IF NOT EXISTS estimating_templates    JSONB   NOT NULL DEFAULT '[]'::jsonb; -- [{trade,size_band,doc_band,hours,window_weeks}]
ALTER TABLE cap_settings      ADD COLUMN IF NOT EXISTS estimating_window_weeks  INTEGER NOT NULL DEFAULT 2;
ALTER TABLE cap_opportunities ADD COLUMN IF NOT EXISTS estimating_hours         NUMERIC;   -- per-bid override
ALTER TABLE cap_opportunities ADD COLUMN IF NOT EXISTS pricing_window_weeks     INTEGER;   -- per-bid override
-- ============================================================================
