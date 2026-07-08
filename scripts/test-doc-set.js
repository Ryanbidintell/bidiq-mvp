#!/usr/bin/env node
// Tests for lib/doc-set.js (addenda mechanism). Pure logic. Run: node scripts/test-doc-set.js
const { applyAddendum, diffScoreResults } = require('../lib/doc-set.js');

let passed = 0, failed = 0;
const check = (n, c) => c ? (passed++, console.log('  ✅ ' + n)) : (failed++, console.log('  ❌ ' + n));

console.log('Addenda mechanism\n');

const base = {
    docSetVersion: 0,
    docs: [{ source: 'invite', dated: '2026-02-01', kind: 'invite' }],
    fields: {
        bid_deadline: { value: '2026-03-05', source: 'invite', dated: '2026-02-01' },
        project_name: { value: 'MOB Fit-Out', source: 'invite', dated: '2026-02-01' },
    },
};

// Addendum 1: moves the bid date (newer date wins), adds a new scope field.
const a1 = applyAddendum(base, { source: 'Addendum 1', dated: '2026-02-20',
    fields: { bid_deadline: '2026-03-12', scope_note: 'Div 09 added' } });

check('newer-dated field supersedes (bid date moved)', a1.opportunity.fields.bid_deadline.value === '2026-03-12');
check('supersession recorded with from/to', a1.superseded.some(s => s.field === 'bid_deadline' && s.from === '2026-03-05' && s.to === '2026-03-12'));
check('brand-new field added (scope_note)', a1.opportunity.fields.scope_note.value === 'Div 09 added');
check('new field is NOT counted as superseded', !a1.superseded.some(s => s.field === 'scope_note'));
check('docSetVersion increments', a1.opportunity.docSetVersion === 1);
check('unchanged field untouched (project_name)', a1.opportunity.fields.project_name.value === 'MOB Fit-Out');

// Older-dated addendum must NOT overwrite a newer standing value.
const stale = applyAddendum(a1.opportunity, { source: 'Stale', dated: '2026-01-01', fields: { bid_deadline: '2026-01-15' } });
check('older-dated addendum does NOT overwrite newer value', stale.opportunity.fields.bid_deadline.value === '2026-03-12');
check('older-dated addendum records no supersession', stale.superseded.length === 0);

// Diff between two score results (post-addendum banner).
const before = { index: 71, recommendation: 'REVIEW', completeness: 85, buckets: { project: { score: 60 }, scope: { score: 62 }, client: { score: 90 } } };
const after = { index: 79, recommendation: 'REVIEW', completeness: 90, buckets: { project: { score: 60 }, scope: { score: 78 }, client: { score: 90 } } };
const diff = diffScoreResults(before, after, a1.superseded);
check('diff computes index delta (+8)', diff.indexDelta === 8);
check('diff captures scope bucket change 62→78', diff.bucketDeltas.scope && diff.bucketDeltas.scope.to === 78);
check('diff lines mention the superseded bid date', diff.lines.some(l => l.includes('bid deadline') && l.includes('2026-03-12')));
check('first-score diff (before=null) is safe', diffScoreResults(null, after, []).indexDelta === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
