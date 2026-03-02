-- ROI Calculator Lead Capture Table
-- Run in Supabase SQL Editor
-- Safe to re-run — all statements are idempotent

CREATE TABLE IF NOT EXISTS roi_calculator_leads (
    id                           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email                        text NOT NULL,
    bids_per_year                integer,
    hours_per_bid                numeric,
    win_rate                     numeric,
    avg_project_value            numeric,
    net_margin                   numeric,
    calculated_savings           numeric,
    calculated_additional_margin numeric,
    source                       text DEFAULT 'landing_page_calculator',
    created_at                   timestamp with time zone DEFAULT now()
);

-- No RLS needed — this is a public lead capture table (anon inserts, no reads from frontend)
-- Grant anon insert only
ALTER TABLE roi_calculator_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert roi leads" ON roi_calculator_leads;
CREATE POLICY "Anyone can insert roi leads"
ON roi_calculator_leads FOR INSERT
WITH CHECK (true);
