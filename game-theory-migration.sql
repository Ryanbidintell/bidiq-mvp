-- Game Theory Intelligence Modules Migration
-- Run in Supabase SQL Editor
-- Safe to re-run — all statements are idempotent

-- Module 1: Track which CSI divisions were submitted
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS bid_divisions_submitted TEXT[] DEFAULT '{}';

-- Module 4: Store per-GC competition density data
CREATE TABLE IF NOT EXISTS gc_competition_density (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gc_name text NOT NULL,
    building_type text,
    bidder_count integer NOT NULL CHECK (bidder_count > 0),
    outcome text NOT NULL,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE gc_competition_density ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gc_competition_density'
        AND policyname = 'Users can manage their own competition data'
    ) THEN
        CREATE POLICY "Users can manage their own competition data"
        ON gc_competition_density FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gc_competition_user ON gc_competition_density(user_id);
CREATE INDEX IF NOT EXISTS idx_gc_competition_gc_name ON gc_competition_density(gc_name);
