// ============================================================================
// lib/doc-set.js — Addenda mechanism for BidIndex v2 (see SCORING_V2.md §Addenda)
// Pure, dual-mode (browser <script> + Node). NOT wired into prod yet.
//
// Addenda are NOT a scoring category. They are new/revised documents entering the
// CURRENT document set. Rule: latest-dated document wins PER FIELD (supersession).
// Then you re-run the same scorer over the updated set and show a DIFF. No special
// addendum math anywhere — just merge → re-score → diff.
// ============================================================================

// An opportunity's fields carry provenance: { value, source, dated } (ISO date string).
// applyAddendum merges an addendum's fields in, superseding older values per field.
//   opportunity.fields: { [key]: { value, source, dated } }
//   addendum:           { source, dated, fields: { [key]: value } }
// Returns { opportunity, superseded: [{ field, from, to, source }] } — superseded feeds the UI diff.
function applyAddendum(opportunity, addendum) {
    const opp = { ...opportunity, fields: { ...(opportunity.fields || {}) } };
    const superseded = [];
    const addDate = addendum.dated || '';
    for (const [key, value] of Object.entries(addendum.fields || {})) {
        const existing = opp.fields[key];
        // Newer-dated (or brand-new) field wins. Ties/older are ignored (keep the standing value).
        if (!existing || (addDate && String(addDate) >= String(existing.dated || ''))) {
            if (existing && existing.value !== value) {
                superseded.push({ field: key, from: existing.value, to: value, source: addendum.source || 'addendum' });
            }
            opp.fields[key] = { value, source: addendum.source || 'addendum', dated: addDate };
        }
    }
    // Track the document set + a monotonically increasing version for score history.
    opp.docs = [...(opportunity.docs || []), { source: addendum.source || 'addendum', dated: addDate, kind: 'addendum' }];
    opp.docSetVersion = (opportunity.docSetVersion || 0) + 1;
    return { opportunity: opp, superseded };
}

// Human-readable diff between two scoreOpportunity() results (before/after an addendum).
// Powers the "Updated after Addendum N" banner. before may be null (first score).
function diffScoreResults(before, after, superseded = []) {
    const out = { indexFrom: before ? before.index : null, indexTo: after.index,
        indexDelta: (before && before.index != null && after.index != null) ? after.index - before.index : null,
        recommendationChanged: before ? before.recommendation !== after.recommendation : false,
        recommendationFrom: before ? before.recommendation : null, recommendationTo: after.recommendation,
        completenessFrom: before ? before.completeness : null, completenessTo: after.completeness,
        bucketDeltas: {}, fieldsChanged: superseded, lines: [] };
    if (before && before.buckets && after.buckets) {
        for (const k of ['project', 'scope', 'client']) {
            const f = before.buckets[k]?.score, t = after.buckets[k]?.score;
            if (typeof f === 'number' && typeof t === 'number' && f !== t) {
                out.bucketDeltas[k] = { from: f, to: t };
                out.lines.push(`${k[0].toUpperCase() + k.slice(1)} Fit ${f}→${t}`);
            }
        }
    }
    for (const s of superseded) out.lines.unshift(`${s.field.replace(/_/g, ' ')}: ${fmt(s.from)} → ${fmt(s.to)}`);
    if (out.indexDelta != null && out.indexDelta !== 0) out.lines.push(`BidIndex ${out.indexFrom}→${out.indexTo} (${out.indexDelta > 0 ? '+' : ''}${out.indexDelta})`);
    return out;
}

function fmt(v) { return v == null ? '—' : String(v); }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyAddendum, diffScoreResults };
}
