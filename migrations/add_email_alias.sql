-- migrations/add_email_alias.sql
-- Adds email_alias column to user_settings for inbound email forwarding.
-- Users get a personalized forwarding address: <alias>@bids.bidintell.ai
-- UNIQUE constraint prevents two users claiming the same alias.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_alias TEXT UNIQUE;
