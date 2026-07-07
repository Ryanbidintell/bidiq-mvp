#!/usr/bin/env node
// Characterization test for Option B — consolidated scope model (admin-gated).
// Mirrors the calculateScores() consolidated branch: keywords -> capped ±10 modifier,
// weight redistributed to Trade Match (60%) + Client (40%); Trade owns scope.
// Run: node scripts/test-scope-consolidate.js

function kwModifier(good, bad) { return Math.max(-10, Math.min(10, (good - bad) * 3)); }

// Effective weights when consolidated (keywords weight -> gc 40% / trade 60%).
function effectiveWeights(weights, cpActive) {
    const kwW = weights.keywords || 0;
    let ew = {
        location: weights.location,
        gc: weights.gc + Math.round(kwW * 0.4),
        trade: weights.trade + Math.round(kwW * 0.6),
    };
    if (cpActive) { ew.location = Math.round(ew.location * 0.9); ew.gc = Math.round(ew.gc * 0.9); ew.trade = Math.round(ew.trade * 0.9); }
    return ew;
}
function consolidatedFinal(scores, weights, good, bad) {
    const kwMod = kwModifier(good, bad);
    const ew = effectiveWeights(weights, false);
    let cf = 0;
    for (const k of ['location', 'gc', 'trade']) cf += scores[k] * (ew[k] / 100);
    return Math.max(0, Math.min(100, Math.round(cf + kwMod)));
}

let passed = 0, failed = 0;
const check = (n, c) => c ? (passed++, console.log('  ✅ ' + n)) : (failed++, console.log('  ❌ ' + n));

console.log('Option B — consolidated scope model\n');

// modifier is capped at ±10
check('modifier caps at +10', kwModifier(10, 0) === 10);
check('modifier caps at -10', kwModifier(0, 10) === -10);
check('modifier scales (2 good, 1 bad -> +3)', kwModifier(2, 1) === 3);
check('modifier zero when balanced/none', kwModifier(0, 0) === 0);

// keywords weight (default 30) redistributes to gc(+12)/trade(+18); the 3 drivers re-sum to 100
const W = { location: 25, keywords: 30, gc: 25, trade: 20 };
const ew = effectiveWeights(W, false);
check('keywords weight fully redistributed (gc 25->37, trade 20->38)', ew.gc === 37 && ew.trade === 38);
check('3 drivers sum to 100 (keywords no longer weighted)', ew.location + ew.gc + ew.trade === 100);

// full example: strong trade/location, decent client, favorable terms -> GO
// 80*.25 + 60*.37 + 90*.38 = 20 + 22.2 + 34.2 = 76.4; +9 (3 good) = 85.4 -> 85
check('consolidated final adds the modifier on top of driver weighting (=> 85 GO)',
    consolidatedFinal({ location: 80, gc: 60, trade: 90 }, W, 3, 0) === 85);
// risk terms drag it down but only within the ±10 cap
check('risk terms subtract, capped at -10: same bid, 4 bad -> 66 (not -12)',
    consolidatedFinal({ location: 80, gc: 60, trade: 90 }, W, 0, 4) === 66);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
