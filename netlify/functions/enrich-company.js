// /.netlify/functions/enrich-company
// Onboarding pre-fill. Given the signed-in user's own email domain, research THEIR
// company via Perplexity (web-grounded, cited — not Claude guessing) and return a
// suggested profile the onboarding wizard can pre-fill.
//
// This exists because the wizard asked 13 questions and 5 of the first 14 accounts
// entered nothing at all. Pre-filling what we can look up removes most of the typing.
//
// SAFETY / DESIGN:
//   - Authenticated users only, and the domain is derived from the VERIFIED JWT email,
//     never from the request body. That is deliberate: reading a domain from the body
//     would turn this into an open company-research API for anyone with an account.
//   - NEVER returns CSI sections. Scope is the highest-leverage BidIndex input, and a
//     wrong scope selection manufactures false GO scores. Company name and location are
//     verifiable from the web; which 6-digit sections a shop actually bids is not. We
//     return a plain-language trade hint for the human to act on instead.
//   - Consumer email domains (gmail etc.) short-circuit: the domain says nothing about
//     the company, so there is nothing to research and no API call is made.
//   - Read-only. Writes nothing to user_settings — the client pre-fills editable fields
//     and the user confirms. Bad data the user can see and fix beats silent bad data.
//   - INERT without PERPLEXITY_API_KEY: returns {skipped} so deploying changes nothing
//     until the key is present.
//   - One research call per user per 24h, enforced via admin_events, so a reload loop
//     cannot run up the bill.

const { createClient } = require('@supabase/supabase-js');
let sendAlert; try { ({ sendAlert } = require('./alert')); } catch (_) { sendAlert = async () => {}; }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || null;

let supabase = null;
const db = () => (supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY));

// Consumer mail providers — domain tells us nothing about the company.
// Keep in sync with CONSUMER_EMAIL_DOMAINS in app.html.
const CONSUMER_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com',
    'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
    'mac.com', 'protonmail.com', 'proton.me', 'gmx.com', 'zoho.com',
    'comcast.net', 'sbcglobal.net', 'att.net', 'verizon.net', 'cox.net',
    'bellsouth.net', 'charter.net', 'earthlink.net'
]);

const VALID_COMPANY_TYPES = ['subcontractor', 'distributor', 'manufacturer_rep', 'unknown'];
const RATE_LIMIT_HOURS = 24;

async function researchCompany(domain) {
    const sys = 'You are a construction-industry researcher. Use web sources. Be factual and conservative. If you cannot confidently identify the company, say so with found=false rather than guessing. Never invent an address, a company name, or a trade.';
    const user = `Identify the company that owns the email domain "${domain}". It is most likely a commercial construction subcontractor, a building-materials distributor, or a manufacturers' representative in the United States.

Report ONLY what web sources support. If the domain does not clearly belong to one identifiable company, return found=false.

Return ONLY valid JSON, no prose:
{
  "found": true | false,
  "confidence": "low" | "medium" | "high",
  "company_name": "legal or commonly used business name, or null",
  "city": "primary office city, or null",
  "state": "2-letter US state code of the primary office, or null",
  "website": "https://... or null",
  "company_type": "subcontractor" | "distributor" | "manufacturer_rep" | "unknown",
  "trade_summary": "one short plain-language sentence on what work they actually perform, or null",
  "summary": "2-3 sentence sourced summary"
}`;

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PERPLEXITY_API_KEY}` },
        body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
            temperature: 0.1
        })
    });
    if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '')
        .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { throw new Error('Perplexity returned non-JSON: ' + raw.slice(0, 160)); }
    return { parsed, citations: data.citations || [] };
}

/** Only let through fields we can sanity-check. Anything odd becomes null. */
function sanitize(p) {
    const str = (v, max) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null')
        ? v.trim().slice(0, max) : null;
    // State must be EXACTLY two letters. Truncating instead would turn "Kansas" into
    // "KA" — a silently invalid code feeding Location Fit. Anything else becomes null
    // and the user fills it in.
    const rawState = str(p.state, 40);
    const state = rawState && /^[A-Za-z]{2}$/.test(rawState) ? rawState : null;
    return {
        found: p.found === true,
        confidence: ['low', 'medium', 'high'].includes(p.confidence) ? p.confidence : 'low',
        company_name: str(p.company_name, 120),
        city: str(p.city, 80),
        state: state ? state.toUpperCase() : null,
        website: str(p.website, 200),
        company_type: VALID_COMPANY_TYPES.includes(p.company_type) ? p.company_type : 'unknown',
        trade_summary: str(p.trade_summary, 240),
        summary: str(p.summary, 600),
    };
}

exports.handler = async function (event) {
    const headers = { 'Content-Type': 'application/json' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // Auth: any authenticated user. The domain comes from the verified token's email,
    // NOT from the body — see the header comment.
    const token = (event.headers.authorization || event.headers.Authorization || '')
        .replace(/^Bearer\s+/i, '').trim();
    if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    let user = null;
    try { ({ data: { user } } = await db().auth.getUser(token)); } catch (_) { /* fall through */ }
    if (!user || !user.email) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!PERPLEXITY_API_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify({ skipped: 'PERPLEXITY_API_KEY not set', ready: true }) };
    }

    const rawDomain = (user.email.split('@')[1] || '').toLowerCase().trim();
    const domain = rawDomain.replace(/^(www|mail)\./, '');
    if (!domain || CONSUMER_EMAIL_DOMAINS.has(domain)) {
        // Not an error — just nothing to look up. No API call, no charge.
        return { statusCode: 200, headers, body: JSON.stringify({ skipped: 'consumer_email_domain', found: false }) };
    }

    try {
        // Rate limit: one research call per user per RATE_LIMIT_HOURS. Reuse the cached
        // payload so a refresh loop during onboarding cannot run up the bill.
        const since = new Date(Date.now() - RATE_LIMIT_HOURS * 3600 * 1000).toISOString();
        const { data: recent } = await db()
            .from('admin_events')
            .select('event_data, created_at')
            .eq('event_type', 'company_enrichment')
            .eq('user_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1);

        if (recent && recent.length && recent[0].event_data && recent[0].event_data.result) {
            return {
                statusCode: 200, headers,
                body: JSON.stringify({ ...recent[0].event_data.result, cached: true })
            };
        }

        const { parsed, citations } = await researchCompany(domain);
        const result = sanitize(parsed);

        // Await the write — an un-awaited insert in a serverless handler is dropped when
        // the container suspends (see CLAUDE.md, 2026-06-12).
        try {
            await db().from('admin_events').insert({
                event_type: 'company_enrichment',
                user_id: user.id,
                event_data: { domain, result, citations: citations.slice(0, 5) }
            });
        } catch (logErr) {
            console.error('company_enrichment log failed:', logErr.message);
        }

        return { statusCode: 200, headers, body: JSON.stringify(result) };
    } catch (e) {
        await sendAlert({
            source: 'enrich-company',
            severity: 'warning',       // pre-fill is a convenience; failure must not read as an outage
            title: 'Company enrichment failed',
            detail: e.message,
            dedupeKey: 'enrich-company-fail',
            context: { domain }
        });
        // Fail soft: onboarding must continue normally with empty fields.
        return { statusCode: 200, headers, body: JSON.stringify({ found: false, error: 'lookup_failed' }) };
    }
};
