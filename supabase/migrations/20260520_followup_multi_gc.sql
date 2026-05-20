-- Migration: Multi-GC follow-up support
-- Date: 2026-05-20
-- Purpose: Each follow-up schedule is now tied to a specific GC submission
--          on the project (not just to the project). Lets the user run
--          different follow-up cadences to different GCs on the same bid.
-- Run in: Supabase SQL Editor (or via MCP — already applied to prod)
--
-- Schema impact:
--   follow_up_schedules.gc_name TEXT — denormalized GC name for fast
--   lookup and display without joining outcome_data->bid_submissions JSON.
--   Old schedules created in the single-GC iteration will have NULL here;
--   that's fine — they keep working as project-level schedules.

ALTER TABLE follow_up_schedules
  ADD COLUMN IF NOT EXISTS gc_name TEXT;

-- Partial index: fast "is there already an active schedule for this GC?" check
CREATE INDEX IF NOT EXISTS idx_followup_schedules_project_gc
  ON follow_up_schedules(project_id, gc_name)
  WHERE status = 'active';

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'follow_up_schedules'
  AND column_name = 'gc_name';
