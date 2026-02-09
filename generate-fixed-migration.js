const fs = require('fs');
const path = require('path');

// Generate a simpler consolidated migration without nested DO blocks
const generateFixedMigration = () => {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

    console.log('Generating fixed migration file...');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .filter(f => f !== '001_initial_schema_safe.sql')
        .sort();

    console.log(`Found ${files.length} migration files\n`);

    let sql = `-- =====================================================
-- BIDINTELL CONSOLIDATED DATABASE MIGRATION (FIXED)
-- =====================================================
-- Generated: ${new Date().toISOString()}
-- This version executes migrations sequentially without nested blocks
-- =====================================================

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

`;

    // Process each migration file
    files.forEach((file, index) => {
        const version = file.replace('.sql', '');
        const filePath = path.join(migrationsDir, file);
        let sqlContent = fs.readFileSync(filePath, 'utf8').trim();

        console.log(`${index + 1}. Adding ${file}...`);

        sql += `
-- =====================================================
-- MIGRATION: ${version}
-- =====================================================

-- Check if migration already executed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '${version}') THEN
        RAISE NOTICE 'Skipping migration: ${version} (already executed)';
    ELSE
        RAISE NOTICE 'Running migration: ${version}';
    END IF;
END $$;

-- Execute migration (only if not already executed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '${version}') THEN
        -- Execute the migration inline
${sqlContent.split('\n').map(line => '        ' + line).join('\n')}

        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('${version}');
        RAISE NOTICE 'Completed migration: ${version}';
    END IF;
END $$;

`;
    });

    sql += `
-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Show summary
DO $$
DECLARE
    migration_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migration_count FROM schema_migrations;
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Total migrations executed: %', migration_count;
    RAISE NOTICE '===================================';
END $$;

-- List all executed migrations
SELECT
    version,
    executed_at,
    executed_at::date as date
FROM schema_migrations
ORDER BY executed_at;
`;

    // Write to file
    const outputPath = path.join(__dirname, 'consolidated-migration.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log(`\n✓ Fixed migration file created: ${outputPath}`);
    console.log(`\nTo run:`);
    console.log(`1. Open https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor`);
    console.log(`2. Copy the contents of: consolidated-migration.sql`);
    console.log(`3. Paste and run in SQL Editor\n`);
};

generateFixedMigration();
