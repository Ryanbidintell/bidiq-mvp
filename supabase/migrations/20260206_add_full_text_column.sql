-- Add full_text column to projects table for re-analysis
-- Migration: 20260206_add_full_text_column
-- Created: February 6, 2026

-- Add full_text column to store original document text
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Add comment
COMMENT ON COLUMN projects.full_text IS 'Full text content from uploaded documents for re-analysis with updated extraction prompts';
