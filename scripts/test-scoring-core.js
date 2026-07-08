#!/usr/bin/env node
// Tests for lib/scoring-core.js (BidIndex v2 unified core). Pure logic, no prod wiring.
// Run: node scripts/test-scoring-core.js

const { scoreOpportunity, keywordModifier, BUILDING_TYPES } = require('../lib/scoring-core.js');

let passed = 0, failed = 0;
const check = (n, c) => c ? (passed++, console.log('  ✅ ' + n)) : (failed++, console.log('  ❌ ' + n));

console.log('BidIndex v2 scoring core\n');

const profile = { weights3: { project: 34, scope: 33, client: 33 }, searchRadius: 50, defaultStars: 3, targetBuildingTypes: ['Healthcare', 'Education'] };
const strongFull = {
    availability: 'full', distanceMiles: 10, buildingType: 'Healthcare',
    foundSections: ['09 65 00', '09 30 00'], client: { name: 'JE Dunn', rating: 5, bids: 4, wins: 3 },
    avgBidders: 3, goodCount: 2, badCount: 0,
};

// --- full mode ---
const r = scoreOpportunity(strongFull, profile);
check('full mode → GO/REVIEW/PASS verdict', ['GO', 'REVIEW', 'PASS'].includes(r.recommendation));
check('strong full bid scores high (>=80 GO)', r.index >= 80 && r.recommendation === 'GO');
check('full mode completeness is high (>=80)', r.completeness >= 80);
check('three buckets present with scores', r.buckets.project.score >= 0 && r.buckets.scope.score >= 0 && r.buckets.client.score >= 0);

// --- building-type: match boosts, non-match neutral, unknown abstains ---
// distance 60 (>radius) → Project Fit ~50, leaving headroom to see the +10 boost (distance 10 maxes at 100)
const mid = { ...strongFull, distanceMiles: 60 };
const base = scoreOpportunity({ ...mid, buildingType: 'Healthcare' }, { ...profile, targetBuildingTypes: [] });
const match = scoreOpportunity({ ...mid, buildingType: 'Healthcare' }, profile);
const nonMatch = scoreOpportunity({ ...mid, buildingType: 'Office' }, profile);
const unknown = scoreOpportunity({ ...mid, buildingType: 'Other' }, profile);
check('target building type BOOSTS project fit', match.buckets.project.score > base.buckets.project.score);
check('non-target type is NEUTRAL (no penalty vs no-preference)', nonMatch.buckets.project.score === base.buckets.project.score);
check('unknown/Other type does not boost (abstains)', unknown.buckets.project.score === base.buckets.project.score);

// --- invite mode: triage verdict, never a confident GO ---
const invite = scoreOpportunity({
    availability: 'invite', city: 'Overland Park', state: 'KS', buildingType: 'Healthcare',
    scopeKeywordsFound: ['flooring'], client: { name: 'Turner', rating: 4, bids: 0, wins: 0 },
    daysUntilDue: 6, goodCount: 1, badCount: 0,
}, profile);
check('invite mode → triage verdict, not GO/REVIEW/PASS', ['OPEN_AND_ASSIGN', 'WORTH_A_LOOK', 'LIKELY_SKIP'].includes(invite.recommendation));
check('invite mode NEVER returns GO', invite.recommendation !== 'GO');
check('invite completeness is low (< full)', invite.completeness < r.completeness);
check('rushed timeline (6d) surfaces as alert', invite.alerts.some(a => a.type === 'rushed_timeline'));

// --- missing data abstains, does not fabricate ---
const empty = scoreOpportunity({ availability: 'invite' }, profile);
check('bare invite (no signals) → low completeness', empty.completeness <= 30);
check('bare invite does not fake a confident GO', empty.recommendation !== 'GO');

// --- competitive pressure folds into Client Fit ---
const crowded = scoreOpportunity({ ...strongFull, avgBidders: 12 }, profile);
check('many bidders lowers Client Fit + raises alert', crowded.buckets.client.score < r.buckets.client.score && crowded.alerts.some(a => a.type === 'many_bidders'));

// --- keyword modifier cap ---
check('keyword modifier caps at +10', keywordModifier(10, 0) === 10);
check('keyword modifier caps at -10', keywordModifier(0, 10) === -10);
check('12 building types defined for the picker', BUILDING_TYPES.length === 12);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
