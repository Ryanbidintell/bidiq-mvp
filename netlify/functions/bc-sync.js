// /.netlify/functions/bc-sync
// Syncs BuildingConnected bid invitations (opportunities) into BidIntell projects.
//
// Flow:
//   1. Verify caller's Supabase JWT → get user_id
//   2. Fetch BC access token from oauth_connections, refresh if near-expired
//   3. GET /opportunities from BC API (paginated, up to 2000 records)
//   4. Fetch user settings, keywords, and clients for Phase 1 scoring
//   5. For each opportunity:
//      - Skip if already imported (dedup on extracted_data->>'bc_opportunity_id')
//      - If already imported but outcome changed in BC, update it
//      - Otherwise insert as a new project row with Phase 1 scores
//   6. Update last_sync_at in oauth_connections
//   7. Return { imported, skipped, errors, total }
//
// PHASE 1 SCORING (metadata-only — no PDFs needed):
//   location  — haversine distance from user office to project city/state (Nominatim)
//   keywords  — good/bad keyword match against BC projectInformation text
//   gc        — star rating / win-rate lookup in user's clients table
//   trade     — BC tradeName + scope text matched against user's CSI config
//
// SECURITY NOTES:
//   - Access tokens are never logged
//   - Only the authenticated user's own records are touched

const { createClient } = require('@supabase/supabase-js');

const APS_CLIENT_ID      = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET  = process.env.APS_CLIENT_SECRET;
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const BC_API_BASE  = 'https://developer.api.autodesk.com/construction/buildingconnected/v2';
const APS_TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';

let supabase = null;
function getSupabase() {
    if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return supabase;
}

/** Strip HTML tags — BC projectInformation fields can contain HTML */
function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** ISO week number helper (matches BidIntell's existing getWeekNumber logic) */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Refresh an expired BC access token using the refresh_token grant.
 * Returns the new tokenData object.
 */
async function refreshAccessToken(refreshToken) {
    const res = await fetch(APS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type:    'refresh_token',
            refresh_token: refreshToken,
            client_id:     APS_CLIENT_ID,
            client_secret: APS_CLIENT_SECRET
        })
    });
    if (!res.ok) throw new Error('Token refresh failed with status ' + res.status);
    return res.json();
}

/**
 * Map a BuildingConnected opportunity to a BidIntell projects row.
 */
// ── Import gate ───────────────────────────────────────────────────────────
// By default, import only LIVE opportunities (still biddable). Without this, a
// first BuildingConnected sync dumps the user's ENTIRE history (the "250 old
// bids at once" problem) and buries the few bids they actually need to act on.
// Live = not resolved (won/lost/declined/etc.) AND the bid due date hasn't passed.
const BC_RESOLVED_STATES = new Set(['WON', 'LOST', 'DECLINED', 'NO_BID', 'ARCHIVED', 'EXPIRED', 'CANCELLED', 'CANCELED']);
const BC_UNDATED_MAX_AGE_DAYS = 45;
const BC_DUE_GRACE_MS = 24 * 60 * 60 * 1000; // keep bids due as recently as yesterday

function isLiveOpportunity(opp) {
    // Resolved bids are history, not decisions.
    if (BC_RESOLVED_STATES.has(String(opp.outcome?.state || '').toUpperCase())) return false;
    // Past-due bids are history.
    if (opp.dueAt) {
        const due = new Date(opp.dueAt);
        if (!isNaN(due.getTime())) return due.getTime() >= Date.now() - BC_DUE_GRACE_MS;
    }
    // No usable due date — fall back to recency so ancient undated opps don't flood in.
    if (opp.createdAt) {
        const created = new Date(opp.createdAt);
        if (!isNaN(created.getTime())) {
            return (Date.now() - created.getTime()) <= BC_UNDATED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        }
    }
    return true; // no date signal at all (rare) — keep
}

