// supabase/functions/inbound-email/index.ts
//
// SendGrid Inbound Parse webhook handler — Supabase Edge Function
//
// Replaces netlify/functions/inbound-email-background.js
// Key improvements over the Netlify version:
//   • No 6MB payload limit (Supabase Edge Functions handle large multipart bodies)
//   • Returns 200 to SendGrid immediately via EdgeRuntime.waitUntil()
//   • Processes PDFs up to ~25MB (SendGrid's inbound attachment limit)
//   • Detects potential duplicate/related projects → creates merge_suggestions
//   • Populates gc_bids[] on each saved project for multi-GC tracking
//
// SendGrid Inbound Parse webhook URL (set in SendGrid dashboard → Settings → Inbound Parse):
//   https://szifhqmrddmdkgschkkw.supabase.co/functions/v1/inbound-email
//
// DNS: bids.bidintell.ai MX → mx.sendgrid.net (priority 10)
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   CLAUDE_API_KEY
//   RESEND_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY  (auto-available in Edge Functions)
//   SUPABASE_URL               (auto-available)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_API_KEY       = Deno.env.get('CLAUDE_API_KEY')!;
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')!;

const MAX_ATTACHMENTS = 3;

// ── Supabase admin client ────────────────────────────────────────────────────

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false }
    });
}

// ── Base64 helper (chunk to avoid stack overflow on large files) ─────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

// ── Geo helpers ──────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function nominatimGeocode(query: string) {
    if (geocodeCache.has(query)) return geocodeCache.get(query)!;
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
        const res = await fetch(url, { headers: { 'User-Agent': 'BidIntell/1.0 hello@bidintell.ai' } });
        if (!res.ok) { geocodeCache.set(query, null); return null; }
        const data = await res.json();
        const coords = data.length > 0 ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
        geocodeCache.set(query, coords);
        return coords;
    } catch {
        geocodeCache.set(query, null);
        return null;
    }
}

// ── Contract risk detection (mirrors app.html detectContractRisks exactly) ────

const CONTRACT_INDICATORS = ['shall', 'agreement', 'contract', 'terms', 'conditions', 'indemnify', 'warranty'];

const CONTRACT_RISK_PROMPT = `You are a construction contract risk analyst specializing in subcontractor agreements.

Analyze the following contract text and identify ALL risk clauses that would concern a subcontractor.

CRITICAL DETECTION RULES:
1. Clauses often do NOT use their common names. "Paid-when-paid" never literally appears — look for the LEGAL MECHANISM instead.
2. Pay attention to WHO bears the risk in each clause.
3. Distinguish between severity levels based on legal enforceability and financial impact.

CLAUSE LIBRARY — What to look for and HOW they actually appear:

## PAY-IF-PAID (HIGHEST RISK)
What it really says: "condition precedent of payment by the Owner" or "only with funds received from Owner"
Why it matters: Contractor has ZERO obligation to pay sub if owner doesn't pay.

## PAY-WHEN-PAID (HIGH RISK)
What it really says: "payment within X days after contractor receives payment from owner"
Why it matters: Creates timing dependency but contractor still ultimately owes the money.

## NO-DAMAGE-FOR-DELAY (HIGH RISK)
What it really says: "not entitled to claim cost reimbursement for delay" or "extension of time shall be the sole remedy"

## BROAD FORM INDEMNIFICATION (HIGH RISK)
What it really says: "indemnify, hold harmless and defend contractor... from and against any and all claims"

## FLOW-DOWN / INCORPORATION BY REFERENCE (MEDIUM RISK)
What it really says: "bound by all terms of the general contract" or "prime contract terms are incorporated herein"

## CONSEQUENTIAL DAMAGES WAIVER (MEDIUM RISK)
What it really says: "waives all claims for lost profit, home office overhead, and indirect damages"

## JURY TRIAL WAIVER (MEDIUM RISK)
What it really says: "expressly agrees to waive right to trial by jury"

## LIQUIDATED DAMAGES FLOW-DOWN (HIGH RISK)
What it really says: "subcontractor shall be liable for liquidated damages"

## TERMINATION FOR CONVENIENCE (MEDIUM RISK)
What it really says: "contractor may terminate without cause"

## CHANGE ORDER RESTRICTIONS (MEDIUM RISK)
What it really says: "notice within X hours/days" with very short windows, or "failure to notify constitutes waiver"

## BROAD ACCEPTANCE OF CONDITIONS (MEDIUM RISK)
What it really says: "subcontractor has inspected the site and accepts all conditions"

## WARRANTY OBLIGATIONS (MEDIUM RISK)
What it really says: extended warranty periods beyond standard, or pass-through of owner warranty claims

Respond in this exact JSON format:
{
  "risks_found": [
    {
      "clause_type": "pay_if_paid",
      "severity": "high",
      "classification": "pay-if-paid (condition precedent)",
      "exact_quote": "the first 20-30 words of the actual clause text...",
      "page_reference": "estimated page or section if detectable",
      "plain_english": "What this means for the subcontractor in one sentence"
    }
  ],
  "overall_risk_level": "high",
  "risk_summary": "2-3 sentence summary of the contract risk profile for a subcontractor",
  "risk_score_penalty": 20
}

The risk_score_penalty should be:
- 0-5: Standard/fair contract terms
- 6-15: Moderately aggressive, common in commercial construction
- 16-25: Very aggressive, multiple high-risk clauses
- 26-30: Extremely aggressive, recommend legal review before bidding

Contract text:`;

