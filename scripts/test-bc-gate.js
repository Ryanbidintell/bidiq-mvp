// Unit test for the BuildingConnected import gate (live-bids-only + since floor).
// Run: node scripts/test-bc-gate.js
const { isLiveOpportunity, oppReceivedMs } = require('../netlify/functions/bc-sync.js');

const DAY = 24 * 60 * 60 * 1000;
const iso = msFromNow => new Date(Date.now() + msFromNow).toISOString();

let pass = 0, fail = 0;
function check(name, actual, expected) {
    const ok = actual === expected;
    console.log(`${ok ? '✅' : '❌'} ${name} (got ${actual}, expected ${expected})`);
    ok ? pass++ : fail++;
}

// ── Live gate ──────────────────────────────────────────────────────────────
check('future-due open bid is LIVE',
    isLiveOpportunity({ id: 1, dueAt: iso(7 * DAY) }), true);
check('past-due bid is NOT live',
    isLiveOpportunity({ id: 2, dueAt: iso(-7 * DAY) }), false);
check('bid due yesterday still live (24h grace)',
    isLiveOpportunity({ id: 3, dueAt: iso(-12 * 60 * 60 * 1000) }), true);
check('WON bid is NOT live (resolved)',
    isLiveOpportunity({ id: 4, dueAt: iso(7 * DAY), outcome: { state: 'WON' } }), false);
check('LOST bid is NOT live (resolved)',
    isLiveOpportunity({ id: 5, dueAt: iso(7 * DAY), outcome: { state: 'LOST' } }), false);
check('DECLINED bid is NOT live',
    isLiveOpportunity({ id: 6, dueAt: iso(7 * DAY), outcome: { state: 'DECLINED' } }), false);
check('undated bid created 10 days ago is live (within 45d)',
    isLiveOpportunity({ id: 7, createdAt: iso(-10 * DAY) }), true);
check('undated bid created 100 days ago is NOT live (>45d)',
    isLiveOpportunity({ id: 8, createdAt: iso(-100 * DAY) }), false);
check('no date signal at all → kept',
    isLiveOpportunity({ id: 9 }), true);

// ── Since floor (oppReceivedMs vs a user-picked cutoff) ──────────────────────
const since = Date.now() - 14 * DAY; // "last 14 days"
const passesSince = opp => oppReceivedMs(opp) >= since;

check('invite received 3 days ago passes 14-day floor',
    passesSince({ id: 10, createdAt: iso(-3 * DAY) }), true);
check('invite received 30 days ago fails 14-day floor',
    passesSince({ id: 11, createdAt: iso(-30 * DAY) }), false);
check('createdAt missing, due in future → passes floor (uses dueAt)',
    passesSince({ id: 12, dueAt: iso(5 * DAY) }), true);
check('no dates → never dropped by since floor',
    passesSince({ id: 13 }), true);

// ── Combined: simulate a real first-sync working set ─────────────────────────
const opportunities = [
    { id: 'a', dueAt: iso(5 * DAY), createdAt: iso(-2 * DAY) },                       // live, recent → keep
    { id: 'b', dueAt: iso(10 * DAY), createdAt: iso(-40 * DAY) },                     // live but old invite → since drops
    { id: 'c', dueAt: iso(-30 * DAY), createdAt: iso(-35 * DAY) },                    // past-due → gate drops
    { id: 'd', dueAt: iso(8 * DAY), createdAt: iso(-1 * DAY), outcome: { state: 'WON' } }, // resolved → gate drops
    { id: 'e', createdAt: iso(-5 * DAY) },                                            // undated, recent → keep
];
const liveOnly = opportunities.filter(isLiveOpportunity);
const liveSince14 = liveOnly.filter(passesSince);
check('live gate keeps 3 of 5 (a, b, e)', liveOnly.length, 3);
check('live + 14-day floor keeps 2 (a, e)', liveSince14.length, 2);
check('working set is exactly [a, e]', liveSince14.map(o => o.id).join(','), 'a,e');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
