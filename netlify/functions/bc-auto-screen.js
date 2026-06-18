// /.netlify/functions/bc-auto-screen
// Autonomous inbound bid screener (Agent #1). Periodically syncs each connected
// user's LIVE BuildingConnected opportunities and scores them — so new invites are
// triaged GO/REVIEW/PASS automatically, with no manual "Sync Now" click.
//
// SAFETY / ROLLOUT:
//   - ADMIN-GATED: only processes connected users whose email is in ADMIN_EMAILS
//     (so it can't touch paying users while we validate). Flip to an opt-in flag later.
//   - NOT wired to a schedule yet (no netlify.toml entry / no `config.schedule`). It is
//     invoke-only until live-verified, then we enable the timer. Off by default = safe.
//   - Reuses bc-sync's scoring/mapping/token helpers (single source of truth — scores
//     can't diverge from the manual sync path).
//   - Trigger auth: a matching `x-cron-secret` header (for a future scheduler) OR an
//     admin Supabase JWT (for manual testing). Anything else → 401.
//
// This is the agent foundation; the BC fetch + import orchestration mirrors bc-sync's
// handler (plumbing). TODO post-demo: DRY the shared fetch/import into a lib so neither
// copy drifts. Scoring is already shared via bc-sync exports.

const { createClient } = require('@supabase/supabase-js');
const bc = require('./bc-sync');
let sendAlert; try { ({ sendAlert } = require('./alert')); } catch (_) { sendAlert = async () => {}; }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET || null;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

let supabase = null;
const db = () => (supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY));
const isAdminEmail = (e) => !!e && (ADMIN_EMAILS.includes(e.toLowerCase()) || e.toLowerCase().endsWith('@fsikc.com'));

/** Pull the user's scoring inputs (mirrors bc-sync's parallel fetch + mapping). */
async function loadUserContext(userId) {
    const [settingsRes, keywordsRes, clientsRes] = await Promise.all([
        db().from('user_settings').select('city, state, zip, street, radius, location_matters, trades, preferred_csi_sections, risk_tolerance, weights_location, weights_keywords, weights_gc, weights_trade, default_stars, company_type').eq('user_id', userId).maybeSingle(),
        db().from('user_keywords').select('good_keywords, bad_keywords').eq('user_id', userId).maybeSingle(),
        db().from('clients').select('name, rating, bids, wins, client_type').eq('user_id', userId)
    ]);
    const r = settingsRes.data || {};
    const settings = {
        city: r.city || '', state: r.state || '', street: r.street || '', zip: r.zip || '',
        radius: r.radius || 50, locationMatters: r.location_matters !== false,
        trades: r.trades || [], preferred_csi_sections: r.preferred_csi_sections || [],
        riskTolerance: r.risk_tolerance || 'medium', defaultStars: r.default_stars || 3,
        companyType: r.company_type || 'subcontractor',
        weights: { location: r.weights_location || 25, keywords: r.weights_keywords || 30, gc: r.weights_gc || 25, trade: r.weights_trade || 20 }
    };
    return { settings, keywords: keywordsRes.data || { good_keywords: [], bad_keywords: [] }, clients: clientsRes.data || [] };
}

/** Fetch a connected user's BC opportunities (live env), refreshing the token if needed. */
async function fetchOpportunities(userId) {
    const { data: conn } = await db().from('oauth_connections')
        .select('access_token, refresh_token, token_expires_at, status')
        .eq('user_id', userId).eq('provider', 'buildingconnected').maybeSingle();
    if (!conn || conn.status !== 'active') return { skippedReason: conn ? `connection ${conn.status}` : 'no connection' };

    let accessToken = conn.access_token;
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
    if ((!expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000) && conn.refresh_token) {
        const refreshed = await bc.refreshAccessToken(conn.refresh_token);
        accessToken = refreshed.access_token;
        await db().from('oauth_connections').update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token || conn.refresh_token,
            token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString()
        }).eq('user_id', userId).eq('provider', 'buildingconnected');
    }

    const opportunities = [];
    let cursorState = null, page = 0;
    do {
        const url = new URL(`${bc.BC_API_BASE}/opportunities`);
        url.searchParams.set('limit', '25');
        if (cursorState) url.searchParams.set('cursorState', cursorState);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 22000);
        let res;
        try { res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }); }
        finally { clearTimeout(t); }
        if (!res.ok) {
            if (res.status === 401) {
                await db().from('oauth_connections').update({ status: 'expired' }).eq('user_id', userId).eq('provider', 'buildingconnected');
                return { skippedReason: 'token rejected (reconnect needed)' };
            }
            throw new Error(`BC API ${res.status}`);
        }
        const body = await res.json();
        const results = Array.isArray(body) ? body : (body.results || body.data || []);
        opportunities.push(...results);
        cursorState = body.pagination?.cursorState || body.cursorState || null;
        page++;
    } while (cursorState && page < 20);
    return { opportunities };
}

