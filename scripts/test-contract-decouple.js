#!/usr/bin/env node
// Characterization + spec test for item #5a: contract-risk decouple (R-4/R-5 + Jun-22 decision).
// Mirrors the gate added to app.html calculateScores(): the contract-risk penalty is subtracted
// only when NOT decoupled. Clauses are ALWAYS still detected + surfaced (contract panel reads
// analysis.contractRisks independently) — decoupling only removes the score DEDUCTION.
// KEY SAFETY PROPERTY: flag OFF == today's behavior exactly.
// Run: node scripts/test-contract-decouple.js

function contractPenaltyApplies(flagDecouple, hasRisks) {
    return !flagDecouple && !!hasRisks;
}
function kwScoreAfterRisk(flagDecouple, hasRisks, penalty, base = 50) {
    let s = base;
    if (contractPenaltyApplies(flagDecouple, hasRisks)) s -= penalty;
    return Math.max(0, Math.min(100, s));
}
// The contract panel/alerts are driven by the detected clauses, not the penalty — so they show
// regardless of the flag. Model that: clauses surface iff they were detected.
function clausesSurfaced(flagDecouple, detectedClauses) {
    return detectedClauses > 0; // independent of the decouple flag
}

let passed = 0, failed = 0;
const check = (n, c) => c ? (passed++, console.log('  ✅ ' + n)) : (failed++, console.log('  ❌ ' + n));

console.log('Contract-risk decouple (item #5a)\n');

// Flag OFF = today: penalty applies, score deflated.
check('FLAG OFF + risks -> penalty applied (today: 50-15=35)', kwScoreAfterRisk(false, true, 15) === 35);
check('FLAG OFF + no risks -> 50', kwScoreAfterRisk(false, false, 15) === 50);

// Flag ON = decoupled: NO penalty, score no longer artificially deflated.
check('FLAG ON + risks -> NO penalty (50, score not deflated)', kwScoreAfterRisk(true, true, 15) === 50);
check('FLAG ON + no risks -> 50', kwScoreAfterRisk(true, false, 15) === 50);

// The whole point (Jun-22 decision): universal clauses shouldn't drag the score.
check('decouple lifts a bid that was ONLY failing due to clause presence (35 -> 50)',
    kwScoreAfterRisk(false, true, 15) === 35 && kwScoreAfterRisk(true, true, 15) === 50);

// Clauses still surface as alerts either way — decouple removes the deduction, not the awareness.
check('FLAG ON: detected clauses STILL surfaced (alerts, not penalties)', clausesSurfaced(true, 3) === true);
check('FLAG OFF: clauses surfaced too', clausesSurfaced(false, 3) === true);
check('no clauses detected -> nothing to surface', clausesSurfaced(true, 0) === false);

// UX bundle: "Risk-Averse" preset repurposed (Option A) when decoupled — weight client
// relationship & competition instead of contract terms. Mirrors app.html applyWeightPreset.
function riskAversePreset(flagDecouple) {
    return flagDecouple
        ? { location: 20, keywords: 15, gc: 45, trade: 20 }
        : { location: 20, keywords: 45, gc: 20, trade: 15 };
}
const sumW = w => w.location + w.keywords + w.gc + w.trade;
check('Risk-Averse preset sums to 100 (flag off)', sumW(riskAversePreset(false)) === 100);
check('Risk-Averse preset sums to 100 (flag on)', sumW(riskAversePreset(true)) === 100);
check('FLAG OFF: Risk-Averse is keyword/contract-heavy (today)', riskAversePreset(false).keywords === 45);
check('FLAG ON: Risk-Averse shifts to client relationship & competition (Option A)',
    riskAversePreset(true).gc === 45 && riskAversePreset(true).keywords === 15);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