interface ContractRisk {
    type: string; severity: string; classification: string;
    evidence: string; location: string; plainEnglish: string; confidence: number;
}
interface ContractRisks {
    hasContractLanguage: boolean;
    risksDetected: ContractRisk[];
    risksByTier: { high: ContractRisk[]; medium: ContractRisk[]; low: ContractRisk[] };
    riskScorePenalty: number;
    overallRiskLevel: string;
    riskSummary: string;
}

async function detectContractRisks(pdfBase64: string, searchableText: string): Promise<ContractRisks | null> {
    // Quick check: does the text contain contract language?
    const textToCheck = (searchableText || '').substring(0, 10000);
    const hasIndicators = CONTRACT_INDICATORS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(textToCheck));
    if (!hasIndicators) return null;

    try {
        // Run contract risk detection against the full PDF (same as app's fullText analysis)
        const raw = await callClaude(
            [{
                role: 'user',
                content: [
                    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
                    { type: 'text', text: CONTRACT_RISK_PROMPT + '\n[See PDF document above]' }
                ]
            }],
            'You are a construction contract risk analyst. Return JSON only. No preamble. No markdown.',
            { 'anthropic-beta': 'pdfs-2024-09-25' }
        );

        let jsonStr = raw.trim();
        if (jsonStr.includes('```')) {
            const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (m) jsonStr = m[1].trim();
        }
        const parsed = JSON.parse(jsonStr);

        const risksDetected: ContractRisk[] = (parsed.risks_found || []).map((r: Record<string, unknown>) => ({
            type:          String(r.clause_type || r.type || 'unknown_risk'),
            severity:      String(r.severity || 'medium'),
            classification: String(r.classification || r.type || 'Unknown'),
            evidence:      String(r.exact_quote || r.evidence || ''),
            location:      String(r.page_reference || r.location || ''),
            plainEnglish:  String(r.plain_english || ''),
            confidence:    1.0
        }));

        return {
            hasContractLanguage: true,
            risksDetected,
            risksByTier: {
                high:   risksDetected.filter(r => r.severity === 'high'),
                medium: risksDetected.filter(r => r.severity === 'medium'),
                low:    risksDetected.filter(r => r.severity === 'low')
            },
            riskScorePenalty: Number(parsed.risk_score_penalty || 0),
            overallRiskLevel:  String(parsed.overall_risk_level || 'medium'),
            riskSummary:       String(parsed.risk_summary || '')
        };
    } catch (e) {
        console.warn('Contract risk detection failed:', (e as Error).message);
        return null;
    }
}

// ── Contract risk keyword penalty (mirrors app.html calculateContractRiskPenalty) ──

function calculateContractRiskPenalty(risksDetected: ContractRisk[], riskTolerance: string): number {
    if (!risksDetected || risksDetected.length === 0) return 0;
    const basePenalty = riskTolerance === 'low' ? 15 : riskTolerance === 'medium' ? 10 : 5;
    let total = 0;
    for (const risk of risksDetected) {
        const conf = risk.confidence ?? 1.0;
        const multiplier = conf >= 0.80 ? 1.0 : conf >= 0.50 ? 0.6 : 0.3;
        total += basePenalty * multiplier;
    }
    return Math.round(total);
}

// ── Keyword scoring (mirrors app.html calculateScores keyword logic exactly) ──

function searchKeywordsInText(text: string, keywords: string[]): string[] {
    const found: string[] = [];
    for (const kw of keywords) {
        if (!kw || kw.trim().length < 2) continue;
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp('\\b' + escaped + 's?\\b', 'gi');
        if (rx.test(text)) found.push(kw);
    }
    return found;
}

