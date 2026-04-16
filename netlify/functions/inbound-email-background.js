// netlify/functions/inbound-email-background.js
// Postmark inbound webhook handler (Background Function — returns 202 immediately,
// processes up to 15 minutes). Receives forwarded bid documents, extracts project
// data via Claude, scores the bid, saves a project record, and replies with score.
//
// SETUP REQUIRED (do not deploy without completing these):
// 1. Postmark Dashboard → Servers → [your server] → Settings → Inbound
//    Set webhook URL to: https://bidintell.ai/.netlify/functions/inbound-email-background
// 2. Namecheap DNS: Add MX record
//    Host: bids  |  Value: inbound.postmarkapp.com  |  Priority: 10
// 3. POSTMARK_API_KEY already in Netlify env — confirm inbound is enabled on the server
// 4. SUPABASE_SERVICE_KEY needed (admin lookup by alias, bypasses RLS)
//    Confirm both are set in Netlify → Site Settings → Environment Variables
//
// Env vars used:
//   CLAUDE_API_KEY
//   POSTMARK_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CLAUDE_API_KEY      = process.env.CLAUDE_API_KEY;
const POSTMARK_API_KEY    = process.env.POSTMARK_API_KEY;

const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024; // 4MB — Netlify hard-rejects payloads >6MB; 4MB raw = ~5.3MB base64, safe headroom
const MAX_ATTACHMENTS = 3;

// ── Supabase admin client (bypasses RLS) ─────────────────────────────────────
let _supabase = null;
function getSupabase() {
    if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return _supabase;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function nominatimGeocode(query, cache) {
    if (cache.has(query)) return cache.get(query);
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
        const res = await fetch(url, { headers: { 'User-Agent': 'BidIntell/1.0 hello@bidintell.ai' } });
        if (!res.ok) { cache.set(query, null); return null; }
        const data = await res.json();
        const coords = data.length > 0
            ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
            : null;
        cache.set(query, coords);
        return coords;
    } catch {
        cache.set(query, null);
        return null;
    }
}

// ── Claude API call ───────────────────────────────────────────────────────────

async function callClaude(messages, systemPrompt, extraHeaders = {}) {
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
    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
}

// ── Scoring helpers (mirrors bc-sync.js) ─────────────────────────────────────