/** Sync + score one user's live opportunities. Returns a per-user summary. */
async function screenUser(userId) {
    const fetched = await fetchOpportunities(userId);
    if (fetched.skippedReason) return { userId, skipped: fetched.skippedReason, imported: 0 };

    const live = fetched.opportunities.filter(bc.isLiveOpportunity);
    const { settings, keywords, clients } = await loadUserContext(userId);
    const geocodeCache = new Map();

    let imported = 0, skipped = 0, errors = 0;
    const newGoBids = [];
    for (const opp of live) {
        if (!opp.id) { errors++; continue; }
        try {
            const { data: existingRows } = await db().from('projects')
                .select('id, outcome').eq('user_id', userId)
                .eq('extracted_data->>bc_opportunity_id', opp.id).limit(1);
            if (existingRows?.[0]) { skipped++; continue; }

            const row = bc.mapOpportunityToProject(opp, userId);
            try { row.scores = await bc.computeScores(opp, settings, keywords, clients, geocodeCache); } catch (e) { /* non-fatal */ }
            const { error: insErr } = await db().from('projects').insert(row);
            if (insErr) throw insErr;
            imported++;
            if (row.scores?.recommendation === 'GO') {
                newGoBids.push({ name: row.extracted_data.project_name, gc: row.extracted_data.gc_name, score: row.scores.final });
            }
        } catch (e) { errors++; }
    }
    await db().from('oauth_connections').update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId).eq('provider', 'buildingconnected');
    return { userId, imported, skipped, errors, newGoBids };
}

exports.handler = async function (event) {
    const headers = { 'Content-Type': 'application/json' };

    // ── Trigger auth: cron secret OR admin JWT ──────────────────────────────
    let authorized = false;
    const cronHeader = event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'];
    if (CRON_SECRET && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized) {
        const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
        if (token) {
            try {
                const { data: { user } } = await db().auth.getUser(token);
                if (user && isAdminEmail(user.email)) authorized = true;
            } catch (_) {}
        }
    }
    if (!authorized) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    try {
        // Only admin-connected users while we validate (gate).
        const { data: conns } = await db().from('oauth_connections')
            .select('user_id').eq('provider', 'buildingconnected').eq('status', 'active');
        const results = [];
        for (const c of (conns || [])) {
            let email = null;
            try { email = (await db().auth.admin.getUserById(c.user_id)).data?.user?.email || null; } catch (_) {}
            if (!isAdminEmail(email)) continue; // GATE
            try { results.push(await screenUser(c.user_id)); }
            catch (e) { results.push({ userId: c.user_id, error: e.message }); }
        }

        const totals = results.reduce((a, r) => ({ imported: a.imported + (r.imported || 0), go: a.go + (r.newGoBids?.length || 0) }), { imported: 0, go: 0 });
        await db().from('admin_events').insert({
            event_type: 'auto_screen_run', user_id: null,
            event_data: { processed: results.length, imported: totals.imported, new_go: totals.go, results }
        }).then(() => {}, () => {});

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, processed: results.length, ...totals, results }) };
    } catch (e) {
        await sendAlert({ source: 'bc-auto-screen', severity: 'error', title: 'Auto-screen run failed', detail: e.message, dedupeKey: 'bc-auto-screen-fail' });
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
};
