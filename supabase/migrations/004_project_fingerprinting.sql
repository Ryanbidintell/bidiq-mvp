-- Migration 004: Project Fingerprinting & Duplicate Detection
-- Created: February 5, 2026
-- Purpose: Detect duplicate projects and store GC-specific scores

-- Add fingerprint column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index on fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_fingerprint ON projects(fingerprint) WHERE fingerprint IS NOT NULL;

-- Create table for storing GC-specific scores
CREATE TABLE IF NOT EXISTS project_gc_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gc_id UUID NOT NULL REFERENCES general_contractors(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    recommendation TEXT CHECK (recommendation IN ('GO', 'REVIEW', 'PASS')),
    components JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gc_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_project ON project_gc_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_project_gc_scores_gc ON project_gc_scores(gc_id);

-- Add comments for documentation
COMMENT ON COLUMN projects.fingerprint IS 'Normalized hash of project_name + city + state for duplicate detection';
COMMENT ON COLUMN projects.is_duplicate IS 'Whether this project was detected as a duplicate of an earlier upload';
COMMENT ON COLUMN projects.original_project_id IS 'Reference to the original project if this is a duplicate';
COMMENT ON TABLE project_gc_scores IS 'Stores per-GC scores for projects with multiple GCs bidding';
