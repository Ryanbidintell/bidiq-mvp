// ============================================================================
// lib/scoring-core.js — BidIndex v2 unified scoring core (see SCORING_V2.md)
// Pure, dual-mode (browser <script> + Node require). NOT YET wired into prod —
// this is the shared framework both the upload path (app.html) and the email path
// (edge fn) will call, replacing the two divergent engines (R-1).
//
// ONE scorer, three data-availability modes (invite/partial/full). Missing data
// lowers a bucket's CONFIDENCE and makes it ABSTAIN — it never injects a fake
// default. Confidence rolls up into a completeness meter. Three weighted buckets:
// Project Fit / Scope Fit / Client Fit. Everything else is a modifier or an alert.
// ============================================================================

// Building types the extractor already classifies (app.html extract prompt).
const BUILDING_TYPES = ['Healthcare','Office','Multifamily','Retail','Industrial','Education','Higher Education','Government','Religious','Mixed-Use','Infrastructure','Other'];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ABSTAIN = 0.4; // buckets below this confidence are excluded from the weighted index

// ── Project Fit — "the kind of job I want?" (location + building-type pref + turnaround)
function scoreProjectFit(opp, profile) {
    const reasons = [], alerts = [];
    let score = 55, conf = 0.3; // neutral start, low confidence until something resolves

    // Location (reuse the live distance→score mapping so shadow diffs are meaningful)
    if (typeof opp.distanceMiles === 'number') {
        const d = opp.distanceMiles;
        let loc = d <= 25 ? 100 : d <= 50 ? 85 : d <= 100 ? 70 : d <= 150 ? 50 : 30;
        if (profile.searchRadius && d > profile.searchRadius) loc = Math.max(10, loc - 20);
        score = loc; conf = 0.9;
        reasons.push(`${d} mi from your office`);
    } else if (opp.city || opp.state) {
        conf = 0.45; reasons.push('Location found but not yet geocoded');
    } else {
        reasons.push('No project location yet');
    }

    // Building-type preference: match -> boost, non-match -> neutral, unknown -> abstain (no effect)
    const targets = profile.targetBuildingTypes || [];
    const bt = opp.buildingType;
    if (targets.length && bt && bt !== 'Other') {
        if (targets.includes(bt)) { score = clamp(score + 10, 0, 100); reasons.push(`${bt} — one of your target project types`); }
        else { reasons.push(`${bt} — outside your usual types`); } // neutral, NOT a penalty
    } else if (targets.length && (!bt || bt === 'Other')) {
        conf = Math.min(conf, 0.6); reasons.push('Project type unclear — confirm on full docs');
    }

    // Turnaround → alert only, never scored
    if (typeof opp.daysUntilDue === 'number' && opp.daysUntilDue >= 0 && opp.daysUntilDue < 10) {
        alerts.push({ type: 'rushed_timeline', severity: 'medium', label: `Due in ${opp.daysUntilDue}d` });
    }
    return { score: Math.round(score), confidence: conf, reasons, alerts };
}

// ── Scope Fit — "is this MY work?" (CSI sections presence-floor + scope-keyword fallback)
function scoreScopeFit(opp, profile) {
    const reasons = [], alerts = [];
    const sections = opp.foundSections || [];   // your spec sections found in the docs
    const scopeHits = opp.scopeKeywordsFound || []; // scope keywords found (fallback / invite)
    if (sections.length) {
        const score = Math.min(65 + (sections.length - 1) * 5, 100);
        reasons.push(`${sections.length} of your spec sections found`);
        return { score, confidence: 0.9, reasons, alerts };
    }
    if (scopeHits.length) {
        // fallback / invite-mode: lower confidence, wider band
        const score = Math.min(50 + scopeHits.length * 10, 80);
        reasons.push(`Scope confirmed via ${scopeHits.length} keyword${scopeHits.length !== 1 ? 's' : ''} (no spec sections read yet)`);
        return { score, confidence: opp.availability === 'full' ? 0.6 : 0.4, reasons, alerts };
    }
    // Nothing resolved: ABSTAIN (do not return a fake 0). Missing docs, not "not your scope".
    reasons.push(opp.availability === 'full' ? 'None of your scope found in the specs' : 'Scope unknown — open the docs to confirm');
    return { score: opp.availability === 'full' ? 30 : 55, confidence: opp.availability === 'full' ? 0.7 : 0.2, reasons, alerts };
}

// ── Client Fit — "want this GC?" (relationship + competitive pressure folded in)
function scoreClientFit(opp, profile) {
    const reasons = [], alerts = [];
    const gc = opp.client; // { name, rating, bids, wins } | null
    if (!gc || !gc.name) return { score: 55, confidence: 0.2, reasons: ['GC not identified'], alerts };
    let score = (gc.bids > 0 && gc.wins > 0) ? Math.round((gc.wins / gc.bids) * 100) : (gc.rating || profile.defaultStars || 3) * 20;
    reasons.push(gc.bids > 0 ? `${gc.name}: ${gc.wins}/${gc.bids} win history` : `${gc.name}: ${gc.rating || 3}★ (no history yet)`);
    let conf = gc.bids > 0 ? 0.85 : 0.6;

    // Competitive Pressure folds INTO Client Fit (not a separate bucket)
    if (typeof opp.avgBidders === 'number') {
        const cp = opp.avgBidders <= 2 ? 90 : opp.avgBidders <= 4 ? 75 : opp.avgBidders <= 7 ? 55 : opp.avgBidders <= 10 ? 40 : 25;
        score = Math.round(score * 0.7 + cp * 0.3);
        reasons.push(`~${opp.avgBidders} subs typically bid this client`);
        if (opp.avgBidders > 7) alerts.push({ type: 'many_bidders', severity: 'medium', label: `~${opp.avgBidders} bidders` });
    } else if (opp.bidderClue) {
        alerts.push({ type: 'many_bidders', severity: 'low', label: 'Bidder list present' });
    }
    return { score: clamp(score, 0, 100), confidence: conf, reasons, alerts };
}