function scoreKeywords(
    scopeText: string,
    goodKeywords: string[],
    badKeywords: string[],
    riskTolerance: string,
    contractRisks: ContractRisks | null,
    weight: number
): { score: number; weight: number; reason: string; goodFound: string[]; badFound: string[] } {
    const goodFound = searchKeywordsInText(scopeText, goodKeywords);
    const badFound  = searchKeywordsInText(scopeText, badKeywords);

    let kwScore = 50;
    if (goodFound.length === 0) {
        kwScore = 30;
    } else {
        kwScore += goodFound.length * 8;
    }

    // Bad keyword penalty (only if contract language present)
    if (contractRisks?.hasContractLanguage && badFound.length > 0) {
        const penalty = riskTolerance === 'low' ? 15 : riskTolerance === 'medium' ? 10 : 5;
        kwScore -= penalty * badFound.length;
    }

    // AI contract risk penalty (same as app)
    let aiRiskPenalty = 0;
    if (contractRisks?.hasContractLanguage && contractRisks.risksDetected?.length > 0) {
        aiRiskPenalty = calculateContractRiskPenalty(contractRisks.risksDetected, riskTolerance);
        kwScore -= aiRiskPenalty;
    }

    kwScore = Math.max(0, Math.min(100, kwScore));
    const aiNote = aiRiskPenalty > 0 ? ` | AI detected ${contractRisks!.risksDetected.length} contract risks (-${aiRiskPenalty})` : '';
    const reason = `Found ${goodFound.length} good terms, ${badFound.length} risk terms${aiNote}`;

    return { score: kwScore, weight, reason, goodFound, badFound };
}

// ── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(messages: unknown[], systemPrompt: string, extraHeaders: Record<string, string> = {}) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            ...extraHeaders
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: systemPrompt,
            messages
        })
    });
    if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.content[0] as { text: string }).text;
}

// ── CSI detection ─────────────────────────────────────────────────────────────

const CSI_DIVISION_PATTERNS = [
    { divs: ['03'], terms: ['concrete', 'cement'] },
    { divs: ['04'], terms: ['masonry', 'brick', 'block', 'stone'] },
    { divs: ['05'], terms: ['metals', 'structural steel', 'steel'] },
    { divs: ['06'], terms: ['carpentry', 'millwork', 'casework', 'wood'] },
    { divs: ['07'], terms: ['roofing', 'waterproofing', 'insulation', 'sealants'] },
    { divs: ['08'], terms: ['doors', 'windows', 'glazing', 'curtain wall', 'storefront'] },
    { divs: ['09'], terms: ['finishes', 'drywall', 'flooring', 'tile', 'carpet', 'painting', 'ceiling', 'acoustical'] },
    { divs: ['10'], terms: ['specialties', 'toilet accessories', 'signage', 'lockers'] },
    { divs: ['21'], terms: ['fire suppression', 'sprinkler', 'fire protection'] },
    { divs: ['22'], terms: ['plumbing', 'sanitary', 'piping'] },
    { divs: ['23'], terms: ['hvac', 'mechanical', 'heating', 'ventilation', 'air conditioning', 'ductwork'] },
    { divs: ['26'], terms: ['electrical', 'power', 'lighting', 'switchgear'] },
    { divs: ['27'], terms: ['communications', 'data', 'network', 'audio visual'] },
    { divs: ['28'], terms: ['security', 'fire alarm', 'access control'] },
    { divs: ['31'], terms: ['earthwork', 'excavation', 'grading', 'demolition'] },
    { divs: ['32'], terms: ['paving', 'landscaping', 'parking lot', 'asphalt'] },
    { divs: ['33'], terms: ['utilities', 'underground', 'storm', 'water main'] },
];

function detectDivisionsFromText(text: string): string[] {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = new Set<string>();
    for (const { divs, terms } of CSI_DIVISION_PATTERNS) {
        if (terms.some(t => lower.includes(t))) divs.forEach(d => found.add(d));
    }
    return [...found];
}

// ── Scoring ──────────────────────────────────────────────────────────────────

interface Settings {
    city: string; state: string; radius: number; locationMatters: boolean;
    trades: string[]; preferred_csi_sections: string[];
    riskTolerance: string; defaultStars: number;
    weights: { location: number; keywords: number; gc: number; trade: number };
}
interface Client { name: string; rating: number; bids: number; wins: number }

async function scoreLocation(city: string | null, state: string | null, settings: Settings) {
    const weight = settings.weights.location;
    if (!settings.locationMatters) return { score: 0, weight, reason: 'Location scoring disabled' };
    if (!settings.city || !settings.state) return { score: 50, weight, reason: 'Office location not set' };
    if (!city && !state) return { score: 50, weight, reason: 'Project location not found in email' };

    const userCoords = await nominatimGeocode(`${settings.city}, ${settings.state}`);
    if (!userCoords) return { score: 50, weight, reason: 'Could not geocode your office address' };

    const projKey = state ? `${city}, ${state}` : city!;
    const projCoords = await nominatimGeocode(projKey);

    if (!projCoords) {
        if (settings.city.toLowerCase().trim() === (city || '').toLowerCase().trim()) {
            return { score: 95, weight, reason: '~5 miles (same city)', details: { dist: 5 } };
        }
        return { score: 50, weight, reason: `Could not geocode project city "${city}"` };
    }

    const dist = Math.round(haversine(userCoords.lat, userCoords.lon, projCoords.lat, projCoords.lon));
    let score = dist <= 25 ? 100 : dist <= 50 ? 85 : dist <= 100 ? 70 : dist <= 150 ? 50 : 30;
    if (dist > settings.radius) score = Math.max(10, score - 20);
    return { score, weight, reason: `${dist} miles from your office`, details: { dist } };
}

