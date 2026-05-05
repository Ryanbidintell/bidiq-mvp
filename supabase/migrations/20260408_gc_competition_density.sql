-- Migration 010: gc_competition_density table
-- Stores per-bid competitive pressure data for Competitive Pressure Score (Phase 1.5)
-- Written by outcome form when user records bidder count + outcome

CREATE TABLE IF NOT EXISTS gc_competition_density (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gc_name TEXT NOT NULL,
    building_type TEXT,
    bidder_count INTEGER NOT NULL CHECK (bidder_count > 0),
    outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gc_competition_density ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own competition data"
    ON gc_competition_density FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competition data"
    ON gc_competition_density FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_gc_competition_density_user_gc
    ON gc_competition_density(user_id, gc_name);
