-- Migration 013: Add behavior tracking columns to clients table
-- Persists avg_rfi, rfi_count, payment_flag, losses, ghosts
-- previously computed in-memory only and lost on page refresh

ALTER TABLE clients ADD COLUMN IF NOT EXISTS avg_rfi NUMERIC(3,1);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rfi_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_flag TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ghosts INTEGER NOT NULL DEFAULT 0;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('avg_rfi', 'rfi_count', 'payment_flag', 'losses', 'ghosts')
ORDER BY column_name;