function scoreGC(gcName: string | null, settings: Settings, clients: Client[]) {
    const weight = settings.weights.gc;
    if (!gcName) return { score: (settings.defaultStars || 3) * 20, weight, reason: 'GC unknown — using default rating' };
    const nameLower = gcName.toLowerCase().trim();
    const match = clients.find(c => c.name.toLowerCase().trim() === nameLower);
    if (!match) return { score: (settings.defaultStars || 3) * 20, weight, reason: `${gcName} not in your GC list` };
    const score = match.bids > 0 && match.wins > 0
        ? Math.round((match.wins / match.bids) * 100)
        : (match.rating || settings.defaultStars || 3) * 20;
    return { score: Math.max(0, Math.min(100, score)), weight, reason: `${gcName}: ${match.rating || 3}★ rating` };
}

function scoreTrade(scopeText: string, settings: Settings) {
    const weight = settings.weights.trade;
    const detectedDivs = detectDivisionsFromText(scopeText);

    if (settings.preferred_csi_sections?.length > 0) {
        const userDivs = [...new Set(settings.preferred_csi_sections.map(s => s.slice(0, 2).trim()))];
        const foundDivs = userDivs.filter(d => detectedDivs.includes(d));
        const score = foundDivs.length === 0 ? 0 : Math.min(65 + (foundDivs.length - 1) * 5, 100);
        return { score, weight, reason: foundDivs.length === 0 ? 'No matching trades found' : `${foundDivs.length}/${userDivs.length} trade divisions matched` };
    }
    if (!settings.trades?.length) return { score: 50, weight, reason: 'No trades configured' };
    const found = settings.trades.filter(t => detectedDivs.includes(t));
    const score = found.length === 0 ? 0 : Math.min(65 + (found.length - 1) * 5, 100);
    return { score, weight, reason: found.length === 0 ? 'No matching trades found' : `${found.length}/${settings.trades.length} trades matched` };
}

function computeFinalScore(components: Record<string, { score: number; weight: number }>, _contractRisks: ContractRisks | null, _riskTolerance: string) {
    // Contract risk penalty is already baked into the keywords score (same as app.html)
    let final = 0;
    for (const k of ['location', 'keywords', 'gc', 'trade']) {
        const c = components[k];
        if (c && c.weight > 0) final += c.score * (c.weight / 100);
    }
    return Math.round(final);
}

// ── String similarity for merge detection ─────────────────────────────────────

function wordOverlapScore(a: string, b: string): number {
    const stopWords = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'or', 'in', 'at', 'to', 'on', 'is', 'new', 'no', 'not', 'inc', 'llc', 'co']);
    const wordsA = a.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)));
    if (wordsA.length === 0 || wordsB.size === 0) return 0;
    const overlap = wordsA.filter(w => wordsB.has(w)).length;
    return overlap / Math.max(wordsA.length, wordsB.size);
}

function gcNameSimilarity(a: string, b: string): 'exact' | 'fuzzy' | 'none' {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const na = norm(a), nb = norm(b);
    if (na === nb) return 'exact';
    if (na.includes(nb) || nb.includes(na)) return 'fuzzy';
    // Check word overlap
    if (wordOverlapScore(na, nb) > 0.6) return 'fuzzy';
    return 'none';
}

// ── Merge detection ──────────────────────────────────────────────────────────

interface MergeCandidate {
    target_project_id: string;
    confidence: 'high' | 'medium';
    reason: string;
    same_gc: boolean;
    gc_name: string;
}

async function detectMergeCandidates(
    userId: string,
    newProjectId: string,
    extracted: Record<string, unknown>,
    supabase: ReturnType<typeof getSupabase>
): Promise<MergeCandidate[]> {
    const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const { data: recentProjects } = await supabase
        .from('projects')
        .select('id, extracted_data, gcs, gc_bids, created_at')
        .eq('user_id', userId)
        .gte('created_at', cutoff)
        .neq('id', newProjectId)
        .order('created_at', { ascending: false })
        .limit(25);

    if (!recentProjects?.length) return [];

    const newGC = ((extracted.gc_name as string) || '').trim();
    const newName = ((extracted.project_name as string) || '').trim();
    const candidates: MergeCandidate[] = [];

    for (const existing of recentProjects) {
        const ed = (existing.extracted_data as Record<string, string>) || {};
        const existingGC = (ed.gc_name || '').trim();
        const existingName = (ed.project_name || '').trim();

        const gcSim = newGC && existingGC ? gcNameSimilarity(newGC, existingGC) : 'none';
        const nameSim = newName && existingName ? wordOverlapScore(newName, existingName) : 0;
        const projectNameMatch = nameSim > 0.45 && newName.split(/\s+/).length > 1;

        let confidence: 'high' | 'medium' | null = null;
        let reason = '';
        let sameGC = true;

        if (gcSim === 'exact' && projectNameMatch) {
            confidence = 'high';
            reason = `Same GC (${newGC}) and similar project name`;
        } else if (gcSim === 'exact' && !projectNameMatch) {
            confidence = 'medium';
            reason = `Same GC (${newGC}) — verify if same project`;
        } else if (gcSim === 'fuzzy' && projectNameMatch) {
            confidence = 'medium';
            reason = `Similar GC name and project — may be related`;
        } else if (gcSim === 'none' && projectNameMatch && newName.split(/\s+/).length > 2) {
            // Different GC, same project — keep separate (different scores) but flag
            confidence = 'high';
            reason = `Same project from different GC (${newGC} vs ${existingGC}) — scores will differ`;
            sameGC = false;
        }

        if (confidence) {
            candidates.push({
                target_project_id: existing.id,
                confidence,
                reason,
                same_gc: sameGC,
                gc_name: newGC || existingGC
            });
        }
    }

    // Return at most 3 candidates, high confidence first
    return candidates
        .sort((a, b) => (a.confidence === 'high' ? -1 : 1) - (b.confidence === 'high' ? -1 : 1))
        .slice(0, 3);
}

