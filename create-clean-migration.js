const fs = require('fs');
const path = require('path');

console.log('Creating clean slate migration...\n');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .filter(f => f !== '001_initial_schema_safe.sql')
    .sort();

let sql = `-- =====================================================
-- BIDINTELL DATABASE MIGRATIONS - CLEAN SLATE
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- This version drops all existing objects first
-- Then executes all migrations on a clean database
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- =====================================================

-- Drop all views
DROP VIEW IF EXISTS v_projects_by_market CASCADE;
DROP VIEW IF EXISTS v_projects_by_trade CASCADE;
DROP VIEW IF EXISTS v_projects_time_series CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings CASCADE;
DROP TRIGGER IF EXISTS update_general_contractors_updated_at ON general_contractors CASCADE;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects CASCADE;
DROP TRIGGER IF EXISTS beta_feedback_updated_at ON beta_feedback CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_tos ON auth.users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS validate_outcome_data(jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS update_beta_feedback_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_tos() CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS user_revenue CASCADE;
DROP TABLE IF EXISTS api_usage CASCADE;
DROP TABLE IF EXISTS project_gc_scores CASCADE;
DROP TABLE IF EXISTS beta_feedback CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS general_contractors CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- =====================================================
-- STEP 2: EXECUTE ALL MIGRATIONS
-- =====================================================

`;

files.forEach((file, index) => {
    const version = file.replace('.sql', '');
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8').trim();

    console.log(`Adding migration ${index + 1}/${files.length}: ${file}`);

    sql += `
-- =====================================================
-- MIGRATION ${index + 1}/${files.length}: ${version}
-- =====================================================

${sqlContent}

`;
});

// Add tracking at the end
sql += `
-- =====================================================
-- STEP 3: RECORD MIGRATION EXECUTION
-- =====================================================

-- Create tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record all migrations
INSERT INTO schema_migrations (version, executed_at) VALUES
    ('001_initial_schema', NOW()),
    ('002_layer0_intelligence_architecture', NOW()),
    ('003_company_types', NOW()),
    ('004_project_fingerprinting', NOW()),
    ('005_beta_feedback', NOW()),
    ('20260205_add_street_zip_columns', NOW()),
    ('20260205_add_tos_acceptance_fields', NOW()),
    ('20260206_add_full_text_column', NOW()),
    ('20260206_add_intelligence_engine_fields', NOW()),
    ('20260207_add_api_usage_tracking', NOW()),
    ('20260207_add_client_types', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();

-- =====================================================
-- SUCCESS! MIGRATION COMPLETE
-- =====================================================

-- Show summary
SELECT
    'Migration completed successfully!' as status,
    COUNT(*) as total_migrations,
    MIN(executed_at) as started_at,
    MAX(executed_at) as completed_at
FROM schema_migrations;

-- List all tables created
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
`;

const outputPath = path.join(__dirname, 'consolidated-migration.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`\n✓ Clean slate migration created: ${outputPath}`);
console.log(`  Size: ${(sql.length / 1024).toFixed(1)} KB`);
console.log(`\n⚠️  WARNING: This will DROP ALL EXISTING TABLES`);
console.log(`   Only use this if you want to start completely fresh!\n`);
