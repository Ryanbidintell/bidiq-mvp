const fs = require('fs');
const path = require('path');

console.log('Fixing policy creation statements...\n');

const filePath = path.join(__dirname, 'consolidated-migration.sql');
let sql = fs.readFileSync(filePath, 'utf8');

// Find all CREATE POLICY statements and add DROP IF EXISTS before them
const policyRegex = /CREATE POLICY "([^"]+)"\s+ON (\w+)/g;

let match;
const policies = [];

while ((match = policyRegex.exec(sql)) !== null) {
    policies.push({
        name: match[1],
        table: match[2],
        fullMatch: match[0]
    });
}

console.log(`Found ${policies.length} policy statements\n`);

// Replace each CREATE POLICY with DROP + CREATE
policies.forEach(policy => {
    const dropStatement = `DROP POLICY IF EXISTS "${policy.name}" ON ${policy.table};\n`;
    const searchPattern = `CREATE POLICY "${policy.name}"`;

    sql = sql.replace(
        searchPattern,
        dropStatement + searchPattern
    );

    console.log(`✓ Added DROP for policy: ${policy.name} on ${policy.table}`);
});

// Also handle CREATE TRIGGER statements which might conflict
const triggerRegex = /CREATE TRIGGER (\w+)/g;
const triggers = [];

while ((match = triggerRegex.exec(sql)) !== null) {
    triggers.push(match[1]);
}

console.log(`\nFound ${triggers.length} trigger statements\n`);

triggers.forEach(trigger => {
    const searchPattern = `CREATE TRIGGER ${trigger}`;
    sql = sql.replace(
        searchPattern,
        `DROP TRIGGER IF EXISTS ${trigger} ON user_settings CASCADE;\n    DROP TRIGGER IF EXISTS ${trigger} ON general_contractors CASCADE;\n    DROP TRIGGER IF EXISTS ${trigger} ON projects CASCADE;\n    DROP TRIGGER IF EXISTS ${trigger} ON beta_feedback CASCADE;\n    ${searchPattern}`
    );

    console.log(`✓ Added DROP for trigger: ${trigger}`);
});

// Write the fixed file
fs.writeFileSync(filePath, sql, 'utf8');

console.log(`\n✓ Fixed migration file written\n`);
console.log('The migration now includes:');
console.log(`  - DROP POLICY IF EXISTS before each CREATE POLICY`);
console.log(`  - DROP TRIGGER IF EXISTS before each CREATE TRIGGER`);
console.log(`  - Safe to run even if policies/triggers already exist\n`);