function mapOpportunityToProject(opp, userId) {
    const location = opp.location || {};
    const gcName   = opp.client?.company?.name || null;

    const addressParts = [
        location.street,
        location.city,
        location.state,
        location.zip
    ].filter(Boolean);

    // Map BC outcome state → BidIntell outcome
    const outcomeState = opp.outcome?.state;
    const outcome = outcomeState === 'WON'  ? 'won'
                  : outcomeState === 'LOST' ? 'lost'
                  : 'pending';

    const scopeSummary = stripHtml(opp.projectInformation || opp.tradeName || '');

    const createdAt = opp.createdAt ? new Date(opp.createdAt) : new Date();
    const createdAtIso = createdAt.toISOString();

    return {
        user_id:      userId,
        created_at:   createdAtIso,
        created_year:  createdAt.getFullYear(),
        created_month: createdAt.getMonth() + 1,
        created_week:  getWeekNumber(createdAt),
        extracted_data: {
            project_name:      opp.name || 'Untitled Opportunity',
            gc_name:           gcName,
            project_address:   addressParts.join(', ') || null,
            project_city:      location.city  || null,
            project_state:     location.state || null,
            project_zip:       location.zip   || null,
            bid_deadline:      opp.dueAt      || null,
            estimated_value:   opp.projectSize || null,
            scope_summary:     scopeSummary   || null,
            // BC metadata — used for deduplication and source tracking
            bc_opportunity_id: opp.id,
            bc_source:         'buildingconnected'
        },
        scores:    null,  // filled by scoreOpportunity() before insert
        gcs:       gcName ? [{ name: gcName }] : [],
        files:     [],
        outcome,
        full_text: null
    };
}

// ── Phase 1 Scoring Engine ────────────────────────────────────────────────────

/** Haversine distance in miles */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nominatim geocode with result caching.
 * geocodeCache is a Map<string, {lat, lon}|null> passed in from the caller.
 * Nominatim TOS: max 1 req/sec — caller must enforce delay between calls.
 */
async function nominatimGeocode(query, geocodeCache) {
    if (geocodeCache.has(query)) return geocodeCache.get(query);
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'BidIntell/1.0 hello@bidintell.ai' }
        });
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

/** Sleep helper for Nominatim rate-limiting */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * BC tradeName / scope text → matched CSI 2-digit divisions.
 * Returns array of division strings that appear in the text, e.g. ['09', '26']
 */
const CSI_DIVISION_PATTERNS = [
    { divs: ['03'], terms: ['concrete', 'cement', 'masonry concrete'] },
    { divs: ['04'], terms: ['masonry', 'brick', 'block', 'stone'] },
    { divs: ['05'], terms: ['metals', 'structural steel', 'steel', 'metal fabrication'] },
    { divs: ['06'], terms: ['carpentry', 'millwork', 'casework', 'wood', 'rough framing'] },
    { divs: ['07'], terms: ['roofing', 'waterproofing', 'insulation', 'thermal', 'moisture', 'sealants', 'caulking'] },
    { divs: ['08'], terms: ['doors', 'windows', 'glazing', 'curtain wall', 'storefront', 'hardware'] },
    { divs: ['09'], terms: ['finishes', 'drywall', 'gypsum', 'flooring', 'tile', 'carpet', 'painting', 'coatings', 'ceiling', 'acoustical', 'terrazzo', 'resilient', 'epoxy floor'] },
    { divs: ['10'], terms: ['specialties', 'toilet accessories', 'signage', 'lockers', 'partitions'] },
    { divs: ['11'], terms: ['equipment', 'food service', 'laundry', 'medical equipment'] },
    { divs: ['12'], terms: ['furnishings', 'furniture', 'window treatment', 'blinds'] },
    { divs: ['14'], terms: ['elevators', 'conveying', 'lifts', 'escalator'] },
    { divs: ['21'], terms: ['fire suppression', 'sprinkler', 'fire protection'] },
    { divs: ['22'], terms: ['plumbing', 'sanitary', 'piping', 'process pipe'] },
    { divs: ['23'], terms: ['hvac', 'mechanical', 'heating', 'ventilation', 'air conditioning', 'ductwork', 'air handler'] },
    { divs: ['26'], terms: ['electrical', 'power', 'lighting', 'low voltage', 'switchgear'] },
    { divs: ['27'], terms: ['communications', 'data', 'network', 'av', 'audio visual', 'low voltage'] },
    { divs: ['28'], terms: ['security', 'fire alarm', 'access control', 'cctv', 'surveillance'] },
    { divs: ['31'], terms: ['earthwork', 'excavation', 'grading', 'site clearing', 'demolition'] },
    { divs: ['32'], terms: ['site work', 'paving', 'concrete flatwork', 'landscaping', 'parking lot', 'asphalt'] },
    { divs: ['33'], terms: ['utilities', 'underground', 'storm', 'sanitary sewer', 'water main'] },
];

