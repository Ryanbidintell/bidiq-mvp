#!/usr/bin/env node
// Local test harness for netlify/functions/alert.js — no network, no database.
// Stubs @supabase/supabase-js and global.fetch, then asserts the core guarantees:
//   • below-threshold severities log but never email
//   • error/critical email once, then throttle
//   • everything is logged to admin_events even when email is skipped/fails
//   • sendAlert NEVER throws, even when Postmark and Supabase both blow up
//
// Run: node scripts/test-alert.js   (exits non-zero on any failure)

const path = require('path');

// ─── Mutable mock state (one shared fake client; we flip these between tests) ──
const state = {
    selectData: [],     // what a throttle-check SELECT returns
    selectError: null,
    insertError: null,
    inserts: [],         // captured admin_events inserts
};
const fetchState = { calls: 0, mode: 'ok' }; // 'ok' | 'fail' | 'throw'

// ─── Stub @supabase/supabase-js BEFORE requiring alert.js ──────────────────────
function makeBuilder(resultProvider) {
    const b = {};
    for (const m of ['select', 'eq', 'gte', 'lte', 'neq', 'limit', 'order', 'single', 'maybeSingle']) {
        b[m] = () => b;
    }
    b.then = (resolve, reject) => Promise.resolve(resultProvider()).then(resolve, reject);
    return b;
}
const fakeSupabase = {
    from() {
        return {
            select: () => makeBuilder(() => ({ data: state.selectData, error: state.selectError })),
            insert: (row) => { state.inserts.push(row); return Promise.resolve({ error: state.insertError }); },
        };
    },
};
const sbPath = require.resolve('@supabase/supabase-js');
require.cache[sbPath] = {
    id: sbPath, filename: sbPath, loaded: true, exports: { createClient: () => fakeSupabase },
};

// ─── Stub global.fetch (Postmark) ──────────────────────────────────────────────
global.fetch = async () => {
    fetchState.calls++;
    if (fetchState.mode === 'throw') throw new Error('network down');
    if (fetchState.mode === 'fail') {
        return { ok: false, status: 422, text: async () => 'Inactive recipient', json: async () => ({}) };
    }
    return { ok: true, status: 200, text: async () => '', json: async () => ({ Message: 'OK' }) };
};

// ─── Env so getSupabase() returns the (stubbed) client and email is enabled ────
process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'stub-key';
process.env.POSTMARK_API_KEY = 'stub-postmark';
process.env.ALERT_EMAIL_MIN_SEVERITY = 'error';
process.env.ALERT_THROTTLE_MINUTES = '360';

const { sendAlert, _internal } = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'alert.js'));

// ─── Tiny assert harness ───────────────────────────────────────────────────────
let passed = 0, failed = 0;
function check(name, cond, extra) {
    if (cond) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
}
function reset() {
    state.selectData = []; state.selectError = null; state.insertError = null; state.inserts = [];
    fetchState.calls = 0; fetchState.mode = 'ok';
}

(async () => {
    console.log('alert.js test harness\n');

    // ── Pure helpers ──
    console.log('pure helpers:');
    check('normalizeSeverity clamps unknown -> error', _internal.normalizeSeverity('bogus') === 'error');
    check('normalizeSeverity passes through valid', _internal.normalizeSeverity('critical') === 'critical');
    check('resolveDedupeKey derives source::title',
        _internal.resolveDedupeKey(null, 'svc', 'Boom') === 'svc::Boom');
    check('resolveDedupeKey honors explicit key',
        _internal.resolveDedupeKey('my-key', 'svc', 'Boom') === 'my-key');
    check('buildEmailHtml escapes HTML in detail',
        _internal.buildEmailHtml({ severity: 'error', source: 's', title: 't', detail: '<script>x</script>', dedupeKey: 'k', throttleMinutes: 360 }).includes('&lt;script&gt;'));

    // ── A: below-threshold severity logs but never emails ──
    console.log('\nwarning severity (below email threshold):');
    reset();
    let r = await sendAlert({ source: 'test', severity: 'warning', title: 'heads up' });
    check('not emailed', r.emailed === false);
    check('no Postmark call', fetchState.calls === 0, `calls=${fetchState.calls}`);
    check('still logged to admin_events', r.logged === true && state.inserts.length === 1);
    check('logged row marked emailed=false', state.inserts[0]?.event_data?.emailed === false);

    // ── B: error severity, throttle window clear -> emails once ──
    console.log('\nerror severity, no recent email:');
    reset();
    r = await sendAlert({ source: 'test', severity: 'error', title: 'boom', detail: 'it broke' });
    check('emailed', r.emailed === true);
    check('exactly one Postmark call', fetchState.calls === 1, `calls=${fetchState.calls}`);
    check('not throttled', r.throttled === false);
    check('logged with emailed=true', state.inserts[0]?.event_data?.emailed === true);

    // ── C: error severity, a recent emailed alert exists -> throttled ──
    console.log('\nerror severity, recent email exists (throttle):');
    reset();
    state.selectData = [{ id: 'prev' }]; // throttle check finds a prior emailed alert
    r = await sendAlert({ source: 'test', severity: 'error', title: 'boom', dedupeKey: 'boom-key' });
    check('not emailed (throttled)', r.emailed === false);
    check('throttled flag set', r.throttled === true);
    check('no Postmark call', fetchState.calls === 0, `calls=${fetchState.calls}`);
    check('still logged (durable record)', r.logged === true && state.inserts.length === 1);

    // ── D: never throws even when Postmark throws AND insert errors ──
    console.log('\nresilience (Postmark throws + DB insert errors):');
    reset();
    fetchState.mode = 'throw';
    state.insertError = { message: 'db exploded' };
    let threw = false;
    try {
        r = await sendAlert({ source: 'test', severity: 'critical', title: 'everything is on fire' });
    } catch (e) { threw = true; }
    check('sendAlert did not throw', threw === false);
    check('result reports errors', r && r.errors.length > 0, JSON.stringify(r && r.errors));
    check('emailed=false on Postmark throw', r.emailed === false);
    check('durable log still ATTEMPTED when Postmark throws', state.inserts.length === 1, `inserts=${state.inserts.length}`);
    check('Postmark throw captured as email error', r.errors.some(e => e.includes('email:postmark_throw')), JSON.stringify(r.errors));

    // ── E: Postmark returns non-ok (422) -> emailed=false, error captured ──
    console.log('\nPostmark returns 422:');
    reset();
    fetchState.mode = 'fail';
    r = await sendAlert({ source: 'test', severity: 'error', title: 'bad recipient' });
    check('emailed=false on 422', r.emailed === false);
    check('error captured', r.errors.some(e => e.includes('email:postmark_422')), JSON.stringify(r.errors));
    check('still logged', r.logged === true);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
})();
