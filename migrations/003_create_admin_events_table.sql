-- Migration 003: Create admin_events Table
-- Purpose: Track key business events for admin metrics and analytics
-- Date: February 16, 2026

CREATE TABLE IF NOT EXISTS admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE admin_events IS 'Tracks signups, cancellations, upgrades, downgrades for admin metrics';
COMMENT ON COLUMN admin_events.event_type IS 'signup | cancellation | upgrade | downgrade | churn | reactivation | first_bid | outcome_recorded | score_override';

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_admin_events_user_id ON admin_events(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_event_type ON admin_events(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_events_created_at ON admin_events(created_at DESC);

-- RLS: Only the service role can read all events (admin use)
-- Individual users can insert their own events
ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
ON admin_events FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can read all events"
ON admin_events FOR SELECT
USING (auth.role() = 'service_role');

-- Verify migration
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'admin_events'
) AS table_exists;

SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'admin_events';