function detectDivisionsFromText(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = new Set();
    for (const { divs, terms } of CSI_DIVISION_PATTERNS) {
        if (terms.some(t => lower.includes(t))) {
            divs.forEach(d => found.add(d));
        }
    }
    return [...found];
}

/**
 * Score location component from BC metadata.
 * Returns { score, weight, reason, details }
 */
async function locationScore(opp, settings, geocodeCache) {
    const weight = settings.weights.location;

    if (!settings.locationMatters) {
        return { score: 0, weight, reason: 'Location scoring disabled' };
    }
    if (!settings.city || !settings.state) {
        return { score: 50, weight, reason: 'Office location not set in Settings' };
    }

    const location = opp.location || {};
    const projCity  = location.city  || null;
    const projState = location.state || null;

    if (!projCity && !projState) {
        return { score: 50, weight, reason: 'Project location not available from BC', needsAddress: true };
    }

    // Geocode user office (cached — same for every opp in this sync)
    const userKey = `${settings.city}, ${settings.state}`;
    if (!geocodeCache.has(userKey)) {
        await sleep(1100); // Nominatim rate limit
    }
    const userCoords = await nominatimGeocode(userKey, geocodeCache);

    if (!userCoords) {
        return { score: 50, weight, reason: 'Could not geocode your office address' };
    }

    // Geocode project location
    const projKey = projState ? `${projCity}, ${projState}` : projCity;
    const isNewKey = !geocodeCache.has(projKey);
    if (isNewKey) await sleep(1100);
    const projCoords = await nominatimGeocode(projKey, geocodeCache);

    if (!projCoords) {
        // Same-city fallback
        if (settings.city.toLowerCase().trim() === projCity?.toLowerCase().trim()) {
            return { score: 95, weight, reason: `~5 miles (same city: ${projCity})`, details: { dist: 5, estimated: true } };
        }
        return { score: 50, weight, reason: `Could not geocode project city "${projCity}"`, needsAddress: true };
    }

    const dist = Math.round(haversine(userCoords.lat, userCoords.lon, projCoords.lat, projCoords.lon));
    let score = dist <= 25 ? 100 : dist <= 50 ? 85 : dist <= 100 ? 70 : dist <= 150 ? 50 : 30;
    if (dist > settings.radius) score = Math.max(10, score - 20);

    return {
        score,
        weight,
        reason: `${dist} miles from your office${dist > settings.radius ? ' (outside service area)' : ''}`,
        details: { dist, source: 'bc_metadata' }
    };
}

/**
 * Score keywords component by matching user keywords against BC text.
 * Returns { score, weight, reason, details }
 */
