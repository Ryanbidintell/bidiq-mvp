-- Migration: Follow-Up Automation — Week 1 Schema
-- Date: 2026-05-20
-- Purpose: Creates schema foundation for BidIntell follow-up automation feature.
--          Source of truth: BidIntell_FollowUp_Automation_Build_Spec_v1.md §6
-- Run in: Supabase SQL Editor (or via MCP)
-- ⚠️  DO NOT run on production without reviewing first.
--
-- Tables created:
--   1. follow_up_sequence_templates  — system + user template definitions
--   2. follow_up_sequence_steps       — step-by-step config per template
--   3. follow_up_schedules            — one row per bid's follow-up plan
--   4. follow_up_touches              — individual scheduled emails
--   5. user_email_integrations        — OAuth tokens for Gmail / M365
--
-- Columns added to existing tables:
--   projects: bid_submitted_at, gc_contact_email, gc_contact_name,
--             follow_up_schedule_id
--
-- Seeds 4 system templates ("Standard GC", "Public Bid", "Repeat Client",
-- "Aggressive") with their steps. System templates have user_id = NULL and
-- is_system_template = true; they're read-only and visible to all users.
--
-- Idempotent: safe to re-run via IF NOT EXISTS / ON CONFLICT guards.

-- ---------------------------------------------------------------------------
-- 1. follow_up_sequence_templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follow_up_sequence_templates (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
    -- NULL for system templates; user_id for user-created
  name                text         NOT NULL,
  description         text,
  is_default          boolean      DEFAULT false,
    -- Only one user template can be is_default = true per user (enforced via index)
  is_system_template  boolean      DEFAULT false,
  use_business_days   boolean      DEFAULT true,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT followup_template_name_length CHECK (char_length(name) <= 60),
  CONSTRAINT followup_template_system_no_user CHECK (
    (is_system_template = true AND user_id IS NULL)
    OR (is_system_template = false AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_followup_templates_user
  ON follow_up_sequence_templates(user_id);

-- Ensure only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_followup_templates_one_default_per_user
  ON follow_up_sequence_templates(user_id)
  WHERE is_default = true AND is_system_template = false;

ALTER TABLE follow_up_sequence_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS followup_templates_isolation ON follow_up_sequence_templates;
CREATE POLICY followup_templates_isolation
  ON follow_up_sequence_templates
  FOR ALL
  USING (user_id = auth.uid() OR is_system_template = true)
  WITH CHECK (user_id = auth.uid() AND is_system_template = false);
  -- WITH CHECK prevents users from creating system templates or impersonating others


-- ---------------------------------------------------------------------------
-- 2. follow_up_sequence_steps
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follow_up_sequence_steps (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          uuid         NOT NULL REFERENCES follow_up_sequence_templates(id) ON DELETE CASCADE,
  step_number          integer      NOT NULL,
  days_offset          integer      NOT NULL,
    -- Offset from bid_submitted_at; business or calendar days per template setting
  primary_principle    text         NOT NULL DEFAULT 'reciprocity',
  secondary_principle  text,
  custom_instruction   text,
  word_count_target    integer      DEFAULT 70,
  CONSTRAINT followup_step_number_range CHECK (step_number BETWEEN 1 AND 6),
  CONSTRAINT followup_step_days_positive CHECK (days_offset > 0),
  CONSTRAINT followup_step_primary_principle_valid CHECK (
    primary_principle IN (
      'reciprocity', 'commitment', 'social_proof',
      'liking', 'authority', 'scarcity', 'unity'
    )
  ),
  CONSTRAINT followup_step_secondary_principle_valid CHECK (
    secondary_principle IS NULL OR secondary_principle IN (
      'reciprocity', 'commitment', 'social_proof',
      'liking', 'authority', 'scarcity', 'unity'
    )
  ),
  CONSTRAINT followup_step_unique_per_template UNIQUE (template_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_followup_steps_template
  ON follow_up_sequence_steps(template_id, step_number);

ALTER TABLE follow_up_sequence_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS followup_steps_via_template ON follow_up_sequence_steps;
CREATE POLICY followup_steps_via_template
  ON follow_up_sequence_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM follow_up_sequence_templates t
      WHERE t.id = template_id
        AND (t.user_id = auth.uid() OR t.is_system_template = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM follow_up_sequence_templates t
      WHERE t.id = template_id
        AND t.user_id = auth.uid()
        AND t.is_system_template = false
    )
  );


-- ---------------------------------------------------------------------------
-- 3. follow_up_schedules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follow_up_schedules (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id            uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id        uuid         NOT NULL REFERENCES follow_up_sequence_templates(id),
  bid_submitted_at   timestamptz,
    -- NULL until user marks bid Submitted; activates the cadence
  status             text         NOT NULL DEFAULT 'inactive',
  cancelled_reason   text,
    -- Values: outcome_logged, user_cancelled, all_touches_sent, integration_failed
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT followup_schedule_status_valid CHECK (
    status IN ('inactive', 'active', 'completed', 'cancelled')
  ),
  CONSTRAINT followup_schedule_cancelled_reason_valid CHECK (
    cancelled_reason IS NULL OR cancelled_reason IN (
      'outcome_logged', 'user_cancelled', 'all_touches_sent', 'integration_failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_followup_schedules_project
  ON follow_up_schedules(project_id);

CREATE INDEX IF NOT EXISTS idx_followup_schedules_user_status
  ON follow_up_schedules(user_id, status);

ALTER TABLE follow_up_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS followup_schedules_isolation ON follow_up_schedules;
CREATE POLICY followup_schedules_isolation
  ON follow_up_schedules
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 4. follow_up_touches
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follow_up_touches (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id           uuid         NOT NULL REFERENCES follow_up_schedules(id) ON DELETE CASCADE,
  user_id               uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  touch_number          integer      NOT NULL,
  scheduled_at          timestamptz  NOT NULL,
  status                text         NOT NULL DEFAULT 'pending',
  primary_principle     text         NOT NULL,
  secondary_principle   text,
  draft_subject         text,
  draft_body            text,
  draft_reasoning       text,
    -- AI's one-sentence explanation of how the email applies the principle (QA only)
  user_edited_subject   text,
  user_edited_body      text,
  approved_at           timestamptz,
  sent_at               timestamptz,
  send_error            text,
    -- If status = 'failed', what went wrong (token data scrubbed)
  recipient_email       text         NOT NULL,
  recipient_name        text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT followup_touch_status_valid CHECK (
    status IN ('pending', 'awaiting_approval', 'approved', 'sent', 'skipped', 'cancelled', 'failed')
  ),
  CONSTRAINT followup_touch_number_range CHECK (touch_number BETWEEN 1 AND 6),
  CONSTRAINT followup_touch_principle_valid CHECK (
    primary_principle IN (
      'reciprocity', 'commitment', 'social_proof',
      'liking', 'authority', 'scarcity', 'unity'
    )
  ),
  CONSTRAINT followup_touch_unique_per_schedule UNIQUE (schedule_id, touch_number)
);

CREATE INDEX IF NOT EXISTS idx_followup_touches_schedule
  ON follow_up_touches(schedule_id, touch_number);

-- Used by the daily drafting cron to find touches due in the next 24h
CREATE INDEX IF NOT EXISTS idx_followup_touches_status_scheduled
  ON follow_up_touches(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_followup_touches_user_status
  ON follow_up_touches(user_id, status);

ALTER TABLE follow_up_touches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS followup_touches_isolation ON follow_up_touches;
CREATE POLICY followup_touches_isolation
  ON follow_up_touches
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 5. user_email_integrations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_email_integrations (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                 text         NOT NULL,
  email_address            text         NOT NULL,
  access_token_encrypted   text         NOT NULL,
  refresh_token_encrypted  text         NOT NULL,
  token_expires_at         timestamptz  NOT NULL,
  scopes_granted           text[]       NOT NULL,
  is_active                boolean      DEFAULT true,
  connected_at             timestamptz  NOT NULL DEFAULT now(),
  disconnected_at          timestamptz,
  last_send_at             timestamptz,
  total_sends              integer      DEFAULT 0,
  CONSTRAINT user_email_integration_provider_valid CHECK (
    provider IN ('google', 'microsoft')
  ),
  CONSTRAINT user_email_integration_unique_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_email_integrations_user
  ON user_email_integrations(user_id);

ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_email_integrations_isolation ON user_email_integrations;
CREATE POLICY user_email_integrations_isolation
  ON user_email_integrations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6. projects table additions
-- ---------------------------------------------------------------------------

-- bid_submitted_at already exists from outcome work; conditional add for safety.
-- gc_contact_* and follow_up_schedule_id are new.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS bid_submitted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS gc_contact_email      text,
  ADD COLUMN IF NOT EXISTS gc_contact_name       text,
  ADD COLUMN IF NOT EXISTS follow_up_schedule_id uuid REFERENCES follow_up_schedules(id);


-- ---------------------------------------------------------------------------
-- 7. Seed system templates
-- ---------------------------------------------------------------------------

-- Standard GC: 3 touches at Days 3 / 10 / 21, principles per spec §4
INSERT INTO follow_up_sequence_templates (id, user_id, name, description, is_system_template, use_business_days)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Standard GC',
  'Default 3-touch cadence for private commercial work',
  true,
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system_template = true,
      updated_at = now();

INSERT INTO follow_up_sequence_steps
  (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 3,  'reciprocity', 'liking',   60),
  ('00000000-0000-0000-0000-000000000001', 2, 10, 'commitment',  'unity',    80),
  ('00000000-0000-0000-0000-000000000001', 3, 21, 'authority',   'scarcity', 60)
ON CONFLICT (template_id, step_number) DO UPDATE
  SET days_offset = EXCLUDED.days_offset,
      primary_principle = EXCLUDED.primary_principle,
      secondary_principle = EXCLUDED.secondary_principle,
      word_count_target = EXCLUDED.word_count_target;


-- Public Bid: 2 touches at Days 14 / 30, slower cadence for public/government
INSERT INTO follow_up_sequence_templates (id, user_id, name, description, is_system_template, use_business_days)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  NULL,
  'Public Bid',
  'Slower 2-touch cadence for public and government bids',
  true,
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system_template = true,
      updated_at = now();

INSERT INTO follow_up_sequence_steps
  (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target)
VALUES
  ('00000000-0000-0000-0000-000000000002', 1, 14, 'reciprocity', NULL, 70),
  ('00000000-0000-0000-0000-000000000002', 2, 30, 'authority',   NULL, 60)
ON CONFLICT (template_id, step_number) DO UPDATE
  SET days_offset = EXCLUDED.days_offset,
      primary_principle = EXCLUDED.primary_principle,
      secondary_principle = EXCLUDED.secondary_principle,
      word_count_target = EXCLUDED.word_count_target;


-- Repeat Client: 1 light touch at Day 5
INSERT INTO follow_up_sequence_templates (id, user_id, name, description, is_system_template, use_business_days)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  NULL,
  'Repeat Client',
  'Single light-touch follow-up for established relationships',
  true,
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system_template = true,
      updated_at = now();

INSERT INTO follow_up_sequence_steps
  (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target)
VALUES
  ('00000000-0000-0000-0000-000000000003', 1, 5, 'liking', 'unity', 50)
ON CONFLICT (template_id, step_number) DO UPDATE
  SET days_offset = EXCLUDED.days_offset,
      primary_principle = EXCLUDED.primary_principle,
      secondary_principle = EXCLUDED.secondary_principle,
      word_count_target = EXCLUDED.word_count_target;


-- Aggressive: 4 touches at Days 2 / 7 / 14 / 28
INSERT INTO follow_up_sequence_templates (id, user_id, name, description, is_system_template, use_business_days)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  NULL,
  'Aggressive',
  '4-touch cadence for high-value or time-sensitive projects',
  true,
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system_template = true,
      updated_at = now();

INSERT INTO follow_up_sequence_steps
  (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target)
VALUES
  ('00000000-0000-0000-0000-000000000004', 1, 2,  'reciprocity',  NULL, 60),
  ('00000000-0000-0000-0000-000000000004', 2, 7,  'commitment',   NULL, 70),
  ('00000000-0000-0000-0000-000000000004', 3, 14, 'social_proof', NULL, 70),
  ('00000000-0000-0000-0000-000000000004', 4, 28, 'authority',    NULL, 60)
ON CONFLICT (template_id, step_number) DO UPDATE
  SET days_offset = EXCLUDED.days_offset,
      primary_principle = EXCLUDED.primary_principle,
      secondary_principle = EXCLUDED.secondary_principle,
      word_count_target = EXCLUDED.word_count_target;


-- ---------------------------------------------------------------------------
-- 8. Verification queries (read-only, safe to run alongside)
-- ---------------------------------------------------------------------------

-- New tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'follow_up_sequence_templates',
    'follow_up_sequence_steps',
    'follow_up_schedules',
    'follow_up_touches',
    'user_email_integrations'
  )
ORDER BY table_name;

-- New columns on projects
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN ('bid_submitted_at', 'gc_contact_email', 'gc_contact_name', 'follow_up_schedule_id')
ORDER BY column_name;

-- System templates seeded
SELECT t.name, t.use_business_days, COUNT(s.id) AS step_count
FROM follow_up_sequence_templates t
LEFT JOIN follow_up_sequence_steps s ON s.template_id = t.id
WHERE t.is_system_template = true
GROUP BY t.id, t.name, t.use_business_days
ORDER BY t.name;

-- RLS enabled on all new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'follow_up_sequence_templates',
    'follow_up_sequence_steps',
    'follow_up_schedules',
    'follow_up_touches',
    'user_email_integrations'
  )
ORDER BY tablename;
