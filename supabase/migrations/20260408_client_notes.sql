-- Migration 011: Add notes field to clients table
-- Supports Build 4: Client behavior card relationship notes

ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