function keywordsScore(opp, settings, userKeywords) {
    const weight = settings.weights.keywords;
    const text = [
        stripHtml(opp.projectInformation || ''),
        opp.tradeName || '',
        opp.name || ''
    ].join(' ').toLowerCase();

    const goodKw = (userKeywords.good_keywords || []).map(k => k.toLowerCase());
    const badKw  = (userKeywords.bad_keywords  || []).map(k => k.toLowerCase());

    const goodFound = goodKw.filter(k => text.includes(k));
    const badFound  = badKw.filter(k => text.includes(k));

    let score = goodFound.length === 0 ? 30 : 50;
    score += goodFound.length * 8;

    const penalty = settings.riskTolerance === 'low' ? 15 : settings.riskTolerance === 'medium' ? 10 : 5;
    score -= badFound.length * penalty;
    score = Math.max(0, Math.min(100, score));

    const reason = goodFound.length === 0
        ? 'No matching keywords found in BC description'
        : `${goodFound.length} good term${goodFound.length !== 1 ? 's' : ''} found${badFound.length > 0 ? `, ${badFound.length} risk term${badFound.length !== 1 ? 's' : ''} found` : ''}`;

    return { score, weight, reason, details: { goodFound, badFound, source: 'bc_metadata' } };
}

/**
 * Score GC component by looking up the BC GC name in the user's clients table.
 * Returns { score, weight, reason, details }
 */
function gcScore(opp, settings, clients) {
    const weight = settings.weights.gc;
    const gcName = opp.client?.company?.name || null;

    if (!gcName) {
        return { score: settings.defaultStars * 20, weight, reason: 'GC name not provided by BC', details: { source: 'default_stars' } };
    }

    // Case-insensitive name match
    const nameLower = gcName.toLowerCase().trim();
    const match = clients.find(c => c.name.toLowerCase().trim() === nameLower);

    if (!match) {
        // Unknown GC — use defaultStars
        const defaultScore = (settings.defaultStars || 3) * 20;
        return { score: defaultScore, weight, reason: `${gcName} not in your GC list — using default rating`, details: { gcName, source: 'default_stars' } };
    }

    let score;
    if (match.bids > 0 && match.wins > 0) {
        score = Math.round((match.wins / match.bids) * 100);
    } else {
        score = (match.rating || settings.defaultStars || 3) * 20;
    }
    score = Math.max(0, Math.min(100, score));

    const reason = match.bids > 0
        ? `${gcName}: ${Math.round((match.wins || 0) / match.bids * 100)}% win rate (${match.wins || 0}/${match.bids} bids)`
        : `${gcName}: ${match.rating || 3}★ rating`;

    return { score, weight, reason, details: { gcName, bids: match.bids, wins: match.wins, rating: match.rating } };
}

/**
 * Score trade component by matching BC tradeName / scope against user's CSI config.
 * Returns { score, weight, reason, details }
 */
function tradeScore(opp, settings) {
    const weight = settings.weights.trade;

    // Text to search
    const text = [opp.tradeName || '', stripHtml(opp.projectInformation || ''), opp.name || ''].join(' ');
    const detectedDivisions = detectDivisionsFromText(text);

    if (settings.preferred_csi_sections && settings.preferred_csi_sections.length > 0) {
        // Section-level scoring: check if any user section's division appears in detected divisions
        // e.g. user has "09 65 00" → division "09" → check if "09" is in detected
        const userSectionDivs = [...new Set(settings.preferred_csi_sections.map(s => s.slice(0, 2).trim()))];
        const foundSectionDivs = userSectionDivs.filter(div => detectedDivisions.includes(div));
        const foundCount = foundSectionDivs.length;
        const totalCount = userSectionDivs.length;

        let score;
        if (foundCount === 0) {
            score = 0;
        } else {
            score = Math.min(65 + (foundCount - 1) * 5, 100);
        }

        const reason = foundCount === 0
            ? `None of your ${totalCount} spec division${totalCount !== 1 ? 's' : ''} found in BC description`
            : foundCount === totalCount
            ? `All ${totalCount} spec division${totalCount !== 1 ? 's' : ''} found — strong scope match`
            : `${foundCount} of ${totalCount} spec division${totalCount !== 1 ? 's' : ''} found — work likely exists`;

        return { score, weight, reason, details: { foundDivisions: foundSectionDivs, detectedDivisions, source: 'bc_metadata', scoringMode: 'section' } };
    }

    if (!settings.trades || settings.trades.length === 0) {
        return { score: 50, weight, reason: 'No trades configured — set your trades in Settings', details: { source: 'not_configured' } };
    }

    // Division-level scoring
    const userTrades = settings.trades; // e.g. ['09', '23']
    const foundTrades = userTrades.filter(t => detectedDivisions.includes(t));
    const foundCount = foundTrades.length;
    const totalCount = userTrades.length;

    let score;
    if (foundCount === 0) {
        score = 0;
    } else {
        score = Math.min(65 + (foundCount - 1) * 5, 100);
    }

    const reason = foundCount === 0
        ? `None of your ${totalCount} trade division${totalCount !== 1 ? 's' : ''} found in BC description`
        : foundCount === totalCount
        ? `All ${totalCount} trade type${totalCount !== 1 ? 's' : ''} found — strong scope match`
        : `${foundCount} of ${totalCount} trade type${totalCount !== 1 ? 's' : ''} found — work likely exists`;

    return { score, weight, reason, details: { foundTrades, detectedDivisions, source: 'bc_metadata', scoringMode: 'division' } };
}

