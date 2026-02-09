-- ============================================
-- BidIQ Beta Application System Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Beta Applications Table
CREATE TABLE IF NOT EXISTS beta_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    primary_trade TEXT NOT NULL,
    other_trades TEXT[],
    service_area TEXT NOT NULL,
    monthly_bids INTEGER,
    current_tools TEXT,
    pain_points TEXT,
    how_heard TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist')),
    admin_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_beta_applications_status ON beta_applications(status);
CREATE INDEX IF NOT EXISTS idx_beta_applications_email ON beta_applications(email);

-- RLS Policies
ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public applications)
CREATE POLICY "Anyone can submit beta application" ON beta_applications
    FOR INSERT WITH CHECK (true);

-- Allow anyone to check if their email exists (for duplicate check)
CREATE POLICY "Anyone can check their application status" ON beta_applications
    FOR SELECT USING (true);

-- Only authenticated admins can update (we'll check admin status in app)
CREATE POLICY "Admins can update applications" ON beta_applications
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Admin users table (simple approach - list of admin emails)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Ryan as admin (update email if different)
INSERT INTO admin_users (email) VALUES ('hello@bidintell.ai')
ON CONFLICT (email) DO NOTHING;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM admin_users WHERE email = user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Email notification setup (optional - for Supabase Edge Functions)
-- You can trigger emails via webhooks or Edge Functions
-- ============================================

-- Trigger function for new applications (optional)
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
    -- This can be extended to call an Edge Function for email
    -- For now, just update the timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on insert
DROP TRIGGER IF EXISTS on_beta_application_insert ON beta_applications;
CREATE TRIGGER on_beta_application_insert
    BEFORE INSERT ON beta_applications
    FOR EACH ROW EXECUTE FUNCTION notify_new_application();

-- ============================================
-- Useful queries for admin dashboard
-- ============================================

-- Get pending applications count
-- SELECT COUNT(*) FROM beta_applications WHERE status = 'pending';

-- Get all pending applications
-- SELECT * FROM beta_applications WHERE status = 'pending' ORDER BY created_at DESC;

-- Approve an application
-- UPDATE beta_applications SET status = 'approved', approved_at = NOW() WHERE id = 'uuid-here';

-- Get approved users for the week
-- SELECT * FROM beta_applications WHERE status = 'approved' AND approved_at > NOW() - INTERVAL '7 days';