// ── Favorable/risk keyword modifier (capped ±10) — a nudge, not a bucket
function keywordModifier(goodCount, badCount) {
    return clamp(((goodCount || 0) - (badCount || 0)) * 3, -10, 10);
}

// ── Contract clauses: alerts by default; only ABOVE-MARKET (worse than AIA A401) clauses
// apply a small BOUNDED penalty. Standard clauses (present in ~every subcontract) never move
// the score. The tier map is SEEDED with the unambiguous outliers from the design doc; the
// full STANDARD/ABOVE-MARKET calibration comes from Ryan's hand-labeled subcontracts
// (contract_labeling_prompt.md) — until then, only clearly-predatory clauses penalize.
const CONTRACT_CLAUSE_TIER = {
    pay_if_paid_condition_precedent: 'above_market',
    no_damage_for_delay: 'above_market',
    own_negligence_indemnity: 'above_market',
    change_notice_under_48h: 'above_market',
    ld_stacked_with_no_damage_for_delay: 'above_market',
    one_sided_consequential_waiver: 'above_market',
    advance_lien_waiver: 'above_market',
    // standard (no penalty): pay_when_paid, standard_indemnity, normal_retainage, standard_ld, flow_down …
};
// clauses = [{ type }] or [type]. ~6 pts per outlier, capped (default 15) — enough to move a
// REVIEW→PASS, never enough to tank a strong bid.
function outlierContractPenalty(clauses, tierMap = CONTRACT_CLAUSE_TIER, cap = 15) {
    const n = (clauses || []).filter(c => tierMap[(c && c.type) || c] === 'above_market').length;
    return Math.min(cap, n * 6);
}

// ── Completeness (0–100): how much of the expected signal we actually had
function computeCompleteness(opp, buckets) {
    const modeFloor = { invite: 20, partial: 55, full: 80 }[opp.availability] ?? 20;
    const avgConf = (buckets.project.confidence + buckets.scope.confidence + buckets.client.confidence) / 3;
    return clamp(Math.round(modeFloor * 0.5 + avgConf * 100 * 0.5), 0, 100);
}

function recommend(index, mode) {
    if (index == null) return 'INSUFFICIENT_INFO';
    if (mode === 'full') return index >= 80 ? 'GO' : index >= 60 ? 'REVIEW' : 'PASS';
    // invite/partial → triage verdict, never a confident GO
    return index >= 70 ? 'OPEN_AND_ASSIGN' : index >= 45 ? 'WORTH_A_LOOK' : 'LIKELY_SKIP';
}

// ── Main: one entry point, both paths call this ────────────────────────────
function scoreOpportunity(opp, profile) {
    opp = opp || {}; profile = profile || {};
    const w = profile.weights3 || { project: 34, scope: 33, client: 33 };
    const buckets = {
        project: scoreProjectFit(opp, profile),
        scope: scoreScopeFit(opp, profile),
        client: scoreClientFit(opp, profile),
    };
    // Weighted index over CONFIDENT buckets only; renormalize weights over them.
    const active = ['project', 'scope', 'client'].filter(k => buckets[k].confidence >= ABSTAIN);
    const kwMod = keywordModifier(opp.goodCount, opp.badCount);
    const outlierPenalty = outlierContractPenalty(opp.contractClauses);
    let index = null;
    if (active.length) {
        const wsum = active.reduce((s, k) => s + (w[k] || 0), 0) || 1;
        index = active.reduce((s, k) => s + buckets[k].score * ((w[k] || 0) / wsum), 0);
        index = clamp(Math.round(index + kwMod - outlierPenalty), 0, 100);
    }
    const alerts = [].concat(buckets.project.alerts, buckets.scope.alerts, buckets.client.alerts, opp.contractAlerts || []);
    if (outlierPenalty > 0) alerts.push({ type: 'above_market_contract', severity: 'high', label: `Above-market contract terms (−${outlierPenalty})` });
    return {
        mode: opp.availability || 'invite',
        completeness: computeCompleteness(opp, buckets),
        index,
        recommendation: recommend(index, opp.availability || 'invite'),
        buckets,
        modifiers: { keyword: kwMod, contractOutlier: -outlierPenalty },
        alerts,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { scoreOpportunity, scoreProjectFit, scoreScopeFit, scoreClientFit, keywordModifier, outlierContractPenalty, computeCompleteness, recommend, BUILDING_TYPES, CONTRACT_CLAUSE_TIER, ABSTAIN };
}