/**
 * Compute Phase 1 scores for a BC opportunity.
 * geocodeCache is shared across all opportunities in a sync run.
 */
async function computeScores(opp, settings, userKeywords, clients, geocodeCache) {
    const weights = { ...settings.weights };

    // If locationMatters is false, redistribute location weight to others
    if (!settings.locationMatters) {
        const lw = weights.location;
        const other = weights.keywords + weights.gc + weights.trade;
        if (other > 0) {
            weights.keywords = Math.round(weights.keywords + lw * weights.keywords / other);
            weights.gc       = Math.round(weights.gc       + lw * weights.gc       / other);
            weights.trade    = Math.round(weights.trade    + lw * weights.trade    / other);
        }
        weights.location = 0;
    }

    // Score each component (settings passed with adjusted weights)
    const settingsAdj = { ...settings, weights };

    // Skip geocoding during sync to avoid Netlify timeout — location scored as neutral
    const locComp = { score: 50, weight: weights.location, reason: 'Location pending — open bid for full score' };
    const [kwComp, gcComp, trComp] = await Promise.all([
        Promise.resolve(keywordsScore(opp, settingsAdj, userKeywords)),
        Promise.resolve(gcScore(opp, settingsAdj, clients)),
        Promise.resolve(tradeScore(opp, settingsAdj))
    ]);

    const components = {
        location: locComp,
        keywords: kwComp,
        gc:       gcComp,
        trade:    trComp
    };

    // Weighted total
    let final = 0;
    for (const k of ['location', 'keywords', 'gc', 'trade']) {
        const c = components[k];
        if (c && c.weight > 0) final += c.score * (c.weight / 100);
    }
    final = Math.round(final);
    const recommendation = final >= 80 ? 'GO' : final >= 60 ? 'REVIEW' : 'PASS';

    return { final, recommendation, components, weights, source: 'bc_metadata_phase1' };
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async function(event) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // ── Authenticate caller ───────────────────────────────────────────────────
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const userToken  = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!userToken) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }

    let userId;
    try {
        const { data: { user }, error } = await getSupabase().auth.getUser(userToken);
        if (error || !user) throw new Error('Invalid token');
        userId = user.id;
    } catch (e) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // ── Fetch BC connection record ────────────────────────────────────────────
    const { data: conn, error: connErr } = await getSupabase()
        .from('oauth_connections')
        .select('access_token, refresh_token, token_expires_at, status')
        .eq('user_id', userId)
        .eq('provider', 'buildingconnected')
        .maybeSingle();

    if (connErr || !conn) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No BuildingConnected connection found.' }) };
    }
    if (conn.status !== 'active') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'BuildingConnected connection is ' + conn.status + '. Please reconnect.' }) };
    }

    // ── Refresh token if expired or within 5 min of expiry ───────────────────
    let accessToken = conn.access_token;
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
    const nearExpiry = !expiresAt || (expiresAt.getTime() - Date.now() < 5 * 60 * 1000);

    if (nearExpiry && conn.refresh_token) {
        try {
            const refreshed = await refreshAccessToken(conn.refresh_token);
            accessToken = refreshed.access_token;
            await getSupabase()
                .from('oauth_connections')
                .update({
                    access_token:     refreshed.access_token,
                    refresh_token:    refreshed.refresh_token || conn.refresh_token,
                    token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString()
                })
                .eq('user_id', userId)
                .eq('provider', 'buildingconnected');
        } catch (e) {
            console.error('Token refresh failed:', e.message);
            await getSupabase()
                .from('oauth_connections')
                .update({ status: 'expired' })
                .eq('user_id', userId)
                .eq('provider', 'buildingconnected');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Session expired. Please reconnect BuildingConnected in Settings.' })
            };
        }
    }

    // ── Fetch all BC opportunities (paginated) ────────────────────────────────
    const opportunities = [];
    let cursorState = null;
    let page = 0;
    const MAX_PAGES = 20; // caps at 2000 records

    try {
        do {
            const url = new URL(`${BC_API_BASE}/opportunities`);
            url.searchParams.set('limit', '25');
            if (cursorState) url.searchParams.set('cursorState', cursorState);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 22000);
            let res;
            try {
                res = await fetch(url.toString(), {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            if (!res.ok) {
                if (res.status === 401) {
                    await getSupabase()
                        .from('oauth_connections')
                        .update({ status: 'expired' })
                        .eq('user_id', userId)
                        .eq('provider', 'buildingconnected');
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'BuildingConnected rejected the token. Please reconnect in Settings.' })
                    };
                }
                let errBody = '';
                try { errBody = await res.text(); } catch (_) {}
                console.error('BC API error status:', res.status, 'body:', errBody);
                throw new Error(`BuildingConnected API returned ${res.status}: ${errBody}`);
            }

            const body = await res.json();
            // BC API may nest results under 'results' or 'data'
            const results = Array.isArray(body) ? body : (body.results || body.data || []);
            opportunities.push(...results);

            // Pagination cursor
            cursorState = body.pagination?.cursorState || body.cursorState || null;
            page++;
        } while (cursorState && page < MAX_PAGES);
    } catch (e) {
        console.error('BC fetch error:', e.message);
        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: 'Could not reach BuildingConnected. ' + e.message })
        };
    }

    // ── Fetch user data for Phase 1 scoring ──────────────────────────────────
    // Fetch in parallel — failures are non-fatal (scoring degrades gracefully)
    const [settingsRes, keywordsRes, clientsRes] = await Promise.all([
        getSupabase()
            .from('user_settings')
            .select('city, state, zip, street, radius, location_matters, trades, preferred_csi_sections, risk_tolerance, weights_location, weights_keywords, weights_gc, weights_trade, default_stars, company_type')
            .eq('user_id', userId)
            .maybeSingle(),
        getSupabase()
            .from('user_keywords')
            .select('good_keywords, bad_keywords')
            .eq('user_id', userId)
            .maybeSingle(),
        getSupabase()
            .from('clients')
            .select('name, rating, bids, wins, client_type')
            .eq('user_id', userId)
    ]);

    const rawSettings = settingsRes.data || {};
    const userSettings = {
        city:                    rawSettings.city  || '',
        state:                   rawSettings.state || '',
        street:                  rawSettings.street || '',
        zip:                     rawSettings.zip   || '',
        radius:                  rawSettings.radius || 50,
        locationMatters:         rawSettings.location_matters !== false,
        trades:                  rawSettings.trades || [],
        preferred_csi_sections:  rawSettings.preferred_csi_sections || [],
        riskTolerance:           rawSettings.risk_tolerance || 'medium',
        defaultStars:            rawSettings.default_stars || 3,
        companyType:             rawSettings.company_type || 'subcontractor',
        weights: {
            location: rawSettings.weights_location || 25,
            keywords: rawSettings.weights_keywords || 30,
            gc:       rawSettings.weights_gc       || 25,
            trade:    rawSettings.weights_trade    || 20
        }
    };

    const userKeywords = keywordsRes.data || { good_keywords: [], bad_keywords: [] };
    const clients      = clientsRes.data  || [];

    // Shared geocode cache — avoids re-geocoding the same city across many opportunities
    const geocodeCache = new Map();

    // ── Apply the import gate (default: live bids only) ───────────────────────
    // Stops the "entire history dumped at once" problem. Override with ?mode=all
    // to import everything (the original behavior).
    const importMode = String(event.queryStringParameters?.mode || 'live').toLowerCase();
    const totalFetched = opportunities.length;
    const workingSet = importMode === 'all' ? opportunities : opportunities.filter(isLiveOpportunity);
    const gatedOut = totalFetched - workingSet.length;

    // ── Import into projects table ────────────────────────────────────────────
    let imported = 0, skipped = 0, errors = 0;

    for (const opp of workingSet) {
        if (!opp.id) { errors++; continue; }

        try {
            // Dedup check: look for an existing project with this bc_opportunity_id.
            // Use .limit(1) not .maybeSingle() — if duplicates already exist, maybeSingle()
            // throws and returns null, causing the code to treat the project as new and
            // insert yet another duplicate on every sync.
            const { data: existingRows } = await getSupabase()
                .from('projects')
                .select('id, outcome')
                .eq('user_id', userId)
                .eq('extracted_data->>bc_opportunity_id', opp.id)
                .limit(1);

            const existing = existingRows?.[0] || null;

            if (existing) {
                // Update outcome if BC now has a definitive result (won/lost)
                const bcOutcome = opp.outcome?.state === 'WON'  ? 'won'
                               : opp.outcome?.state === 'LOST' ? 'lost'
                               : null;
                if (bcOutcome && bcOutcome !== existing.outcome) {
                    await getSupabase()
                        .from('projects')
                        .update({ outcome: bcOutcome })
                        .eq('id', existing.id);
                }
                skipped++;
                continue;
            }

            // New opportunity — compute Phase 1 scores then insert
            const row = mapOpportunityToProject(opp, userId);

            try {
                const scores = await computeScores(opp, userSettings, userKeywords, clients, geocodeCache);
                row.scores = scores;
            } catch (scoreErr) {
                // Scoring failure is non-fatal — import without scores
                console.error('Scoring failed for opportunity', opp.id, ':', scoreErr.message);
            }

            const { error: insertErr } = await getSupabase()
                .from('projects')
                .insert(row);

            if (insertErr) throw insertErr;
            imported++;
        } catch (e) {
            console.error('Failed to import opportunity', opp.id, ':', e.message);
            errors++;
        }
    }

    // ── Update last_sync_at ───────────────────────────────────────────────────
    await getSupabase()
        .from('oauth_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'buildingconnected');

    const gateNote = (importMode !== 'all' && gatedOut > 0)
        ? ` Skipped ${gatedOut} past-due or closed bid${gatedOut !== 1 ? 's' : ''} (live bids only).`
        : '';

    const message = imported > 0
        ? `Imported ${imported} live bid invitation${imported !== 1 ? 's' : ''} with scores.${skipped > 0 ? ` ${skipped} already synced.` : ''}${gateNote}`
        : skipped > 0
        ? `All ${skipped} live invitations already synced — nothing new.${gateNote}`
        : totalFetched === 0
        ? 'No bid invitations found in your BuildingConnected account.'
        : gatedOut > 0
        ? `No live bids to import — the ${gatedOut} found were past-due or closed. (Add ?mode=all to import history.)`
        : `Sync complete. ${errors > 0 ? errors + ' errors.' : ''}`;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, total: totalFetched, imported, skipped, errors, gated_out: gatedOut, mode: importMode, message })
    };
};
