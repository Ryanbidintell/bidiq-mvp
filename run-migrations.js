const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://szifhqmrddmdkgschkkw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aWZocW1yZGRtZGtnc2Noa2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5OTIwNSwiZXhwIjoyMDg0Njc1MjA1fQ.viUt0-jog9n6oFmF2BKLmXPzUZrZfHINKAstpEHO9r0';
const PROJECT_REF = 'szifhqmrddmdkgschkkw';

// Execute SQL via Supabase Edge Functions SQL endpoint
const executeSql = async (sql) => {
    const response = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/vnd.pgrst.object+json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'params=single-object'
        },
        body: JSON.stringify({ query: sql })
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return text;
    }
};

// Execute SQL using the SQL API (alternative method)
const executeSqlDirect = async (sql) => {
    // Use fetch to execute raw SQL
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // For DDL statements, we need to use a workaround
    // Split into individual statements and execute them
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (const stmt of statements) {
        // Try to execute via PostgREST if it's a simple query
        try {
            // Create a temporary function to execute the SQL
            const wrapperSql = `
                DO $$
                BEGIN
                    ${stmt};
                END $$;
            `;

            // Execute using rpc if available
            const { data, error } = await supabase.rpc('exec_migration', {
                migration_sql: stmt
            });

            if (error && error.message && !error.message.includes('could not find')) {
                throw error;
            }
        } catch (error) {
            // Ignore function not found errors, continue
            if (!error.message || !error.message.includes('could not find')) {
                throw error;
            }
        }
    }
};

// Setup migration tracking via direct table manipulation
const setupMigrationTracking = async () => {
    console.log('Setting up migration tracking...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if table exists
    const { data, error } = await supabase
        .from('schema_migrations')
        .select('version')
        .limit(1);

    if (error && error.message.includes('does not exist')) {
        // Need to create the table - we'll do this manually for the first migration
        console.log('⚠ Migration tracking table needs to be created manually\n');
        return false;
    }

    console.log('✓ Migration tracking ready\n');
    return true;
};

// Get executed migrations
const getExecutedMigrations = async () => {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    try {
        const { data, error } = await supabase
            .from('schema_migrations')
            .select('version')
            .order('version');

        if (error) {
            return new Set();
        }

        return new Set(data.map(row => row.version));
    } catch (error) {
        return new Set();
    }
};

// Record migration
const recordMigration = async (version) => {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error } = await supabase
        .from('schema_migrations')
        .insert({ version });

    if (error && !error.message.includes('duplicate')) {
        throw error;
    }
};

// Execute SQL file by reading and posting to Supabase SQL Editor API
const executeMigrationFile = async (filePath) => {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Use the Management API SQL endpoint
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SQL execution failed: ${error}`);
    }

    return await response.json();
};

// Run migrations
const runMigrations = async () => {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

    console.log('═══════════════════════════════════════');
    console.log('  BidIntell Database Migration Runner');
    console.log('═══════════════════════════════════════\n');

    // Read migration files
    console.log('Reading migration files...');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files\n`);

    // Setup migration tracking
    const trackingReady = await setupMigrationTracking();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();

    if (executedMigrations.size > 0) {
        console.log(`Found ${executedMigrations.size} previously executed migrations\n`);
    }

    // Run each migration
    let executed = 0;
    let skipped = 0;

    for (const file of files) {
        const version = file.replace('.sql', '');

        if (executedMigrations.has(version)) {
            console.log(`⊘ Skipping ${file} (already executed)`);
            skipped++;
            continue;
        }

        console.log(`▶ Running ${file}...`);
        const filePath = path.join(migrationsDir, file);

        try {
            // Execute the migration by opening the SQL Editor in browser
            // or using the SQL API
            await executeMigrationFile(filePath);

            // Record the migration
            if (trackingReady) {
                await recordMigration(version);
            }

            console.log(`✓ Completed ${file}\n`);
            executed++;
        } catch (error) {
            console.error(`✗ Failed ${file}:`);
            console.error(`  Error: ${error.message}`);

            // If it's the first migration and tracking isn't set up,
            // provide manual instructions
            if (!trackingReady && executed === 0) {
                console.error('\n📝 MANUAL SETUP REQUIRED:\n');
                console.error('The database schema is empty. Please:');
                console.error('1. Go to: https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor');
                console.error('2. Open SQL Editor');
                console.error(`3. Run the migration file: ${file}`);
                console.error('4. Run this script again\n');
            }

            console.error('\n❌ Stopping migration process.\n');
            process.exit(1);
        }
    }

    console.log('═══════════════════════════════════════');
    console.log(`  Executed: ${executed}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Total:    ${files.length}`);
    console.log('═══════════════════════════════════════\n');

    if (executed > 0) {
        console.log('🎉 All migrations completed successfully!');
    } else {
        console.log('✓ Database is up to date!');
    }
};

// Run the migrations
runMigrations().catch(error => {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
});
