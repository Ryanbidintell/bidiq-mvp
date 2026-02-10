-- Migration: Rename general_contractors to clients and add client_type
-- Date: February 9, 2026
-- Purpose: Support multiple client types (GCs, End Users, Building Owners)

-- Step 1: Add client_type column to existing table (if not exists)
ALTER TABLE general_contractors
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'general_contractor';

-- Step 2: Set all existing records to 'general_contractor'
UPDATE general_contractors
SET client_type = 'general_contractor'
WHERE client_type IS NULL OR client_type = '';

-- Step 3: Rename the table
ALTER TABLE general_contractors
RENAME TO clients;

-- Step 4: Add constraint for valid client types
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
ADD CONSTRAINT clients_client_type_check
CHECK (client_type IN ('general_contractor', 'end_user', 'building_owner'));

-- Step 5: Update RLS policies (rename from general_contractors to clients)
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own GCs" ON clients;
DROP POLICY IF EXISTS "Users can insert their own GCs" ON clients;
DROP POLICY IF EXISTS "Users can update their own GCs" ON clients;
DROP POLICY IF EXISTS "Users can delete their own GCs" ON clients;

-- Create new policies with updated names
CREATE POLICY "Users can view their own clients"
ON clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE
USING (auth.uid() = user_id);

-- Step 6: Create index on client_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_user_id_type ON clients(user_id, client_type);

-- Verification queries (run these to confirm migration worked):
-- SELECT COUNT(*), client_type FROM clients GROUP BY client_type;
-- SELECT * FROM clients LIMIT 5;
