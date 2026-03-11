-- Migration: Add oauth_connections table
-- Date: 2026-03-11
-- Purpose: Stores OAuth tokens for 3rd-party integrations (BuildingConnected, etc.)
-- Run in: Supabase SQL Editor
-- ⚠️  DO NOT run on production without reviewing first.

CREATE TABLE IF NOT EXISTS oauth_connections (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES auth.users(id),
    provider          text        NOT NULL,
    access_token      text        NOT NULL,
    refresh_token     text,
    token_expires_at  timestamptz,
    scope             text,
    connected_at      timestamptz DEFAULT now(),
    last_sync_at      timestamptz,
    status            text        DEFAULT 'active',
    CONSTRAINT oauth_connections_user_provider_unique UNIQUE (user_id, provider)
);

ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oauth connections"
ON oauth_connections FOR ALL
USING (user_id = auth.uid());