// ── Date formatter ───────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return 'Not found';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Admin event logger ───────────────────────────────────────────────────────

async function logAdminEvent(eventType: string, eventData: Record<string, unknown>, supabase: ReturnType<typeof getSupabase>) {
    try {
        await supabase.from('admin_events').insert({ event_type: eventType, event_data: eventData });
    } catch (e) {
        console.warn('admin_events insert failed:', (e as Error).message);
    }
}

// ── Main processing ──────────────────────────────────────────────────────────

async function processEmail(payload: Record<string, unknown>) {
    const supabase = getSupabase();
    const { To, From, Subject, TextBody, HtmlBody, Attachments } = payload as {
        To: string | Array<{ Email?: string }>;
        From: string;
        Subject: string;
        TextBody?: string;
        HtmlBody?: string;
        Attachments?: Array<{ ContentType: string; Content: string; Name: string }>;
    };

    // 1. Extract alias from To address
    const toRaw = Array.isArray(To) ? (To[0]?.Email || String(To[0] || '')) : String(To || '');
    const angleMatch = toRaw.match(/<([^>]+)>/);
    const toAddress = angleMatch ? angleMatch[1].trim() : toRaw.trim();
    const aliasMatch = toAddress.match(/^([^@]+)@bids\.bidintell\.ai/i);

    if (!aliasMatch) {
        await logAdminEvent('email_forward_received', { error: 'no_alias_match', to: toAddress }, supabase);
        return;
    }
    const alias = aliasMatch[1].toLowerCase();

    // 2. Look up user by alias
    const { data: userRow } = await supabase
        .from('user_settings')
        .select('user_id, user_email, company_name, city, state, search_radius, location_matters, trades, preferred_csi_sections, risk_tolerance, default_stars, weights')
        .eq('email_alias', alias)
        .maybeSingle();

    if (!userRow) {
        await logAdminEvent('email_forward_received', { error: 'alias_not_found', alias }, supabase);
        return;
    }

    const userId = userRow.user_id as string;
    let userEmail = (userRow.user_email as string) || null;

    // Fetch user keywords for scoring
    const { data: kwRow } = await supabase
        .from('user_keywords')
        .select('good_keywords, bad_keywords')
        .eq('user_id', userId)
        .maybeSingle();
    const goodKeywords: string[] = (kwRow?.good_keywords as string[]) || [];
    const badKeywords:  string[] = (kwRow?.bad_keywords  as string[]) || [];

    if (!userEmail) {
        try {
            const { data: authData } = await supabase.auth.admin.getUserById(userId);
            userEmail = authData?.user?.email || null;
        } catch (e) {
            console.warn('Auth email lookup failed:', (e as Error).message);
        }
    }
    if (!userEmail) {
        await logAdminEvent('email_forward_received', { error: 'no_reply_email', alias, user_id: userId }, supabase);
        return;
    }

    // Normalize settings
    const rawWeights = (userRow.weights as Record<string, number>) || {};
    const settings: Settings = {
        city:                   (userRow.city as string) || '',
        state:                  (userRow.state as string) || '',
        radius:                 (userRow.search_radius as number) || 50,
        locationMatters:        userRow.location_matters !== false,
        trades:                 (userRow.trades as string[]) || [],
        preferred_csi_sections: (userRow.preferred_csi_sections as string[]) || [],
        riskTolerance:          (userRow.risk_tolerance as string) || 'medium',
        defaultStars:           (userRow.default_stars as number) || 3,
        weights: {
            location: rawWeights.location ?? 25,
            keywords: rawWeights.keywords ?? 30,
            gc:       rawWeights.gc       ?? 25,
            trade:    rawWeights.trade    ?? 20
        }
    };

    // 3. Load clients for GC scoring
    const { data: clients } = await supabase
        .from('clients')
        .select('name, rating, bids, wins')
        .eq('user_id', userId);

    // 4. Build email content string
    let emailContent = (TextBody || (HtmlBody || '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000);

    // 5. Extract project data from email via Claude
    const extractionSystemPrompt = 'You are extracting structured data from a construction bid document email. Return JSON only. No preamble. No markdown.';
    const extractionUserPrompt =
        `Extract the following fields from this bid document email. Use null for any field not explicitly stated — do not guess.\n\n` +
        `{"gc_name":string|null,"project_name":string|null,"project_city":string|null,"project_state":string|null,"project_address":string|null,"bid_due_date":string|null,"scope_description":string|null,"trade_keywords":string[],"bond_required":boolean|null,"estimated_value":number|null}\n\n` +
        `Sender: ${From}\nSubject: ${Subject || ''}\nEmail body:\n${emailContent}`;

    let extracted: Record<string, unknown> = {};
    try {
        const raw = await callClaude([{ role: 'user', content: extractionUserPrompt }], extractionSystemPrompt);
        extracted = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
    } catch (e) {
        console.warn('Email extraction parse failed:', (e as Error).message);
    }

    // 6. GC name fallback
    if (!extracted.gc_name) {
        // Try to extract original sender from forwarded message headers in email body
        // Covers: "From: ABC GC <email>" patterns in forwarded email body
        const fwdFromMatch = emailContent.match(/(?:^|\n)From:\s*([^\n<]+?)(?:\s*<[^>]+>)?\s*\n/i);
        if (fwdFromMatch) {
            const candidate = fwdFromMatch[1].trim();
            // Only use if it looks like a company name (not an email address)
            if (candidate && !candidate.includes('@') && candidate.length > 2) {
                extracted.gc_name = candidate;
            }
        }
        // Fallback: use display name from From field (not domain — avoids pulling user's own domain)
        if (!extracted.gc_name) {
            const displayMatch = (From || '').match(/^(.+?)\s*</);
            if (displayMatch) {
                extracted.gc_name = displayMatch[1].trim();
            }
        }
    }

    // 7. Process PDF attachments
    const allAttachments = Array.isArray(Attachments) ? Attachments : [];
    const hadAttachments = allAttachments.length > 0;
    const skippedFiles: string[] = [];
    let processedCount = 0;
    let contractRisks: ContractRisks | null = null;

    const qualifying = allAttachments
        .filter(att => {
            const isPdf = (att.ContentType || '').includes('pdf') || (att.Name || '').toLowerCase().endsWith('.pdf');
            if (!isPdf) return false;
            // Decode to check actual size (~25MB SendGrid ceiling)
            const bytes = atob(att.Content || '').length;
            if (bytes > 25 * 1024 * 1024) {
                skippedFiles.push(att.Name || 'attachment');
                return false;
            }
            return true;
        })
        .slice(0, MAX_ATTACHMENTS);

    for (const att of qualifying) {
        try {
            const pdfBase64 = att.Content;

            // Extract from PDF via Claude document API
            // Note: Storage upload removed — decoding base64 to Uint8Array spikes memory ~80MB
            // and exceeds Supabase Edge Function's 150MB limit for large PDFs.
            const pdfSystemPrompt = 'You are extracting structured project data from a construction bid document PDF. Return JSON only. No preamble. No markdown.';
            const pdfUserPrompt =
                `Extract these fields from the PDF. Use null if not found.\n\n` +
                `{"gc_name":string|null,"project_name":string|null,"project_city":string|null,"project_state":string|null,"project_address":string|null,"bid_due_date":string|null,"scope_description":string|null,"trade_keywords":string[],"bond_required":boolean|null,"estimated_value":number|null,"contract_risk_flags":string[],"searchable_text":string}\n\n` +
                `For "searchable_text": concatenate ALL text from the document that describes scope of work, specifications, materials, products, systems, CSI division/section headings, general notes, and schedule items. This is used for keyword searching — include product names, brand names, material types, spec section titles, and trade descriptions. Aim for 2000-4000 characters of the most relevant content.`;

            const pdfRaw = await callClaude(
                [{
                    role: 'user',
                    content: [
                        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
                        { type: 'text', text: pdfUserPrompt }
                    ]
                }],
                pdfSystemPrompt,
                { 'anthropic-beta': 'pdfs-2024-09-25' }
            );

            let pdfExtracted: Record<string, unknown> = {};
            try { pdfExtracted = JSON.parse(pdfRaw.replace(/```json\n?|```/g, '').trim()); } catch { /* use empty */ }

            // Merge: PDF wins over email for non-null fields
            for (const key of ['gc_name', 'project_name', 'project_city', 'project_state', 'project_address', 'bid_due_date', 'scope_description', 'bond_required', 'estimated_value']) {
                if (pdfExtracted[key] != null) extracted[key] = pdfExtracted[key];
            }
            if (Array.isArray(pdfExtracted.trade_keywords) && pdfExtracted.trade_keywords.length > 0) {
                const existing = (extracted.trade_keywords as string[]) || [];
                extracted.trade_keywords = [...new Set([...existing, ...(pdfExtracted.trade_keywords as string[])])];
            }
            // Accumulate searchable text from PDF for keyword + trade scoring
            if (typeof pdfExtracted.searchable_text === 'string' && pdfExtracted.searchable_text.length > 0) {
                const existing = (extracted.searchable_text as string) || '';
                extracted.searchable_text = existing ? existing + '\n' + pdfExtracted.searchable_text : pdfExtracted.searchable_text;
            }

            // Full contract risk detection — same prompt and logic as app.html detectContractRisks()
            const detectedRisks = await detectContractRisks(pdfBase64, (extracted.searchable_text as string) || '');
            if (detectedRisks) contractRisks = detectedRisks;

            processedCount++;
        } catch (e) {
            console.warn('Attachment processing failed:', (e as Error).message);
        }
    }

    // 8. Scope text for trade + keyword scoring
    // searchable_text from PDF extraction gives full spec/scope content (same depth as app upload)
    const scopeText = [
        (extracted.searchable_text as string) || '',
        (extracted.scope_description as string) || '',
        ((extracted.trade_keywords as string[]) || []).join(' '),
        Subject || ''
    ].join(' ');

    // 9. Score components
    const [locComp, trComp] = await Promise.all([
        scoreLocation(extracted.project_city as string | null, extracted.project_state as string | null, settings),
        Promise.resolve(scoreTrade(scopeText, settings))
    ]);
    const gcComp  = scoreGC(extracted.gc_name as string | null, settings, (clients as Client[]) || []);
    const kwResult = scoreKeywords(scopeText, goodKeywords, badKeywords, settings.riskTolerance, contractRisks, settings.weights.keywords);
    const kwComp   = { score: kwResult.score, weight: kwResult.weight, reason: kwResult.reason };

    const components = { location: locComp, keywords: kwComp, gc: gcComp, trade: trComp };
    const finalScore = computeFinalScore(components, contractRisks, settings.riskTolerance);
    const recommendation = finalScore >= 80 ? 'GO' : finalScore >= 60 ? 'REVIEW CAREFULLY' : 'PASS';

    const scores = { final: finalScore, recommendation, components, source: 'email_forward' };

    // 10. Build gc_bid entry for this GC
    const gcBidEntry = {
        gc_name:        extracted.gc_name || null,
        scores,
        files:          qualifying.map(a => ({ name: a.Name || 'attachment.pdf', size: null })),
        contract_risks: contractRisks,
        bid_due_date:   extracted.bid_due_date || null,
        estimated_value: extracted.estimated_value || null,
        source:         'email_forward',
        outcome:        'pending',
        outcome_data:   {},
        email_from:     From || null,
        email_subject:  Subject || null
    };

    // 11. Save project record
    const now = new Date();
    let savedProjectId: string | null = null;
    try {
        const { data: proj, error: projErr } = await supabase
            .from('projects')
            .insert({
                user_id:       userId,
                created_at:    now.toISOString(),
                created_year:  now.getFullYear(),
                created_month: now.getMonth() + 1,
                created_week:  Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 3600000)),
                extracted_data: {
                    gc_name:         extracted.gc_name || null,
                    project_name:    extracted.project_name || Subject || 'Forwarded Bid',
                    project_city:    extracted.project_city || null,
                    project_state:   extracted.project_state || null,
                    project_address: extracted.project_address || null,
                    bid_deadline:    extracted.bid_due_date || null,
                    estimated_value: extracted.estimated_value || null,
                    scope_summary:   extracted.scope_description || null,
                    bond_required:   extracted.bond_required || null,
                    source:          'email_forward',
                    email_from:      From || null,
                    email_subject:   Subject || null
                },
                scores,
                gc_bids:       [gcBidEntry],
                gcs:           extracted.gc_name ? [{ name: extracted.gc_name }] : [],
                files:         qualifying.map(a => ({ name: a.Name || 'attachment.pdf', size: null })),
                contract_risks: contractRisks,
                good_found:    kwResult.goodFound.map(kw => ({ keyword: kw, pages: [], locations: [] })),
                bad_found:     kwResult.badFound.map(kw => ({ keyword: kw, pages: [], locations: [] })),
                outcome:       'pending',
                full_text:     null
            })
            .select('id')
            .single();

        if (!projErr && proj) savedProjectId = (proj as { id: string }).id;
    } catch (e) {
        console.error('Project save failed:', (e as Error).message);
    }

    // 12. Detect merge candidates
    let mergeSuggestions: MergeCandidate[] = [];
    if (savedProjectId) {
        try {
            mergeSuggestions = await detectMergeCandidates(userId, savedProjectId, extracted, supabase);
            for (const candidate of mergeSuggestions) {
                await supabase.from('merge_suggestions').insert({
                    user_id:           userId,
                    source_project_id: savedProjectId,
                    target_project_id: candidate.target_project_id,
                    confidence:        candidate.confidence,
                    reason:            candidate.reason,
                    same_gc:           candidate.same_gc,
                    gc_name:           candidate.gc_name,
                    status:            'pending'
                });
            }
        } catch (e) {
            console.warn('Merge detection failed:', (e as Error).message);
        }
    }

    // 13. Send reply email
    const projectName = (extracted.project_name as string) || Subject || 'New Bid';
    const gcName      = (extracted.gc_name as string) || 'Unknown GC';
    const replySubject = `BidIndex Score: ${finalScore}/100 — ${projectName} (${gcName})`;
    const topRisk = contractRisks?.risks_found?.[0];

    const topMergeSuggestion = mergeSuggestions[0];
    const mergeNote = topMergeSuggestion
        ? `\n⚠️  Possible duplicate detected (${topMergeSuggestion.confidence} confidence): ${topMergeSuggestion.reason}.\n   Review and merge in app → https://bidintell.ai/app.html`
        : null;

    const replyLines = [
        `─────────────────────────────────`,
        `BidIndex Score: ${finalScore}/100 — ${recommendation}`,
        `─────────────────────────────────`,
        ``,
        `${gcName} | ${projectName}`,
        extracted.project_city && extracted.project_state ? `${extracted.project_city}, ${extracted.project_state}` : ((extracted.project_city as string) || (extracted.project_state as string) || ''),
        `Bid Due: ${formatDate((extracted.bid_due_date as string) || null)}`,
        ``,
        `SCORE BREAKDOWN`,
        `Location Match:   ${locComp.score}/100 (weight ${locComp.weight}%)`,
        `Trade Match:      ${trComp.score}/100 (weight ${trComp.weight}%)`,
        `Client Relationship: ${gcComp.score}/100 (weight ${gcComp.weight}%)`,
        `Keywords:         ${kwComp.score}/100 (weight ${kwComp.weight}%) — neutral for email forwards`,
        contractRisks?.risksDetected?.length
            ? `Contract Risks:   ${contractRisks.risksDetected.length} clause(s) detected — see full report`
            : null,
        ``,
        topRisk ? `⚠️  ${topRisk.clause_type || 'Contract risk flag'}` : null,
        extracted.bond_required === true ? `⚠️  Bond required` : null,
        skippedFiles.length > 0
            ? `⚠️  ${skippedFiles.join(', ')} was too large and skipped. Score based on email content only — upload manually for full contract analysis.`
            : null,
        mergeNote,
        ``,
        `─────────────────────────────────`,
        `View full report → https://bidintell.ai/app.html`,
        `─────────────────────────────────`,
        ``,
        `Powered by BidIntell · bidintell.ai`
    ].filter(line => line !== null).join('\n');

    let replyStatus: Record<string, unknown> = {};
    try {
        const replyRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'BidIntell <hello@bidintell.ai>',
                to: [userEmail],
                bcc: ['ryan@bidintell.ai'],
                subject: replySubject,
                text: replyLines
            })
        });
        replyStatus = { ok: replyRes.ok, status: replyRes.status };
        if (!replyRes.ok) {
            const errText = await replyRes.text().catch(() => '');
            replyStatus.error = errText;
        }
    } catch (e) {
        replyStatus = { ok: false, error: (e as Error).message };
    }

    // 14. Log admin event
    await logAdminEvent('email_forward_received', {
        alias,
        gc_name:               gcName,
        score:                 finalScore,
        had_attachments:       hadAttachments,
        processed_attachments: processedCount,
        skipped_attachments:   skippedFiles.length,
        merge_suggestions:     mergeSuggestions.length,
        reply_status:          replyStatus,
        user_id:               userId,
        project_id:            savedProjectId
    }, supabase);
}

// ── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('ok', { status: 200 });
    }

    let payload: Record<string, unknown>;
    try {
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            // SendGrid Inbound Parse sends multipart/form-data
            const formData = await req.formData();
            const numAttachments = parseInt((formData.get('attachments') as string) || '0', 10);

            const attachments: Array<{ ContentType: string; Content: string; Name: string }> = [];
            for (let i = 1; i <= numAttachments; i++) {
                const file = formData.get(`attachment${i}`) as File | null;
                if (file) {
                    const buffer = await file.arrayBuffer();
                    attachments.push({
                        ContentType: file.type || 'application/octet-stream',
                        Content: arrayBufferToBase64(buffer),
                        Name: file.name || `attachment${i}`
                    });
                }
            }

            payload = {
                To:          (formData.get('to')      as string) || '',
                From:        (formData.get('from')     as string) || '',
                Subject:     (formData.get('subject')  as string) || '',
                TextBody:    (formData.get('text')     as string) || '',
                HtmlBody:    (formData.get('html')     as string) || '',
                Attachments: attachments
            };
        } else {
            // JSON fallback for local testing
            payload = await req.json();
        }
    } catch {
        return new Response('ok', { status: 200 });
    }

    // Return 200 to SendGrid immediately, process async in background
    EdgeRuntime.waitUntil(processEmail(payload).catch(e => console.error('processEmail error:', e)));
    return new Response('ok', { status: 200 });
});
