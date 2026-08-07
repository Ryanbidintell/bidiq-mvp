#!/usr/bin/env node
/**
 * scripts/test-extension.js — Chrome extension logic tests.
 *
 * Covers the two places this feature can fail silently:
 *
 *  1. TOKEN HASH PARITY. extension-token.js mints with Node's
 *     crypto.createHash('sha256'); the edge function validates with Deno's
 *     crypto.subtle.digest('SHA-256'). If those two ever disagree, every token
 *     mints fine and then 401s forever — a bug with no error anywhere near its
 *     cause. This asserts they produce identical hex.
 *
 *  2. DOWNLOAD DETECTION. background.js's heuristic decides whether the user
 *     is ever offered a score. It's loaded here in a vm with a stubbed `chrome`
 *     so the REAL source is exercised — no reimplementation that could drift —
 *     and the test also asserts the listeners actually register, which is the
 *     failure mode where detection is silently dead.
 *
 * Run: node scripts/test-extension.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

function assert(cond, label) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

// ── 1. Token hash parity ──────────────────────────────────────────────────────

async function testHashParity() {
    console.log('\nToken hash parity (Node mint ↔ Deno validate)');

    const samples = [
        `bix_${'a'.repeat(64)}`,
        `bix_${crypto.randomBytes(32).toString('hex')}`,
        `bix_${crypto.randomBytes(32).toString('hex')}`
    ];

    for (const raw of samples) {
        // What netlify/functions/extension-token.js stores.
        const nodeHash = crypto.createHash('sha256').update(raw).digest('hex');

        // What the edge function computes. Node's WebCrypto is the same
        // implementation Deno exposes, so this is a faithful stand-in.
        const buf = await crypto.webcrypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(raw)
        );
        const webHash = Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        assert(nodeHash === webHash, `hashes match for ${raw.slice(0, 12)}…`);
    }

    assert(
        crypto.createHash('sha256').update(samples[0]).digest('hex').length === 64,
        'hash is 64 hex chars (fits token_hash text column)'
    );
}

// ── 2. Download detection ─────────────────────────────────────────────────────

function loadBackground() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'extension', 'background.js'),
        'utf8'
    );

    const registered = { downloads: 0, alarms: 0, notifications: 0, runtime: 0 };
    const noop = () => {};

    const chromeStub = {
        downloads:     { onChanged: { addListener: () => registered.downloads++ }, search: noop },
        alarms:        { onAlarm:   { addListener: () => registered.alarms++ }, create: noop },
        notifications: {
            onClicked:       { addListener: () => registered.notifications++ },
            onButtonClicked: { addListener: () => registered.notifications++ },
            create: noop, clear: noop
        },
        runtime: { onMessage: { addListener: () => registered.runtime++ }, getURL: (p) => p },
        storage: { local: { get: (k, cb) => cb && cb({}), set: (o, cb) => cb && cb(), remove: noop } },
        tabs:    { create: noop }
    };

    const sandbox = { chrome: chromeStub, console, URL, Date, setTimeout, registered };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'background.js' });
    return sandbox;
}

function testDetection() {
    console.log('\nDownload detection (extension/background.js)');

    const ctx = loadBackground();

    // If these are 0 the extension loads but does nothing — the silent-death case.
    assert(ctx.registered.downloads === 1, 'downloads.onChanged listener registered');
    assert(ctx.registered.alarms === 1, 'alarms.onAlarm listener registered');
    assert(ctx.registered.notifications === 2, 'both notification listeners registered');
    assert(ctx.registered.runtime === 1, 'runtime.onMessage listener registered');

    const f = ctx.looksLikeBidFile;
    assert(typeof f === 'function', 'looksLikeBidFile is defined');
    if (typeof f !== 'function') return;

    const item = (filename, referrer) => ({ filename, referrer, url: referrer });

    // Should detect
    assert(f(item('C:\\Users\\r\\Downloads\\ITB-Wichita-MOB.pdf', '')),
        'filename hint: ITB');
    assert(f(item('/home/r/Downloads/Addendum 2.pdf', '')),
        'filename hint: addendum');
    assert(f(item('/tmp/Project Specs.PDF', '')),
        'case-insensitive extension + hint');
    assert(f(item('/tmp/8471029.pdf', 'https://app.buildingconnected.com/projects/123')),
        'known host: buildingconnected subdomain');
    assert(f(item('/tmp/random.pdf', 'https://www.planhub.com/x')),
        'known host: planhub with www');

    // Should NOT detect
    assert(!f(item('/tmp/bid-set.zip', 'https://app.buildingconnected.com/x')),
        'zip rejected even from a known host (pipeline reads PDFs only)');
    assert(!f(item('/tmp/drawings.dwg', '')),
        'dwg rejected');
    assert(!f(item('/tmp/invoice.pdf', 'https://mybank.example.com')),
        'unrelated PDF from unknown host rejected');
    assert(!f(item('/tmp/holiday-plans.pdf.exe', '')),
        'double extension rejected — must actually end in .pdf');
    // Filename deliberately contains no hint word, so this isolates the host
    // check: a suffix-only match would wrongly accept "evil-notplanhub.com".
    assert(!f(item('/tmp/statement.pdf', 'https://evil-notplanhub.com/x')),
        'lookalike host not matched as a known source');

    // Filename hint "plan" is broad on purpose (plans/planset). Confirm the
    // host check is what carries precision, not the hint list.
    assert(f(item('/tmp/floor-plans.pdf', '')),
        'filename hint: plans (broad by design)');
}

(async function main() {
    console.log('Chrome extension tests');
    await testHashParity();
    testDetection();

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
})();
