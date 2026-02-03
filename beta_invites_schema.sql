-- ============================================
-- Beta Invites Table for Founder Dashboard
-- Run this in Supabase SQL Editor
-- ============================================

-- Create beta invites table
CREATE TABLE IF NOT EXISTS beta_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_code TEXT UNIQUE NOT NULL,
    email TEXT,
    created_by TEXT DEFAULT 'founder',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    first_used_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_beta_invites_code ON beta_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_beta_invites_email ON beta_invites(email);
CREATE INDEX IF NOT EXISTS idx_beta_invites_active ON beta_invites(is_active);

-- Enable RLS
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if a code is valid (for login)
CREATE POLICY "Anyone can validate invite codes"
    ON beta_invites FOR SELECT
    USING (true);

-- Policy: Only authenticated admins can insert/update/delete
-- For now, allow all authenticated users (tighten in production)
CREATE POLICY "Authenticated users can manage invites"
    ON beta_invites FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert initial founder access code
INSERT INTO beta_invites (invite_code, email, notes, created_at)
VALUES
    ('FOUNDER2026', 'ryan@bidintell.ai', 'Founder access - permanent', NOW())
ON CONFLICT (invite_code) DO NOTHING;

-- Success message
SELECT 'Beta invites table created successfully!' as message;
