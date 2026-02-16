-- Migration 004: Create admin_metrics_snapshots Table
-- Purpose: Daily rollup of key metrics for trend analysis
-- Date: February 16, 2026

CREATE TABLE IF NOT EXISTS admin_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  paid_users INTEGER DEFAULT 0,
  beta_users INTEGER DEFAULT 0,
  starter_users INTEGER DEFAULT 0,
  professional_users INTEGER DEFAULT 0,
  mrr_cents INTEGER DEFAULT 0,
  new_signups_today INTEGER DEFAULT 0,
  cancellations_today INTEGER DEFAULT 0,
  bids_analyzed_today INTEGER DEFAULT 0,
  outcomes_recorded_today INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE admin_metrics_snapshots IS 'Daily snapshots of key metrics for admin dashboard trend analysis';
COMMENT ON COLUMN admin_metrics_snapshots.mrr_cents IS 'Monthly Recurring Revenue in cents for precision';
COMMENT ON COLUMN admin_metrics_snapshots.snapshot_date IS 'Date this snapshot represents (unique per day)';

-- Create index for fast queries by date
CREATE INDEX IF NOT EXISTS idx_admin_metrics_date ON admin_metrics_snapshots(snapshot_date DESC);

-- No RLS needed — this table is only accessed via service role / admin
ALTER TABLE admin_metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
ON admin_metrics_snapshots FOR ALL
USING (auth.role() = 'service_role');

-- Verify migration
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'admin_metrics_snapshots'
) AS table_exists;

SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'admin_metrics_snapshots';
