-- 20260618_clients_contact_email.sql
-- Agent #3 (outcome + follow-up): adds a GC contact email + name to the clients table
-- so a follow-up can be addressed to the general contractor. Additive + idempotent;
-- touches no existing data. NOT YET APPLIED — apply via Supabase MCP apply_migration
-- (or SQL Editor) after review. Pairs with the existing 20260520_followup_automation
-- + follow_up_touches flow and send-followup-email.js (user's own Gmail/M365 rail).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
