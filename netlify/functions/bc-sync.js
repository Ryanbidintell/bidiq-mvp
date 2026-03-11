// /.netlify/functions/bc-sync
// Syncs BuildingConnected bid invitations (opportunities) into BidIntell projects.
//
// Flow:
//   1. Verify caller's Supabase JWT → get user_id
//   2. Fetch BC access token from oauth_connections, refresh if near-expired
//   3. GET /opportunities from BC API (paginated, up to 2000 records)
//   4. For each opportunity:
//      - Skip if already imported (dedup on extracted_data->>'bc_opportunity_id')
//      - If already imported but outcome changed in BC, update it
//      - Otherwise insert as a new project row
//   5. Update last_sync_at in oauth_connections
//   6. Return { imported, skipped, errors, total }
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
        scores:    null,
        gcs:       gcName ? [{ name: gcName }] : [],
        files:     [],
        outcome,
        full_text: null
    };
}

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
            url.searchParams.set('limit', '100');
            if (cursorState) url.searchParams.set('cursorState', cursorState);

            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

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
                console.error('BC API error status:', res.status);
                throw new Error(`BuildingConnected API returned ${res.status}`);
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

    // ── Import into projects table ────────────────────────────────────────────
    let imported = 0, skipped = 0, errors = 0;

    for (const opp of opportunities) {
        if (!opp.id) { errors++; continue; }

        try {
            // Dedup check: look for an existing project with this bc_opportunity_id
            const { data: existing } = await getSupabase()
                .from('projects')
                .select('id, outcome')
                .eq('user_id', userId)
                .eq('extracted_data->>bc_opportunity_id', opp.id)
                .maybeSingle();

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

            // New opportunity — insert as project
            const row = mapOpportunityToProject(opp, userId);
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

    const message = imported > 0
        ? `Imported ${imported} new bid invitation${imported !== 1 ? 's' : ''}.${skipped > 0 ? ` ${skipped} already synced.` : ''}`
        : skipped > 0
        ? `All ${skipped} invitations already synced — nothing new.`
        : opportunities.length === 0
        ? 'No bid invitations found in your BuildingConnected account.'
        : `Sync complete. ${errors > 0 ? errors + ' errors.' : ''}`;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, total: opportunities.length, imported, skipped, errors, message })
    };
};
