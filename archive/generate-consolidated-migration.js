const fs = require('fs');
const path = require('path');

// Read all migration files and create a consolidated SQL file
const generateConsolidatedMigration = () => {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

    console.log('Reading migration files...');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .filter(f => f !== '001_initial_schema_safe.sql') // Skip the safe version
        .sort();

    console.log(`Found ${files.length} migration files\n`);

    let consolidatedSql = `-- =====================================================
-- BIDINTELL CONSOLIDATED DATABASE MIGRATION
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- This file combines all migrations into a single script
-- that can be run in the Supabase SQL Editor
--
-- To run:
-- 1. Go to https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor
-- 2. Open SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- =====================================================

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helper function to check if migration was already executed
CREATE OR REPLACE FUNCTION migration_executed(migration_version TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM schema_migrations WHERE version = migration_version);
END;
$$ LANGUAGE plpgsql;

-- Helper function to record migration
CREATE OR REPLACE FUNCTION record_migration(migration_version TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO schema_migrations (version) VALUES (migration_version)
    ON CONFLICT (version) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

`;

    // Process each migration file
    files.forEach((file, index) => {
        const version = file.replace('.sql', '');
        const filePath = path.join(migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        console.log(`${index + 1}. Adding ${file}...`);

        consolidatedSql += `
-- =====================================================
-- MIGRATION: ${version}
-- =====================================================
DO $$
BEGIN
    IF NOT migration_executed('${version}') THEN
        RAISE NOTICE 'Running migration: ${version}';

        -- Start of migration content
${sqlContent.trim().split('\n').map(line => '        ' + line).join('\n')}
        -- End of migration content

        PERFORM record_migration('${version}');
        RAISE NOTICE 'Completed migration: ${version}';
    ELSE
        RAISE NOTICE 'Skipping migration: ${version} (already executed)';
    END IF;
END $$;

`;
    });

    // Add final summary
    consolidatedSql += `
-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Total migrations: ${files.length}
-- =====================================================

-- Show executed migrations
SELECT version, executed_at
FROM schema_migrations
ORDER BY executed_at;
`;

    // Write consolidated file
    const outputPath = path.join(__dirname, 'consolidated-migration.sql');
    fs.writeFileSync(outputPath, consolidatedSql, 'utf8');

    console.log(`\n✓ Consolidated migration file created: ${outputPath}`);
    console.log(`\nTo run the migrations:`);
    console.log(`1. Open https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor`);
    console.log(`2. Copy the contents of: consolidated-migration.sql`);
    console.log(`3. Paste into SQL Editor and click "Run"`);
    console.log(`\nThe migration is idempotent - it can be run multiple times safely.`);
};

generateConsolidatedMigration();
