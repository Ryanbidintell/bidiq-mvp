-- Founder outreach tracker — warm-pipeline tracking surfaced on admin.html (founder dashboard).
-- Applied to prod via MCP apply_migration on 2026-06-16.
-- Admin-only (RLS by email), additive. Reversible: DROP TABLE founder_outreach;

CREATE TABLE IF NOT EXISTS founder_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text,
  contact_email text,
  channel text,                                  -- call | email | linkedin | referral | in-person
  status text NOT NULL DEFAULT 'to_contact',     -- to_contact | contacted | in_conversation | meeting_set | won | passed | stalled
  last_touch_at date,
  next_step text,
  next_step_date date,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE founder_outreach ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'founder_outreach' AND policyname = 'Admins manage outreach') THEN
    CREATE POLICY "Admins manage outreach" ON founder_outreach
      FOR ALL
      USING (auth.email() IN ('ryan@fsikc.com','ryan@bidintell.ai'))
      WITH CHECK (auth.email() IN ('ryan@fsikc.com','ryan@bidintell.ai'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_founder_outreach_status ON founder_outreach(status);
