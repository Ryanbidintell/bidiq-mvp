-- Migration: GC identity keys on gc_competition_density
-- Date: June 9, 2026
-- Purpose: Capture a normalized company key + metro/office disambiguator on every
--          competition-density row, so the data becomes aggregatable BOTH ways:
--            GROUP BY gc_key            -> company-wide (all Turner offices)
--            GROUP BY gc_key, gc_metro  -> office-level (Turner-KC vs Turner-Boston)
--          Also powers per-user "which office do they usually bid?" learning.
--          Additive + idempotent. gc_name (free text) is preserved untouched.

ALTER TABLE gc_competition_density
  ADD COLUMN IF NOT EXISTS gc_key TEXT,
  ADD COLUMN IF NOT EXISTS gc_metro TEXT;

COMMENT ON COLUMN gc_competition_density.gc_key IS
  'Normalized company name (app.html normalizeCompanyName). Company-level aggregation key: GROUP BY gc_key = company-wide rollup.';
COMMENT ON COLUMN gc_competition_density.gc_metro IS
  'Metro/office disambiguator captured at write time (project metro). GROUP BY gc_key, gc_metro = office-level (e.g. Turner-KC vs Turner-Boston).';

-- Indexes for the per-user office-affinity learning queries
CREATE INDEX IF NOT EXISTS idx_gc_density_user_key
  ON gc_competition_density(user_id, gc_key);
CREATE INDEX IF NOT EXISTS idx_gc_density_user_key_metro
  ON gc_competition_density(user_id, gc_key, gc_metro);
