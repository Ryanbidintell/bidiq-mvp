#!/usr/bin/env node
// Syntax gate for the Netlify build, git pre-commit hook, and Claude Code PostToolUse hook.
//
//   1. Extracts the main <script> block from app.html and checks it for JS syntax errors.
//   2. Checks EVERY netlify/functions/*.js file with `node --check`.
//
// (2) was added 2026-06-01 after inbound-email-background.js shipped with a
// duplicated block that left an open try — the function failed to load in prod
// and nothing caught it, because the build only ever checked app.html. Now a
// syntax error in any function fails the build instead of silently deploying.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
let hadError = false;

// ─── 1. app.html main script block ────────────────────────────────────────────
function checkAppHtml() {
    const htmlFile = path.join(root, 'app.html');
    if (!fs.existsSync(htmlFile)) {
        console.log('check-syntax: app.html not found, skipping');
        return;
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
        hadError = true;
        return;
    }

    const tmp = path.join(os.tmpdir(), 'bidiq-syntax-check.js');
    fs.writeFileSync(tmp, lines.slice(start, end).join('\n'), 'utf8');

    try {
        execFileSync(process.execPath, ['--check', tmp], { stdio: ['ignore', 'pipe', 'pipe'] });
        console.log('✅ app.html JavaScript: no syntax errors');
    } catch (err) {
        const raw = ((err.stderr || '') + (err.stdout || '')).toString();
        // Remap temp-file line numbers back to app.html line numbers
        const msg = raw.replace(/bidiq-syntax-check\.js:(\d+)/g, (_, n) => `app.html:${start + parseInt(n)}`);
        process.stderr.write('❌ app.html syntax error:\n' + msg + '\n');
        hadError = true;
    } finally {
        try { fs.unlinkSync(tmp); } catch {}
    }
}

// ─── 2. netlify/functions/*.js ──────────────────────────────────────────────────
function listJsFiles(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listJsFiles(full));
        else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

function checkFunctions() {
    const fnDir = path.join(root, 'netlify', 'functions');
    const files = listJsFiles(fnDir);
    if (files.length === 0) {
        console.log('check-syntax: no netlify functions found, skipping');
        return;
    }

    let bad = 0;
    for (const file of files) {
        try {
            execFileSync(process.execPath, ['--check', file], { stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) {
            const raw = ((err.stderr || '') + (err.stdout || '')).toString();
            process.stderr.write(`❌ syntax error in ${path.relative(root, file)}:\n${raw}\n`);
            bad++;
        }
    }

    if (bad > 0) {
        hadError = true;
    } else {
        console.log(`✅ netlify/functions: ${files.length} files, no syntax errors`);
    }
}

checkAppHtml();
checkFunctions();

process.exit(hadError ? 1 : 0);
