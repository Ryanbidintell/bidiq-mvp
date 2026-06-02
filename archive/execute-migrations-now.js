const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Try multiple connection methods
const CONNECTION_CONFIGS = [
    {
        name: 'Direct Connection',
        config: {
            host: 'db.szifhqmrddmdkgschkkw.supabase.co',
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: '10009Hardy!!',
            ssl: { rejectUnauthorized: false }
        }
    },
    {
        name: 'Connection String',
        config: {
            connectionString: 'postgresql://postgres:10009Hardy!!@db.szifhqmrddmdkgschkkw.supabase.co:5432/postgres?sslmode=require'
        }
    },
    {
        name: 'IPv4 Connection Pooler',
        config: {
            host: 'aws-0-us-east-1.pooler.supabase.com',
            port: 5432,
            database: 'postgres',
            user: 'postgres.szifhqmrddmdkgschkkw',
            password: '10009Hardy!!',
            ssl: { rejectUnauthorized: false }
        }
    },
    {
        name: 'IPv6 Connection Pooler',
        config: {
            host: 'aws-0-us-east-1.pooler.supabase.com',
            port: 6543,
            database: 'postgres',
            user: 'postgres.szifhqmrddmdkgschkkw',
            password: '10009Hardy!!',
            ssl: { rejectUnauthorized: false }
        }
    }
];

const executeWithRetry = async () => {
    console.log('═══════════════════════════════════════');
    console.log('  BidIntell Database Migration Executor');
    console.log('═══════════════════════════════════════\n');

    const sqlPath = path.join(__dirname, 'consolidated-migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`Read migration file: ${sql.length} characters\n`);

    for (const { name, config } of CONNECTION_CONFIGS) {
        console.log(`Attempting connection method: ${name}...`);

        const client = new Client(config);

        try {
            await client.connect();
            console.log(`✓ Connected successfully using ${name}!\n`);

            console.log('Executing migrations...\n');
            const result = await client.query(sql);

            console.log('═══════════════════════════════════════');
            console.log('✓ Migration execution completed!');
            console.log('═══════════════════════════════════════\n');

            // Show executed migrations
            const migrations = await client.query('SELECT version, executed_at FROM schema_migrations ORDER BY executed_at');

            console.log('Executed migrations:');
            migrations.rows.forEach(row => {
                console.log(`  - ${row.version} (${new Date(row.executed_at).toISOString()})`);
            });

            await client.end();
            return true;

        } catch (error) {
            console.log(`✗ Failed with ${name}: ${error.message}\n`);
            try {
                await client.end();
            } catch {}
        }
    }

    console.error('═══════════════════════════════════════');
    console.error('❌ All connection methods failed');
    console.error('═══════════════════════════════════════\n');
    console.error('Please run manually:');
    console.error('1. Go to https://supabase.com/dashboard/project/szifhqmrddmdkgschkkw/editor');
    console.error('2. Copy contents of consolidated-migration.sql');
    console.error('3. Paste and run in SQL Editor\n');
    return false;
};

executeWithRetry().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
