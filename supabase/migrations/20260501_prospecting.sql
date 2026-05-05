-- Migration: Outbound prospecting agent
-- Date: 2026-05-01
-- Tracks prospects, sequence state, and funnel events for BID-13

CREATE TABLE IF NOT EXISTS prospects (
    id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name        text        NOT NULL,
    trade               text,
    geography           text,
    estimated_revenue   text,
    owner_name          text,
    owner_email         text        NOT NULL UNIQUE,
    status              text        NOT NULL DEFAULT 'active',
    -- 'active' | 'paused' | 'completed' | 'unsubscribed' | 'replied' | 'converted'
    sequence_step       integer     NOT NULL DEFAULT 0,
    -- 0=queued, 1=day-0 sent, 2=day-4 sent, 3=day-10 sent
    unsubscribe_token   text        UNIQUE DEFAULT gen_random_uuid()::text,
    last_email_sent_at  timestamptz,
    unsubscribed_at     timestamptz,
    replied_at          timestamptz,
    converted_at        timestamptz,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status       ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_step         ON prospects(sequence_step);
CREATE INDEX IF NOT EXISTS idx_prospects_email        ON prospects(owner_email);
CREATE INDEX IF NOT EXISTS idx_prospects_unsub_token  ON prospects(unsubscribe_token);

CREATE TABLE IF NOT EXISTS prospect_sequence_events (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    prospect_id uuid        NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    event_type  text        NOT NULL,
    -- 'email_sent' | 'reply_marked' | 'unsubscribed' | 'converted' | 'paused' | 'resumed'
    step        integer,
    metadata    jsonb       DEFAULT '{}'::jsonb,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pseq_events_prospect ON prospect_sequence_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_pseq_events_type     ON prospect_sequence_events(event_type, created_at);
