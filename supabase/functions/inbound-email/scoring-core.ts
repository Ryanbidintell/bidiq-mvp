// ============================================================================
// scoring-core.ts — BidIndex v2 unified scoring core for the EDGE (email path).
// PORT of lib/scoring-core.js (browser/Node) into Deno TS. KEEP IN SYNC with that
// file — same math, same thresholds. When lib/scoring-core.js changes, mirror it
// here (single-source generator is a TODO; for now these are hand-kept in parity).
//
// ONE scorer, three data-availability modes (invite/partial/full). Missing data
// lowers a bucket's CONFIDENCE and makes it ABSTAIN — never a fake default.
// Three weighted buckets: Project Fit / Scope Fit / Client Fit. Everything else
// is a modifier or an alert. See SCORING_V2.md.
// ============================================================================

export const BUILDING_TYPES = ['Healthcare', 'Office', 'Multifamily', 'Retail', 'Industrial', 'Education', 'Higher Education', 'Government', 'Religious', 'Mixed-Use', 'Infrastructure', 'Other'];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const ABSTAIN = 0.4;

interface Bucket { score: number; confidence: number; reasons: string[]; alerts: Alert[]; }
interface Alert { type: string; severity: string; label: string; }
// deno-lint-ignore no-explicit-any
type Opp = any;
// deno-lint-ignore no-explicit-any
type Profile = any;

export function scoreProjectFit(opp: Opp, profile: Profile): Bucket {
    const reasons: string[] = [], alerts: Alert[] = [];
    let score = 55, conf = 0.3;

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

    const targets: string[] = profile.targetBuildingTypes || [];
    const bt = opp.buildingType;
    if (targets.length && bt && bt !== 'Other') {
        if (targets.includes(bt)) { score = clamp(score + 10, 0, 100); reasons.push(`${bt} — one of your target project types`); }
        else { reasons.push(`${bt} — outside your usual types`); }
    } else if (targets.length && (!bt || bt === 'Other')) {
        conf = Math.min(conf, 0.6); reasons.push('Project type unclear — confirm on full docs');
    }

    if (typeof opp.daysUntilDue === 'number' && opp.daysUntilDue >= 0 && opp.daysUntilDue < 10) {
        alerts.push({ type: 'rushed_timeline', severity: 'medium', label: `Due in ${opp.daysUntilDue}d` });
    }
    return { score: Math.round(score), confidence: conf, reasons, alerts };
}

export function scoreScopeFit(opp: Opp, _profile: Profile): Bucket {
    const reasons: string[] = [], alerts: Alert[] = [];
    const sections = opp.foundSections || [];
    const scopeHits = opp.scopeKeywordsFound || [];
    if (sections.length) {
        const score = Math.min(65 + (sections.length - 1) * 5, 100);
        reasons.push(`${sections.length} of your spec sections found`);
        return { score, confidence: 0.9, reasons, alerts };
    }
    if (scopeHits.length) {
        const score = Math.min(50 + scopeHits.length * 10, 80);
        reasons.push(`Scope confirmed via ${scopeHits.length} keyword${scopeHits.length !== 1 ? 's' : ''} (no spec sections read yet)`);
        return { score, confidence: opp.availability === 'full' ? 0.6 : 0.4, reasons, alerts };
    }
    reasons.push(opp.availability === 'full' ? 'None of your scope found in the specs' : 'Scope unknown — open the docs to confirm');
    return { score: opp.availability === 'full' ? 30 : 55, confidence: opp.availability === 'full' ? 0.7 : 0.2, reasons, alerts };
}

export function scoreClientFit(opp: Opp, profile: Profile): Bucket {
    const reasons: string[] = [], alerts: Alert[] = [];
    const gc = opp.client;
    if (!gc || !gc.name) return { score: 55, confidence: 0.2, reasons: ['GC not identified'], alerts };
    let score = (gc.bids > 0 && gc.wins > 0) ? Math.round((gc.wins / gc.bids) * 100) : (gc.rating || profile.defaultStars || 3) * 20;
    reasons.push(gc.bids > 0 ? `${gc.name}: ${gc.wins}/${gc.bids} win history` : `${gc.name}: ${gc.rating || 3}★ (no history yet)`);
    const conf = gc.bids > 0 ? 0.85 : 0.6;

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

export function keywordModifier(goodCount: number, badCount: number): number {
    return clamp(((goodCount || 0) - (badCount || 0)) * 3, -10, 10);
}

export const CONTRACT_CLAUSE_TIER: Record<string, string> = {
    pay_if_paid_condition_precedent: 'above_market',
    no_damage_for_delay: 'above_market',
    own_negligence_indemnity: 'above_market',
    change_notice_under_48h: 'above_market',
    ld_stacked_with_no_damage_for_delay: 'above_market',
    one_sided_consequential_waiver: 'above_market',
    advance_lien_waiver: 'above_market',
};

export function outlierContractPenalty(clauses: Array<{ type?: string } | string>, tierMap = CONTRACT_CLAUSE_TIER, cap = 15): number {
    const n = (clauses || []).filter(c => tierMap[(c && (c as { type?: string }).type) || (c as string)] === 'above_market').length;
    return Math.min(cap, n * 6);
}

export function computeCompleteness(opp: Opp, buckets: Record<string, Bucket>): number {
    const modeFloor = ({ invite: 20, partial: 55, full: 80 } as Record<string, number>)[opp.availability] ?? 20;
    const avgConf = (buckets.project.confidence + buckets.scope.confidence + buckets.client.confidence) / 3;
    return clamp(Math.round(modeFloor * 0.5 + avgConf * 100 * 0.5), 0, 100);
}

export function recommend(index: number | null, mode: string): string {
    if (index == null) return 'INSUFFICIENT_INFO';
    if (mode === 'full') return index >= 80 ? 'GO' : index >= 60 ? 'REVIEW' : 'PASS';
    return index >= 70 ? 'OPEN_AND_ASSIGN' : index >= 45 ? 'WORTH_A_LOOK' : 'LIKELY_SKIP';
}

export function scoreOpportunity(opp: Opp, profile: Profile) {
    opp = opp || {}; profile = profile || {};
    const w = profile.weights3 || { project: 34, scope: 33, client: 33 };
    const buckets: Record<string, Bucket> = {
        project: scoreProjectFit(opp, profile),
        scope: scoreScopeFit(opp, profile),
        client: scoreClientFit(opp, profile),
    };
    const active = ['project', 'scope', 'client'].filter(k => buckets[k].confidence >= ABSTAIN);
    const kwMod = keywordModifier(opp.goodCount, opp.badCount);
    const outlierPenalty = outlierContractPenalty(opp.contractClauses);
    let index: number | null = null;
    if (active.length) {
        const wsum = active.reduce((s, k) => s + (w[k] || 0), 0) || 1;
        index = active.reduce((s, k) => s + buckets[k].score * ((w[k] || 0) / wsum), 0);
        index = clamp(Math.round(index + kwMod - outlierPenalty), 0, 100);
    }
    const alerts: Alert[] = ([] as Alert[]).concat(buckets.project.alerts, buckets.scope.alerts, buckets.client.alerts, opp.contractAlerts || []);
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
