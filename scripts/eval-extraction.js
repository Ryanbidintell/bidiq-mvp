#!/usr/bin/env node
// scripts/eval-extraction.js
//
// Golden-set ACCURACY harness for BidIntell extraction + scoring.
//
// The other test-*.js scripts check the deterministic engine's LOGIC. This one
// measures real-world ACCURACY: given hand-labeled truth for real bids, how often
// does extraction get the fields right, and does the score land in the right
// GO/REVIEW/PASS band?
//
// It grades captured snapshots (what the app produced for a bid) against the
// ground truth you hand-label. That makes it:
//   • a REGRESSION guard — re-run after any prompt/scoring change; misses jump out.
//   • a MEASUREMENT — see which fields extraction actually gets wrong, and how often.
//   • a DRIFT alarm — if a model swap silently degrades output, the numbers drop.
//
// Zero dependencies. Offline by design (snapshots), so it's free to run in CI.
//
// USAGE:
//   node scripts/eval-extraction.js            # grade all eval/golden/*.json, print report
//   node scripts/eval-extraction.js --min 85   # also exit 1 if overall field accuracy < 85%
//
// Add a bid: copy eval/golden/_template.json, fill `expected` (hand-verified) and
// `extracted_snapshot` (paste what the app extracted). See eval/README.md.

const fs = require('fs');
const path = require('path');

const GOLDEN_DIR = path.join(__dirname, '..', 'eval', 'golden');
const args = process.argv.slice(2);
const minArg = args.indexOf('--min');
const MIN = minArg >= 0 ? parseFloat(args[minArg + 1]) : null;

// ---------- comparison helpers ----------
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

function cmpScalar(exp, got) { return norm(exp) === norm(got); }
function cmpBool(exp, got) { return (!!exp) === (!!got); }

// Precision/recall/F1 for set-valued fields (spec divisions, sheet disciplines, trades).
function setF1(exp, got) {
  const E = new Set((exp || []).map(norm).filter(Boolean));
  const G = new Set((got || []).map(norm).filter(Boolean));
  if (E.size === 0 && G.size === 0) return { p: 1, r: 1, f1: 1, tp: 0, fp: 0, fn: 0 };
  let tp = 0;
  for (const g of G) if (E.has(g)) tp++;
  const fp = G.size - tp, fn = E.size - tp;
  const p = G.size ? tp / G.size : (E.size ? 0 : 1);
  const r = E.size ? tp / E.size : 1;
  const f1 = (p + r) ? (2 * p * r) / (p + r) : 0;
  return { p, r, f1, tp, fp, fn };
}

// Grade one expected field against the snapshot. Returns { correct, kind, detail }.
// Convention: an expected key ending in `_present` is a boolean presence check on
// the base key in the snapshot (e.g. "bid_deadline_present": true → !!snap.bid_deadline).
function gradeField(key, expVal, snap) {
  if (key.endsWith('_present')) {
    const base = key.slice(0, -'_present'.length);
    const present = !!(snap[base] != null && snap[base] !== '' &&
      !(Array.isArray(snap[base]) && snap[base].length === 0));
    return { correct: cmpBool(expVal, present), kind: 'presence', detail: `${present}` };
  }
  const got = snap[key];
  if (Array.isArray(expVal)) {
    const s = setF1(expVal, Array.isArray(got) ? got : []);
    return {
      correct: s.f1 >= 0.999,
      kind: 'set',
      f1: s.f1,
      detail: `F1 ${(s.f1 * 100).toFixed(0)}% (got ${JSON.stringify(got || [])})`,
    };
  }
  if (typeof expVal === 'boolean') return { correct: cmpBool(expVal, got), kind: 'bool', detail: `${got}` };
  return { correct: cmpScalar(expVal, got), kind: 'scalar', detail: `got ${JSON.stringify(got)}` };
}

