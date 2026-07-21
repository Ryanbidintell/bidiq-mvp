-- 20260721_pursuit_pipeline.sql
-- Item 2 (pursuit pipeline board): adds a pursuit-stage column to projects so the
-- admin-gated Pipeline board in app.html can group bids as a Kanban.
-- Additive + idempotent + non-destructive. Applied to prod via Supabase MCP
-- apply_migration (NOT db push — per CLAUDE.md migration workflow).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS triage_status text NOT NULL DEFAULT 'invited';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_triage_status_check') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_triage_status_check
      CHECK (triage_status IN ('invited','reviewed','pricing','submitted',
                               'clarifications','awarded','lost','ghosted','archived'));
  END IF;
END $$;

-- Backfill so the board reflects history; only touches rows still at the default.
UPDATE projects SET triage_status = CASE outcome
    WHEN 'won' THEN 'awarded' WHEN 'lost' THEN 'lost' WHEN 'gc_lost' THEN 'lost'
    WHEN 'ghost' THEN 'ghosted' WHEN 'declined' THEN 'archived' WHEN 'no_bid' THEN 'archived'
    ELSE triage_status END
  WHERE outcome IS NOT NULL AND outcome <> 'pending' AND triage_status = 'invited';

CREATE INDEX IF NOT EXISTS idx_projects_user_triage ON projects (user_id, triage_status);
