-- Create beta_signups table for landing page beta applications
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS beta_signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  company_name text,
  trade text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  notes text -- admin notes
);

-- Enable RLS (but allow public inserts)
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public beta signup form)
CREATE POLICY "Allow public inserts" ON beta_signups
  FOR INSERT WITH CHECK (true);

-- Only authenticated users (admins) can read
CREATE POLICY "Allow admin reads" ON beta_signups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users (admins) can update status/notes
CREATE POLICY "Allow admin updates" ON beta_signups
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create index on email for faster duplicate checks
CREATE INDEX IF NOT EXISTS beta_signups_email_idx ON beta_signups(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS beta_signups_created_at_idx ON beta_signups(created_at DESC);

COMMENT ON TABLE beta_signups IS 'Landing page beta access applications';
COMMENT ON COLUMN beta_signups.status IS 'pending = awaiting review, approved = sent invite, rejected = declined';