// ---------- load golden set ----------
if (!fs.existsSync(GOLDEN_DIR)) {
  console.error(`No golden dir at ${GOLDEN_DIR}. Create eval/golden/ and add labeled bids.`);
  process.exit(1);
}
const files = fs.readdirSync(GOLDEN_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_')); // skip _template.json

if (files.length === 0) {
  console.log('No golden bids yet. Copy eval/golden/_template.json to add one. See eval/README.md.');
  process.exit(0);
}

// ---------- grade ----------
const fieldStats = {};   // field -> { correct, total, f1sum, f1n }
let bidsGraded = 0, bidsSkipped = 0;
let recMatch = 0, recTotal = 0;
let scoreDeltaSum = 0, scoreDeltaN = 0;
const lines = [];

for (const file of files.sort()) {
  const entry = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, file), 'utf8'));
  const id = entry.id || file.replace(/\.json$/, '');
  const snap = entry.extracted_snapshot;

  if (!snap) {
    bidsSkipped++;
    lines.push(`\n  ⚠ ${id} — no extracted_snapshot; capture one from the app (see README). Skipped.`);
    continue;
  }
  bidsGraded++;

  const misses = [];
  const exp = entry.expected || {};
  for (const [key, expVal] of Object.entries(exp)) {
    const g = gradeField(key, expVal, snap);
    fieldStats[key] = fieldStats[key] || { correct: 0, total: 0, f1sum: 0, f1n: 0 };
    fieldStats[key].total++;
    if (g.correct) fieldStats[key].correct++;
    if (g.kind === 'set') { fieldStats[key].f1sum += g.f1; fieldStats[key].f1n++; }
    if (!g.correct) misses.push(`      ✗ ${key}: expected ${JSON.stringify(expVal)}, ${g.detail}`);
  }

  // recommendation band
  let recLine = '';
  if (entry.expected_recommendation && entry.scored_snapshot && entry.scored_snapshot.recommendation) {
    recTotal++;
    const ok = norm(entry.expected_recommendation) === norm(entry.scored_snapshot.recommendation);
    if (ok) recMatch++;
    recLine = ok
      ? `  · rec ✓ ${entry.scored_snapshot.recommendation}`
      : `  · rec ✗ expected ${entry.expected_recommendation}, got ${entry.scored_snapshot.recommendation}`;
    if (typeof entry.expected_score === 'number' && typeof entry.scored_snapshot.final === 'number') {
      const d = Math.abs(entry.expected_score - entry.scored_snapshot.final);
      scoreDeltaSum += d; scoreDeltaN++;
      recLine += `  (Δscore ${d})`;
    }
  }

  const fieldsN = Object.keys(exp).length;
  const missN = misses.length;
  const okN = fieldsN - missN;
  const status = missN === 0 ? '✓' : '✗';
  lines.push(`\n  ${status} ${id} — ${okN}/${fieldsN} fields${recLine}`);
  misses.forEach((m) => lines.push(m));
}

// ---------- aggregate ----------
let totalCorrect = 0, totalFields = 0;
for (const s of Object.values(fieldStats)) { totalCorrect += s.correct; totalFields += s.total; }
const overallPct = totalFields ? (totalCorrect / totalFields) * 100 : 0;

console.log('══════════════════════════════════════════════════════════');
console.log('  BidIntell extraction + scoring accuracy — golden set');
console.log('══════════════════════════════════════════════════════════');
console.log(lines.join('\n'));

console.log('\n  ── Per-field accuracy (worst first) ──');
Object.entries(fieldStats)
  .map(([k, s]) => ({ k, pct: (s.correct / s.total) * 100, s }))
  .sort((a, b) => a.pct - b.pct)
  .forEach(({ k, pct, s }) => {
    const f1 = s.f1n ? `  avg F1 ${((s.f1sum / s.f1n) * 100).toFixed(0)}%` : '';
    console.log(`    ${pct.toFixed(0).padStart(3)}%  ${k}  (${s.correct}/${s.total})${f1}`);
  });

console.log('\n  ── Summary ──');
console.log(`    Bids graded:        ${bidsGraded}${bidsSkipped ? ` (${bidsSkipped} skipped — no snapshot)` : ''}`);
console.log(`    Field accuracy:     ${overallPct.toFixed(1)}%  (${totalCorrect}/${totalFields})`);
if (recTotal) console.log(`    Recommendation band:${' '}${((recMatch / recTotal) * 100).toFixed(0)}%  (${recMatch}/${recTotal})`);
if (scoreDeltaN) console.log(`    Avg |score delta|:  ${(scoreDeltaSum / scoreDeltaN).toFixed(1)} pts`);
console.log('══════════════════════════════════════════════════════════');

if (MIN != null && overallPct < MIN) {
  console.error(`\n❌ Field accuracy ${overallPct.toFixed(1)}% is below --min ${MIN}%.`);
  process.exit(1);
}
