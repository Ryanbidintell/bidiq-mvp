#!/usr/bin/env node
// PostToolUse guard — type-checks the Supabase Deno edge function(s).
//
// Why: the build's check-app-syntax.js only `node --check`s netlify/functions/*.js.
// The Deno/TypeScript edge functions (supabase/functions/**/index.ts) are otherwise
// unverified until `supabase functions deploy` — a syntax/type error there is invisible
// locally (this is exactly the blind spot hit on 2026-06-09).
//
// No-op (exit 0) if Deno isn't installed, so it activates automatically once you
// install Deno locally (e.g. `winget install denoland.deno`). Safe to run on every edit.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FN_DIR = path.join(__dirname, '..', 'supabase', 'functions');
if (!fs.existsSync(FN_DIR)) process.exit(0);

const whichCmd = process.platform === 'win32' ? 'where' : 'which';
if (spawnSync(whichCmd, ['deno'], { stdio: 'ignore' }).status !== 0) {
    // Deno not installed — skip silently. Edge function is still checked at deploy time.
    process.exit(0);
}

const targets = fs
    .readdirSync(FN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(FN_DIR, d.name, 'index.ts'))
    .filter((p) => fs.existsSync(p));

let failed = false;
for (const f of targets) {
    const r = spawnSync('deno', ['check', f], { stdio: 'inherit' });
    if (r.status !== 0) failed = true;
}

if (failed) {
    console.error('❌ Deno edge function type-check failed — fix before deploying.');
    process.exit(1);
}
console.log(`✅ Deno edge functions: ${targets.length} checked, no errors`);
process.exit(0);
