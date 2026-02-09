-- Add client type tracking to general contractors table
-- Migration: 20260207_add_client_types
-- Created: February 7, 2026

-- Add client_type column to general_contractors table
ALTER TABLE general_contractors
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'gc';

-- Add comment
COMMENT ON COLUMN general_contractors.client_type IS 'Type of client: gc, subcontractor, developer, or municipality';

-- Add check constraint to ensure valid client types
ALTER TABLE general_contractors
ADD CONSTRAINT valid_client_type CHECK (client_type IN ('gc', 'subcontractor', 'developer', 'municipality'));

-- Add index for querying by client type
CREATE INDEX IF NOT EXISTS idx_general_contractors_client_type ON general_contractors(client_type);

-- Add client_types array to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS client_types TEXT[] DEFAULT ARRAY['gcs'];

-- Add comment
COMMENT ON COLUMN user_settings.client_types IS 'Array of client types the user works with: gcs, subcontractors, developers, municipalities';
