-- ═══════════════════════════════════════════════════════════════════
-- BIDINTELL MINIMAL MIGRATION - Only Add Missing Columns (FINAL FIX)
-- Run this in Supabase SQL Editor
-- Date: February 12, 2026
-- ═══════════════════════════════════════════════════════════════════

-- ===================================================================
-- CHECK 1: Add full_text column to projects table (if missing)
-- ===================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'full_text'
    ) THEN
        ALTER TABLE projects ADD COLUMN full_text TEXT;
        COMMENT ON COLUMN projects.full_text IS 'Full text content from uploaded documents for re-analysis with updated extraction prompts';
        RAISE NOTICE 'Added full_text column to projects table';
    ELSE
        RAISE NOTICE 'full_text column already exists in projects table';
    END IF;
END $$;

-- ===================================================================
-- CHECK 2: Add client_type to clients table (if missing)
-- ===================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'client_type'
    ) THEN
        ALTER TABLE clients ADD COLUMN client_type TEXT DEFAULT 'general_contractor';
        COMMENT ON COLUMN clients.client_type IS 'Type of client: general_contractor, subcontractor, end_user, building_owner, municipality, distributor, manufacturer_rep';
        RAISE NOTICE 'Added client_type column to clients table';
    ELSE
        RAISE NOTICE 'client_type column already exists in clients table';
    END IF;
END $$;

-- Add/update constraint for client_type
ALTER TABLE clients DROP CONSTRAINT IF EXISTS valid_client_type;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_type_check
CHECK (client_type IN ('general_contractor', 'subcontractor', 'end_user', 'building_owner', 'municipality', 'distributor', 'manufacturer_rep'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);

-- ===================================================================
-- CHECK 3: Add columns to user_settings (if missing)
-- ===================================================================

-- client_types array
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'client_types'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN client_types TEXT[] DEFAULT ARRAY['general_contractor'];
        COMMENT ON COLUMN user_settings.client_types IS 'Array of client types the user works with';
        RAISE NOTICE 'Added client_types column to user_settings';
    ELSE
        RAISE NOTICE 'client_types column already exists in user_settings';
    END IF;
END $$;

-- SKIP decision_time - it already exists as INTEGER (minutes)
-- We use the existing integer column instead of adding a TEXT version
RAISE NOTICE 'Skipping decision_time - already exists as INTEGER type (stores minutes)';

-- company_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'company_type'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN company_type TEXT;
        COMMENT ON COLUMN user_settings.company_type IS 'Type of company: subcontractor, distributor, or manufacturer rep';
        RAISE NOTICE 'Added company_type column to user_settings';
    ELSE
        RAISE NOTICE 'company_type column already exists in user_settings';
    END IF;
END $$;

-- provides_installation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'provides_installation'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN provides_installation BOOLEAN DEFAULT true;
        COMMENT ON COLUMN user_settings.provides_installation IS 'Whether company provides installation services';
        RAISE NOTICE 'Added provides_installation column to user_settings';
    ELSE
        RAISE NOTICE 'provides_installation column already exists in user_settings';
    END IF;
END $$;

-- product_lines
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'product_lines'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN product_lines TEXT[];
        COMMENT ON COLUMN user_settings.product_lines IS 'List of product brands/lines carried (for distributors/mfg reps)';
        RAISE NOTICE 'Added product_lines column to user_settings';
    ELSE
        RAISE NOTICE 'product_lines column already exists in user_settings';
    END IF;
END $$;

-- product_categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'product_categories'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN product_categories TEXT[];
        COMMENT ON COLUMN user_settings.product_categories IS 'Product categories carried (electrical, lighting, hvac, etc)';
        RAISE NOTICE 'Added product_categories column to user_settings';
    ELSE
        RAISE NOTICE 'product_categories column already exists in user_settings';
    END IF;
END $$;

-- location_matters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'location_matters'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN location_matters BOOLEAN DEFAULT true;
        COMMENT ON COLUMN user_settings.location_matters IS 'Whether project location is important for this user';
        RAISE NOTICE 'Added location_matters column to user_settings';
    ELSE
        RAISE NOTICE 'location_matters column already exists in user_settings';
    END IF;
END $$;

-- ai_advisor_name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'ai_advisor_name'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN ai_advisor_name TEXT DEFAULT 'Sam';
        COMMENT ON COLUMN user_settings.ai_advisor_name IS 'Personalized name for AI advisor';
        RAISE NOTICE 'Added ai_advisor_name column to user_settings';
    ELSE
        RAISE NOTICE 'ai_advisor_name column already exists in user_settings';
    END IF;
END $$;

-- ai_advisor_tone
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'ai_advisor_tone'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN ai_advisor_tone TEXT DEFAULT 'supportive';
        COMMENT ON COLUMN user_settings.ai_advisor_tone IS 'Personality tone of AI advisor recommendations';
        RAISE NOTICE 'Added ai_advisor_tone column to user_settings';
    ELSE
        RAISE NOTICE 'ai_advisor_tone column already exists in user_settings';
    END IF;
END $$;

-- Add constraint for ai_advisor_tone (if column was added)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'ai_advisor_tone'
    ) THEN
        ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_ai_advisor_tone_check;
        ALTER TABLE user_settings ADD CONSTRAINT user_settings_ai_advisor_tone_check
        CHECK (ai_advisor_tone IN ('supportive', 'straight_shooter', 'data_nerd'));
        RAISE NOTICE 'Added constraint for ai_advisor_tone';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE!
-- Check the NOTICES above to see what was added vs. what already existed
-- decision_time was SKIPPED (already exists as INTEGER storing minutes)
-- ═══════════════════════════════════════════════════════════════════
