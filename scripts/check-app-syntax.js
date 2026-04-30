#!/usr/bin/env node
// Extracts the main <script> block from app.html and checks for JS syntax errors.
// Used by: Netlify build, git pre-commit hook, Claude Code PostToolUse hook.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const htmlFile = path.join(root, 'app.html');

if (!fs.existsSync(htmlFile)) {
    console.log('check-syntax: app.html not found, skipping');
    process.exit(0);
}

const lines = fs.readFileSync(htmlFile, 'utf8').split('\n');

// Locate the main app script block — identified by SUPABASE/CONFIGURATION comment
// within the first few lines after a bare <script> tag.
let start = -1, end = -1;
for (let i = 0; i < lines.length; i++) {
    if (start === -1 && lines[i].trim() === '<script>') {
        const peek = lines.slice(i + 1, i + 6).join('');
        if (peek.includes('SUPABASE') || peek.includes('CONFIGURATION')) {
            start = i + 1; // first line of script content (after the <script> tag)
        }
    } else if (start !== -1 && lines[i].includes('</script>')) {
        end = i;
        break;
    }
}

if (start === -1 || end === -1) {
    console.error('check-syntax: could not locate main script block in app.html');
    process.exit(1);
}

const tmp = path.join(os.tmpdir(), 'bidiq-syntax-check.js');
fs.writeFileSync(tmp, lines.slice(start, end).join('\n'), 'utf8');

try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('✅ app.html JavaScript: no syntax errors');
} catch (err) {
    const raw = ((err.stderr || '') + (err.stdout || '')).toString();
    // Remap temp-file line numbers back to app.html line numbers
    const msg = raw.replace(/bidiq-syntax-check\.js:(\d+)/g, (_, n) => {
        return `app.html:${start + parseInt(n)}`;
    });
    process.stderr.write('❌ app.html syntax error:\n' + msg + '\n');
    process.exit(1);
} finally {
    try { fs.unlinkSync(tmp); } catch {}
}
