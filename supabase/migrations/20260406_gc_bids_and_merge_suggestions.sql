-- Migration: Multi-GC bid support + merge suggestions
-- Date: 2026-04-06

-- 1. Add gc_bids column to projects
--    Stores per-GC scores, files, outcomes for multi-GC projects
--    Each entry: { gc_name, scores, files, contract_risks, bid_due_date,
--                  estimated_value, source, outcome, outcome_data, email_from, email_subject }
--    Outcome values: 'pending' | 'won' | 'lost' | 'lost_competitor' | 'declined' | 'ghost'
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS gc_bids jsonb DEFAULT '[]'::jsonb;

-- 2. Create merge_suggestions table
--    Tracks potential project merges detected from inbound emails
CREATE TABLE IF NOT EXISTS merge_suggestions (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    target_project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    confidence  text        NOT NULL DEFAULT 'medium',   -- 'high' | 'medium' | 'low'
    reason      text,
    same_gc     boolean     DEFAULT true,
    gc_name     text,
    status      text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
    created_at  timestamptz DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS merge_suggestions_user_status
    ON merge_suggestions (user_id, status);
CREATE INDEX IF NOT EXISTS merge_suggestions_source
    ON merge_suggestions (source_project_id);
CREATE INDEX IF NOT EXISTS merge_suggestions_target
    ON merge_suggestions (target_project_id);

-- RLS
ALTER TABLE merge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own merge suggestions"
    ON merge_suggestions FOR ALL
    USING (user_id = auth.uid());
