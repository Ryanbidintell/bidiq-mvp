-- Migration: gc_master canonical registry with company → office hierarchy
-- Date: June 9, 2026
-- Purpose: Cross-user canonical GC identity. Each company has one row
--          (metro_key='') and each office is a child row (metro_key=<metro>,
--          parent_id → company). Enables:
--            office-level   = a specific gc_master office row (Turner-KC)
--            company-wide    = COALESCE(parent_id, id) rollup (all Turner offices)
--
-- NOTE: the earlier supabase/migrations/20260203_gc_normalization.sql (which
-- ALTERed a gc_master table) was never applied — no gc_master existed. This is
-- the from-scratch build. Dedup is on (gc_key, metro_key) so client upserts are
-- idempotent. Exact-key matching only; fuzzy cross-user alias merging + admin
-- review queue remain a later layer.

CREATE TABLE IF NOT EXISTS gc_master (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gc_key       text NOT NULL,                       -- normalizeCompanyName() — the match key
    metro_key    text NOT NULL DEFAULT '',            -- '' = company-level; else the office metro
    name         text NOT NULL,                       -- display company name
    metro_area   text,                                -- display metro (null for company rows)
    parent_id    uuid REFERENCES gc_master(id) ON DELETE SET NULL,
    entity_level text NOT NULL DEFAULT 'company' CHECK (entity_level IN ('company', 'office')),
    aliases      text[] DEFAULT '{}',
    created_by   uuid REFERENCES auth.users(id),
    approved     boolean DEFAULT true,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),
    UNIQUE (gc_key, metro_key)
);

CREATE INDEX IF NOT EXISTS idx_gc_master_parent ON gc_master(parent_id);

-- Shared reference data: any authenticated user can read all + insert (records
-- they create). No UPDATE/DELETE policy → those are denied for regular users
-- (admin curation comes later). Inserts use ON CONFLICT DO NOTHING client-side,
-- so the insert-only policy is sufficient.
ALTER TABLE gc_master ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gc_master' AND policyname='gc_master read all') THEN
    CREATE POLICY "gc_master read all" ON gc_master FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gc_master' AND policyname='gc_master insert own') THEN
    CREATE POLICY "gc_master insert own" ON gc_master FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- Link competition-density rows to the canonical office (best-effort, nullable).
ALTER TABLE gc_competition_density
  ADD COLUMN IF NOT EXISTS gc_master_office_id uuid REFERENCES gc_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gc_density_master_office
  ON gc_competition_density(gc_master_office_id);
