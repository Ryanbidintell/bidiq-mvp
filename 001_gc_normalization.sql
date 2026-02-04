-- Migration: GC Normalization Agent Tables
-- Version: 1.0
-- Date: February 3, 2026
-- Description: Adds tables and columns for GC name normalization with AI recommendations

-- ============================================
-- UPDATE gc_master TABLE
-- ============================================

-- Add columns for normalization workflow
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Add contact info fields for admin-curated data
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE gc_master ADD COLUMN IF NOT EXISTS address text;

-- Index for fast text search on GC names
CREATE INDEX IF NOT EXISTS idx_gc_master_name_search 
ON gc_master USING gin(to_tsvector('english', name));

-- Index for alias lookups
CREATE INDEX IF NOT EXISTS idx_gc_master_aliases 
ON gc_master USING gin(aliases);

-- ============================================
-- GC REVIEW QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gc_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Submission details
  submitted_name text NOT NULL,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  
  -- AI recommendation
  ai_recommendation text CHECK (ai_recommendation IN ('merge', 'new', 'delete')),
  ai_suggested_match uuid REFERENCES gc_master(id),
  ai_confidence float CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_reasoning text,
  
  -- Admin action
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'deleted')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_action text,
  
  -- Context
  original_project_id uuid,
  user_context jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_gc_review_queue_status 
ON gc_review_queue(status);

CREATE INDEX IF NOT EXISTS idx_gc_review_queue_submitted_at 
ON gc_review_queue(submitted_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on gc_review_queue
ALTER TABLE gc_review_queue ENABLE ROW LEVEL SECURITY;

-- Admin can see all queue items (you'll need to create an admin role)
CREATE POLICY "Admins can view all queue items" ON gc_review_queue
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin can update queue items
CREATE POLICY "Admins can update queue items" ON gc_review_queue
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can see their own submissions
CREATE POLICY "Users can view own submissions" ON gc_review_queue
  FOR SELECT
  USING (auth.uid() = submitted_by);

-- Anyone can insert to queue
CREATE POLICY "Authenticated users can submit" ON gc_review_queue
  FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- ============================================
-- GC MASTER RLS UPDATES
-- ============================================

-- Everyone can read approved GCs
CREATE POLICY "Anyone can read approved GCs" ON gc_master
  FOR SELECT
  USING (approved = true);

-- Users can read their own unapproved GCs
CREATE POLICY "Users can read own unapproved GCs" ON gc_master
  FOR SELECT
  USING (approved = false AND created_by = auth.uid());

-- Admins can read all GCs
CREATE POLICY "Admins can read all GCs" ON gc_master
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update any GC
CREATE POLICY "Admins can update GCs" ON gc_master
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can insert new GCs (unapproved by default)
CREATE POLICY "Users can insert GCs" ON gc_master
  FOR INSERT
  WITH CHECK (auth.uid() = created_by AND approved = false);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for gc_review_queue
DROP TRIGGER IF EXISTS update_gc_review_queue_updated_at ON gc_review_queue;
CREATE TRIGGER update_gc_review_queue_updated_at
  BEFORE UPDATE ON gc_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Mark existing GCs as approved
-- ============================================

-- If you have existing GCs, mark them all as approved
UPDATE gc_master SET approved = true WHERE approved IS NULL OR approved = false;

-- ============================================
-- ADMIN USER SETUP (Run manually for your account)
-- ============================================

-- To make yourself an admin, run this with your user ID:
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'your-email@example.com';