const CSI_DIVISION_PATTERNS = [
    { divs: ['03'], terms: ['concrete', 'cement'] },
    { divs: ['04'], terms: ['masonry', 'brick', 'block', 'stone'] },
    { divs: ['05'], terms: ['metals', 'structural steel', 'steel'] },
    { divs: ['06'], terms: ['carpentry', 'millwork', 'casework', 'wood'] },
    { divs: ['07'], terms: ['roofing', 'waterproofing', 'insulation', 'sealants'] },
    { divs: ['08'], terms: ['doors', 'windows', 'glazing', 'curtain wall', 'storefront'] },
    { divs: ['09'], terms: ['finishes', 'drywall', 'flooring', 'tile', 'carpet', 'painting', 'ceiling', 'acoustical'] },
    { divs: ['10'], terms: ['specialties', 'toilet accessories', 'signage', 'lockers'] },
    { divs: ['11'], terms: ['equipment', 'food service', 'medical equipment'] },
    { divs: ['12'], terms: ['furnishings', 'furniture', 'blinds'] },
    { divs: ['14'], terms: ['elevators', 'conveying', 'lifts'] },
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

function detectDivisionsFromText(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = new Set();
    for (const { divs, terms } of CSI_DIVISION_PATTERNS) {
        if (terms.some(t => lower.includes(t))) divs.forEach(d => found.add(d));
    }
    return [...found];
}

async function scoreLocation(city, state, settings, geocodeCache) {
    const weight = settings.weights.location;
    if (!settings.locationMatters) return { score: 0, weight, reason: 'Location scoring disabled' };
    if (!settings.city || !settings.state) return { score: 50, weight, reason: 'Office location not set' };
    if (!city && !state) return { score: 50, weight, reason: 'Project location not found in email' };

    const userKey = `${settings.city}, ${settings.state}`;
    const userCoords = await nominatimGeocode(userKey, geocodeCache);
    if (!userCoords) return { score: 50, weight, reason: 'Could not geocode your office address' };

    const projKey = state ? `${city}, ${state}` : city;
    const projCoords = await nominatimGeocode(projKey, geocodeCache);

    if (!projCoords) {
        if (settings.city.toLowerCase().trim() === (city || '').toLowerCase().trim()) {
            return { score: 95, weight, reason: `~5 miles (same city)`, details: { dist: 5 } };
        }
        return { score: 50, weight, reason: `Could not geocode project city "${city}"` };
    }

    const dist = Math.round(haversine(userCoords.lat, userCoords.lon, projCoords.lat, projCoords.lon));
    let score = dist <= 25 ? 100 : dist <= 50 ? 85 : dist <= 100 ? 70 : dist <= 150 ? 50 : 30;
    if (dist > settings.radius) score = Math.max(10, score - 20);
    return { score, weight, reason: `${dist} miles from your office`, details: { dist } };
}

function scoreGC(gcName, settings, clients) {
    const weight = settings.weights.gc;
    if (!gcName) {
        return { score: (settings.defaultStars || 3) * 20, weight, reason: 'GC unknown — using default rating' };
    }
    const nameLower = gcName.toLowerCase().trim();
    const match = (clients || []).find(c => c.name.toLowerCase().trim() === nameLower);
    if (!match) {
        return { score: (settings.defaultStars || 3) * 20, weight, reason: `${gcName} not in your GC list` };
    }
    const score = match.bids > 0 && match.wins > 0
        ? Math.round((match.wins / match.bids) * 100)
        : (match.rating || settings.defaultStars || 3) * 20;
    return { score: Math.max(0, Math.min(100, score)), weight, reason: `${gcName}: ${match.rating || 3}★ rating` };
}

function scoreTrade(scopeText, settings) {
    const weight = settings.weights.trade;
    const detectedDivs = detectDivisionsFromText(scopeText);

    if (settings.preferred_csi_sections && settings.preferred_csi_sections.length > 0) {
        const userDivs = [...new Set(settings.preferred_csi_sections.map(s => s.slice(0, 2).trim()))];
        const foundDivs = userDivs.filter(d => detectedDivs.includes(d));
        const score = foundDivs.length === 0 ? 0 : Math.min(65 + (foundDivs.length - 1) * 5, 100);
        return { score, weight, reason: foundDivs.length === 0 ? 'No matching trades found' : `${foundDivs.length}/${userDivs.length} trade divisions matched` };
    }

    if (!settings.trades || settings.trades.length === 0) {
        return { score: 50, weight, reason: 'No trades configured' };
    }
    const found = settings.trades.filter(t => detectedDivs.includes(t));
    const score = found.length === 0 ? 0 : Math.min(65 + (found.length - 1) * 5, 100);
    return { score, weight, reason: found.length === 0 ? 'No matching trades found' : `${found.length}/${settings.trades.length} trades matched` };
}

function scoreContract(contractRisks) {
    if (!contractRisks) return null;
    const penalty = contractRisks.risk_score_penalty || 0;
    return { score: Math.max(0, 100 - penalty * 2), weight: 0, reason: `Risk penalty: ${penalty}` };
}

// ── Format bid due date for plain-text email ──────────────────────────────────

function formatDate(iso) {
    if (!iso) return 'Not found';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Admin event logger (fire-and-forget) ─────────────────────────────────────

async function logAdminEvent(eventType, eventData) {
    try {
        await getSupabase().from('admin_events').insert({ event_type: eventType, event_data: eventData });
    } catch (e) {
        console.warn('admin_events insert failed:', e.message);
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    // Postmark sends POST; always return 200 to prevent retries
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: 'ok' };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 200, body: 'ok' };
    }

    const { To, From, Subject, TextBody, HtmlBody, Attachments } = payload;

    // 1. Extract alias from To address
    //    e.g. "acme-electric@bids.bidintell.ai" → "acme-electric"
    const toRaw = Array.isArray(To)
        ? (To[0]?.Email || To[0] || '')
        : (typeof To === 'string' ? To : '');

    // Strip display name — handle "Display Name <email@domain>" and bare "email@domain"
    const angleMatch = toRaw.match(/<([^>]+)>/);
    const toAddress = angleMatch ? angleMatch[1].trim() : toRaw.trim();

    const aliasMatch = toAddress.match(/^([^@]+)@bids\.bidintell\.ai/i);
    if (!aliasMatch) {
        await logAdminEvent('email_forward_received', { error: 'no_alias_match', to: toAddress });
        return { statusCode: 200, body: 'ok' };
    }
    const alias = aliasMatch[1].toLowerCase();

    // 2. Look up user by alias (service role bypasses RLS)
    const { data: userRow } = await getSupabase()
        .from('user_settings')
        .select('user_id, user_email, company_name, city, state, search_radius, location_matters, trades, preferred_csi_sections, risk_tolerance, default_stars, weights')
        .eq('email_alias', alias)
        .maybeSingle();

    if (!userRow) {
        await logAdminEvent('email_forward_received', { error: 'alias_not_found', alias });
        return { statusCode: 200, body: 'ok' };
    }

    const userId = userRow.user_id;
    let userEmail = userRow.user_email || null;

    // Fall back to auth email if settings email not filled in
    if (!userEmail) {
        try {
            const { data: authData } = await getSupabase().auth.admin.getUserById(userId);
            userEmail = authData?.user?.email || null;
        } catch (e) {
            console.warn('Auth email lookup failed:', e.message);
        }
    }

    if (!userEmail) {
        await logAdminEvent('email_forward_received', { error: 'no_reply_email', alias, user_id: userId });
        return { statusCode: 200, body: 'ok' };
    }

    // Normalize settings for scoring helpers
    const rawWeights = userRow.weights || {};
    const settings = {
        city:                   userRow.city || '',
        state:                  userRow.state || '',
        radius:                 userRow.search_radius || 50,
        locationMatters:        userRow.location_matters !== false,
        trades:                 userRow.trades || [],
        preferred_csi_sections: userRow.preferred_csi_sections || [],
        riskTolerance:          userRow.risk_tolerance || 'medium',
        defaultStars:           userRow.default_stars || 3,
        weights: {
            location: rawWeights.location ?? 25,
            keywords: rawWeights.keywords ?? 30,
            gc:       rawWeights.gc       ?? 25,
            trade:    rawWeights.trade    ?? 20
        }
    };

    // 3. Load user's clients for GC scoring
    const { data: clients } = await getSupabase()
        .from('clients')
        .select('name, rating, bids, wins')
        .eq('user_id', userId);

    // 4. Build email content string (prefer TextBody, trim to 8000 chars)
    let emailContent = (TextBody || (HtmlBody || '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000);

    // 5. Extract project data from email via Claude
    const extractionSystemPrompt =
        'You are extracting structured data from a construction bid document email. ' +
        'Return JSON only. No preamble. No markdown. No explanation.';

    const extractionUserPrompt =
        `Extract the following fields from this bid document email. ` +
        `Use null for any field not explicitly stated — do not guess.\n\n` +
        `{\n` +
        `  "gc_name": string | null,\n` +
        `  "project_name": string | null,\n` +
        `  "project_city": string | null,\n` +
        `  "project_state": string | null,\n` +
        `  "project_address": string | null,\n` +
        `  "bid_due_date": string | null,\n` +
        `  "scope_description": string | null,\n` +
        `  "trade_keywords": string[],\n` +
        `  "bond_required": boolean | null,\n` +
        `  "estimated_value": number | null\n` +
        `}\n\n` +
        `Sender name/domain: ${From}\n` +
        `Subject: ${Subject || ''}\n` +
        `Email body:\n${emailContent}`;

    let extracted = {};
    try {
        const raw = await callClaude(
            [{ role: 'user', content: extractionUserPrompt }],
            extractionSystemPrompt
        );
        extracted = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
    } catch (e) {
        console.warn('Email extraction parse failed:', e.message);
        extracted = {};
    }

    // 6. GC name fallback: parse from From header
    if (!extracted.gc_name) {
        const displayMatch = (From || '').match(/^(.+?)\s*</);
        if (displayMatch) {
            extracted.gc_name = displayMatch[1].trim();
        } else {
            const domainMatch = (From || '').match(/@([^.]+)/);
            extracted.gc_name = domainMatch ? domainMatch[1] : null;
        }
    }

    // 7. Process PDF attachments
    const allAttachments = Array.isArray(Attachments) ? Attachments : [];
    const hadAttachments = allAttachments.length > 0;
    const skippedFiles = [];
    let processedCount = 0;
    let contractRisks = null;

    const qualifying = allAttachments
        .filter(att => {
            if (!(att.ContentType || '').includes('pdf')) return false;
            const bytes = Buffer.from(att.Content || '', 'base64').length;
            if (bytes > MAX_ATTACHMENT_SIZE_BYTES) {
                skippedFiles.push(att.Name || 'attachment');
                return false;
            }
            return true;
        })
        .slice(0, MAX_ATTACHMENTS);

    for (const att of qualifying) {
        try {
            const pdfBase64 = att.Content;
            const filename  = att.Name || `inbound-${Date.now()}.pdf`;

            // Upload to Supabase Storage
            const storagePath = `users/${userId}/inbound/${filename}`;
            await getSupabase().storage
                .from('bid-documents')
                .upload(storagePath, Buffer.from(pdfBase64, 'base64'), {
                    contentType: 'application/pdf',
                    upsert: true
                });

            // Extract project details from PDF via Claude (document API)
            const pdfSystemPrompt =
                'You are extracting structured project data from a construction bid document PDF. ' +
                'Return JSON only. No preamble. No markdown.';

            const pdfUserPrompt =
                `Extract these fields from the PDF. Use null if not found.\n\n` +
                `{\n` +
                `  "gc_name": string | null,\n` +
                `  "project_name": string | null,\n` +
                `  "project_city": string | null,\n` +
                `  "project_state": string | null,\n` +
                `  "project_address": string | null,\n` +
                `  "bid_due_date": string | null,\n` +
                `  "scope_description": string | null,\n` +
                `  "trade_keywords": string[],\n` +
                `  "bond_required": boolean | null,\n` +
                `  "estimated_value": number | null,\n` +
                `  "contract_risk_flags": string[]\n` +
                `}`;

            const pdfRaw = await callClaude(
                [{
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: pdfBase64
                            }
                        },
                        { type: 'text', text: pdfUserPrompt }
                    ]
                }],
                pdfSystemPrompt,
                { 'anthropic-beta': 'pdfs-2024-09-25' }
            );

            let pdfExtracted = {};
            try {
                pdfExtracted = JSON.parse(pdfRaw.replace(/```json\n?|```/g, '').trim());
            } catch {
                pdfExtracted = {};
            }

            // Merge: PDF fields take priority over email fields where both exist
            for (const key of ['gc_name', 'project_name', 'project_city', 'project_state',
                                'project_address', 'bid_due_date', 'scope_description',
                                'bond_required', 'estimated_value']) {
                if (pdfExtracted[key] != null) extracted[key] = pdfExtracted[key];
            }
            if (pdfExtracted.trade_keywords && pdfExtracted.trade_keywords.length > 0) {
                const existing = extracted.trade_keywords || [];
                extracted.trade_keywords = [...new Set([...existing, ...pdfExtracted.trade_keywords])];
            }

            // Build basic contract risks from PDF flags
            if (pdfExtracted.contract_risk_flags && pdfExtracted.contract_risk_flags.length > 0) {
                const penalty = pdfExtracted.contract_risk_flags.length * 6;
                contractRisks = {
                    risks_found: pdfExtracted.contract_risk_flags.map(f => ({ clause_type: f, severity: 'medium' })),
                    risk_score_penalty: Math.min(penalty, 30)
                };
            }

            processedCount++;
        } catch (e) {
            console.warn('Attachment processing failed:', e.message);
        }
    }

    // 8. Build score text for scope matching
    const scopeText = [
        extracted.scope_description || '',
        (extracted.trade_keywords || []).join(' '),
        Subject || ''
    ].join(' ');

    // 9. Score components
    const geocodeCache = new Map();
    const [locComp, gcComp, trComp] = await Promise.all([
        scoreLocation(extracted.project_city, extracted.project_state, settings, geocodeCache),
        Promise.resolve(scoreGC(extracted.gc_name, settings, clients || [])),
        Promise.resolve(scoreTrade(scopeText, settings))
    ]);

    // Keywords score: neutral for email-forwarded bids (no good/bad keyword data available here)
    const kwComp = { score: 50, weight: settings.weights.keywords, reason: 'Email forward — keyword scoring uses bid text' };

    const contractComp = contractRisks ? scoreContract(contractRisks) : null;

    const components = { location: locComp, keywords: kwComp, gc: gcComp, trade: trComp };

    let final = 0;
    for (const k of ['location', 'keywords', 'gc', 'trade']) {
        const c = components[k];
        if (c && c.weight > 0) final += c.score * (c.weight / 100);
    }
    if (contractComp) {
        const penalty = contractRisks.risk_score_penalty || 0;
        const scale = settings.riskTolerance === 'low' ? 1.0 : settings.riskTolerance === 'medium' ? 0.6 : 0.3;
        final = Math.max(0, final - penalty * scale);
    }
    final = Math.round(final);
    const recommendation = final >= 80 ? 'GO' : final >= 60 ? 'REVIEW CAREFULLY' : 'PASS';

    const scores = { final, recommendation, components, source: 'email_forward' };

    // 10. Save project record
    const now = new Date();
    let savedProjectId = null;
    try {
        const { data: proj, error: projErr } = await getSupabase()
            .from('projects')
            .insert({
                user_id:      userId,
                created_at:   now.toISOString(),
                created_year:  now.getFullYear(),
                created_month: now.getMonth() + 1,
                created_week:  Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 3600000)),
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
                contract_risks: contractRisks || null,
                gcs:       extracted.gc_name ? [{ name: extracted.gc_name }] : [],
                files:     qualifying.map(a => ({ name: a.Name || 'attachment.pdf', size: null })),
                outcome:   'pending',
                full_text: null
            })
            .select('id')
            .single();

        if (!projErr && proj) savedProjectId = proj.id;
    } catch (e) {
        console.error('Project save failed:', e.message);
    }

    // 11. Send reply email
    const projectName = extracted.project_name || Subject || 'New Bid';
    const gcName      = extracted.gc_name || 'Unknown GC';
    const replySubject = `BidIndex Score: ${final}/100 — ${projectName} (${gcName})`;

    const topRisk = contractRisks?.risks_found?.[0];

    const replyLines = [
        `─────────────────────────────────`,
        `BidIndex Score: ${final}/100 — ${recommendation}`,
        `─────────────────────────────────`,
        ``,
        `${gcName} | ${projectName}`,
        extracted.project_city && extracted.project_state
            ? `${extracted.project_city}, ${extracted.project_state}`
            : (extracted.project_city || extracted.project_state || ''),
        `Bid Due: ${formatDate(extracted.bid_due_date)}`,
        ``,
        `SCORE BREAKDOWN`,
        `Location Match:   ${locComp.score}/100 (weight ${locComp.weight}%)`,
        `Trade Match:      ${trComp.score}/100 (weight ${trComp.weight}%)`,
        `Client Relationship: ${gcComp.score}/100 (weight ${gcComp.weight}%)`,
        `Keywords:         ${kwComp.score}/100 (weight ${kwComp.weight}%) — neutral for email forwards`,
        contractComp
            ? `Contract Terms:   ${contractComp.score}/100 (weight ${gcComp.weight}%)`
            : `Contract Terms:   Pending — upload documents for full analysis`,
        ``,
        topRisk ? `\u26A0\uFE0F  ${topRisk.clause_type || topRisk.plain_english || 'Contract risk flag'}` : null,
        extracted.bond_required === true ? `\u26A0\uFE0F  Bond required` : null,
        skippedFiles.length > 0
            ? `\u26A0\uFE0F  ${skippedFiles.join(', ')} was too large to process via email (4MB limit).\n   For full contract analysis, upload the PDF directly at bidintell.ai/app.`
            : null,
        ``,
        `─────────────────────────────────`,
        `View full report \u2192 https://bidintell.ai/app.html`,
        `─────────────────────────────────`,
        ``,
        `Powered by BidIntell \u00B7 bidintell.ai`
    ].filter(line => line !== null).join('\n');

    let replyStatus = null;
    try {
        const replyRes = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_API_KEY
            },
            body: JSON.stringify({
                From: 'hello@bidintell.ai',
                To: userEmail,
                Bcc: 'ryan@bidintell.ai',
                Subject: replySubject,
                TextBody: replyLines,
                MessageStream: 'outbound'
            })
        });
        const replyBody = await replyRes.json().catch(() => ({}));
        replyStatus = { ok: replyRes.ok, status: replyRes.status, message: replyBody.Message || replyBody.ErrorCode || null };
    } catch (e) {
        replyStatus = { ok: false, error: e.message };
    }

    // 12. Log admin event
    await logAdminEvent('email_forward_received', {
        alias,
        gc_name:                gcName,
        score:                  final,
        had_attachments:        hadAttachments,
        processed_attachments:  processedCount,
        skipped_attachments:    skippedFiles.length,
        reply_status:           replyStatus,
        user_id:                userId,
        project_id:             savedProjectId
    });

    return { statusCode: 200, body: 'ok' };
};
