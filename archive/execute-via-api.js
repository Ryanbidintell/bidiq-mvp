const fs = require('fs');
const path = require('path');

// Supabase configuration
const PROJECT_REF = 'szifhqmrddmdkgschkkw';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aWZocW1yZGRtZGtnc2Noa2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5OTIwNSwiZXhwIjoyMDg0Njc1MjA1fQ.viUt0-jog9n6oFmF2BKLmXPzUZrZfHINKAstpEHO9r0';

// Split the consolidated migration into individual statements
const executeMigration = async () => {
    console.log('═══════════════════════════════════════');
    console.log('  Executing via Supabase API');
    console.log('═══════════════════════════════════════\n');

    const sqlPath = path.join(__dirname, 'consolidated-migration.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');

    // Try to execute the entire SQL at once using supabase-js
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        `https://${PROJECT_REF}.supabase.co`,
        SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('Attempting to execute migrations via Supabase Edge SQL...\n');

    // Method 1: Try using a special RPC call if available
    try {
        // First, check if we can query existing tables
        const { data: testQuery, error: testError } = await supabase
            .from('user_settings')
            .select('id')
            .limit(1);

        if (testError && testError.message.includes('does not exist')) {
            console.log('✓ Database is empty, migrations needed\n');
        } else if (testError) {
            console.log(`Note: ${testError.message}\n`);
        } else {
            console.log('✓ Database tables exist, checking migration status\n');
        }
    } catch (error) {
        console.log('Database status check failed, proceeding with migration\n');
    }

    // Since we can't execute DDL directly via the REST API, we need to provide instructions
    console.log('═══════════════════════════════════════');
    console.log('  MANUAL EXECUTION REQUIRED');
    console.log('═══════════════════════════════════════\n');

    console.log('Supabase requires direct SQL Editor access for DDL migrations.\n');

    console.log('📋 COPY THIS COMMAND:\n');
    console.log('  code "C:\\Users\\RyanElder\\bidiq-mvp\\consolidated-migration.sql"\n');

    console.log('🌐 THEN OPEN THIS URL:\n');
    console.log(`  https://supabase.com/dashboard/project/${PROJECT_REF}/editor\n`);

    console.log('✨ STEPS:\n');
    console.log('  1. Open the file in VS Code (command above)');
    console.log('  2. Select all (Ctrl+A) and copy (Ctrl+C)');
    console.log('  3. Open SQL Editor (URL above)');
    console.log('  4. Paste (Ctrl+V) and click "Run"\n');

    console.log('The migration will:');
    console.log('  ✓ Create 11 database migrations');
    console.log('  ✓ Skip any already executed');
    console.log('  ✓ Track execution in schema_migrations table');
    console.log('  ✓ Show summary when complete\n');

    // Open the file in VS Code if available
    const { spawn } = require('child_process');
    try {
        spawn('code', [sqlPath], { stdio: 'ignore', detached: true }).unref();
        console.log('✓ Opening file in VS Code...\n');
    } catch (error) {
        console.log('Note: Could not auto-open VS Code\n');
    }

    // Try to open the browser
    try {
        const url = `https://supabase.com/dashboard/project/${PROJECT_REF}/editor`;
        const command = process.platform === 'win32' ? 'start' :
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
        spawn(command, [url], { stdio: 'ignore', detached: true, shell: true }).unref();
        console.log('✓ Opening SQL Editor in browser...\n');
    } catch (error) {
        console.log('Note: Could not auto-open browser\n');
    }
};

executeMigration().catch(error => {
    console.error('Error:', error.message);
});
