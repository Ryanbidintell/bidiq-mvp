const fs = require('fs');
const path = require('path');

// Create a simple migration file that just concatenates all migrations
const createSimpleMigration = () => {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

    console.log('Creating simple migration file...');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .filter(f => f !== '001_initial_schema_safe.sql')
        .sort();

    console.log(`Found ${files.length} migration files\n`);

    let sql = `-- =====================================================
-- BIDINTELL DATABASE MIGRATIONS - SIMPLE VERSION
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- This file executes all migrations sequentially
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

`;

    // Add each migration file directly
    files.forEach((file, index) => {
        const version = file.replace('.sql', '');
        const filePath = path.join(migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf8').trim();

        console.log(`${index + 1}. Adding ${file}...`);

        sql += `
-- =====================================================
-- MIGRATION ${index + 1}/${files.length}: ${version}
-- =====================================================

${sqlContent}

`;
    });

    // Add migration tracking at the end
    sql += `
-- =====================================================
-- MIGRATION TRACKING
-- =====================================================

-- Create tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record all migrations as executed
INSERT INTO schema_migrations (version) VALUES
    ('001_initial_schema'),
    ('002_layer0_intelligence_architecture'),
    ('003_company_types'),
    ('004_project_fingerprinting'),
    ('005_beta_feedback'),
    ('20260205_add_street_zip_columns'),
    ('20260205_add_tos_acceptance_fields'),
    ('20260206_add_full_text_column'),
    ('20260206_add_intelligence_engine_fields'),
    ('20260207_add_api_usage_tracking'),
    ('20260207_add_client_types')
ON CONFLICT (version) DO NOTHING;

-- Show summary
SELECT
    COUNT(*) as total_migrations,
    MIN(executed_at) as first_migration,
    MAX(executed_at) as last_migration
FROM schema_migrations;

-- List all migrations
SELECT version, executed_at
FROM schema_migrations
ORDER BY version;
`;

    // Write to file
    const outputPath = path.join(__dirname, 'consolidated-migration.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log(`\n✓ Simple migration file created: ${outputPath}`);
    console.log(`  Size: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log(`\nThis file:`);
    console.log(`  - Executes all ${files.length} migrations sequentially`);
    console.log(`  - Safe to run multiple times (uses IF NOT EXISTS)`);
    console.log(`  - No complex transaction logic`);
    console.log(`  - Records execution in schema_migrations table\n`);
};

createSimpleMigration();
