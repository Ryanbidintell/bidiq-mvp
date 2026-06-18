// /.netlify/functions/enrich-gc
// Agent #2: GC enrichment. Researches a general contractor via Perplexity (web-grounded,
// cited — NOT Claude guessing) and writes conservative signals onto the user's clients row:
//   - notes        : a short sourced research summary
//   - risk_tags[]  : appended factual tags (e.g. 'recent_mechanics_lien')
//   - payment_flag : set ONLY on a clear, cited payment-reputation signal (else left as-is)
//
// SAFETY:
//   - Admin-gated (admin JWT or x-cron-secret) while we validate.
//   - INERT without PERPLEXITY_API_KEY — returns {skipped} so deploying it changes nothing
//     until the key is added to .env + Netlify.
//   - Conservative: a wrong "disputed" flag is worse than nothing, so payment_flag only
//     changes on explicit cited evidence + high confidence; everything is marked agent-sourced.

const { createClient } = require('@supabase/supabase-js');
let sendAlert; try { ({ sendAlert } = require('./alert')); } catch (_) { sendAlert = async () => {}; }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || null;
const CRON_SECRET = process.env.CRON_SECRET || null;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

let supabase = null;
const db = () => (supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY));
const isAdminEmail = (e) => !!e && (ADMIN_EMAILS.includes(e.toLowerCase()) || e.toLowerCase().endsWith('@fsikc.com'));

const VALID_FLAGS = ['reliable', 'slow', 'disputed'];

async function researchGC(gcName, metro) {
    const sys = 'You are a construction-industry researcher. Use web sources. Be factual and conservative — if little is known, say so. Never invent details. Distinguish the specific company asked about from similarly-named companies.';
    const user = `Research the general contractor "${gcName}"${metro ? ` (${metro} area)` : ''} for a subcontractor deciding whether to bid their work. Report ONLY what is supported by sources:
- payment reputation: do subcontractors report slow payment, mechanics liens, or payment disputes? any positive signals (pays on time, good to subs)?
- recent notable projects (type/size/location)
- any red flags (lawsuits, bankruptcy, safety, license issues)

Return ONLY valid JSON, no prose:
{
  "payment_signal": "reliable" | "slow" | "disputed" | "unknown",
  "confidence": "low" | "medium" | "high",
  "risk_tags": ["short_snake_case_tag", ...],
  "summary": "2-3 sentence sourced summary",
  "enough_data": true | false
}`;
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PERPLEXITY_API_KEY}` },
        body: JSON.stringify({ model: 'sonar', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.1 })
    });
    if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { throw new Error('Perplexity returned non-JSON: ' + raw.slice(0, 160)); }
    return { parsed, citations: data.citations || [] };
}

exports.handler = async function (event) {
    const headers = { 'Content-Type': 'application/json' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    // Trigger auth: cron secret OR admin JWT
    let authorized = false, callerId = null;
    if (CRON_SECRET && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret']) === CRON_SECRET) authorized = true;
    if (!authorized) {
        const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
        if (token) { try { const { data: { user } } = await db().auth.getUser(token); if (user && isAdminEmail(user.email)) { authorized = true; callerId = user.id; } } catch (_) {} }
    }
    if (!authorized) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (!PERPLEXITY_API_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify({ skipped: 'PERPLEXITY_API_KEY not set — add it to .env + Netlify to activate GC enrichment', ready: true }) };
    }

    try {
        const { clientId, gcName: gcNameIn, userId: userIdIn } = JSON.parse(event.body || '{}');
        // Load the client row to enrich (by id, or by name within a user's clients)
        let client = null;
        if (clientId) {
            ({ data: client } = await db().from('clients').select('*').eq('id', clientId).maybeSingle());
        } else if (gcNameIn && (userIdIn || callerId)) {
            ({ data: client } = await db().from('clients').select('*').eq('user_id', userIdIn || callerId).ilike('name', gcNameIn).limit(1).maybeSingle());
        }
        if (!client) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Client not found' }) };

        const { parsed, citations } = await researchGC(client.name, client.gc_metro || null);

        // Conservative write: tags + sourced note always; payment_flag only on clear, confident signal.
        const newTags = Array.isArray(parsed.risk_tags) ? parsed.risk_tags.filter(t => typeof t === 'string').slice(0, 8) : [];
        const mergedTags = [...new Set([...(client.risk_tags || []), ...newTags])];
        const note = `[Research ${new Date().toISOString().slice(0, 10)}] ${parsed.summary || ''}${citations.length ? ` (sources: ${citations.slice(0, 3).join(', ')})` : ''}`;
        const update = {
            risk_tags: mergedTags,
            notes: client.notes ? `${client.notes}\n\n${note}` : note
        };
        let flagChanged = null;
        if (parsed.enough_data && parsed.confidence === 'high' && VALID_FLAGS.includes(parsed.payment_signal)) {
            update.payment_flag = parsed.payment_signal;
            flagChanged = parsed.payment_signal;
        }
        const { error: upErr } = await db().from('clients').update(update).eq('id', client.id);
        if (upErr) throw upErr;

        await db().from('admin_events').insert({
            event_type: 'gc_enriched', user_id: client.user_id,
            event_data: { client_id: client.id, gc: client.name, payment_signal: parsed.payment_signal, confidence: parsed.confidence, flag_set: flagChanged, tags_added: newTags }
        }).then(() => {}, () => {});

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, gc: client.name, payment_signal: parsed.payment_signal, confidence: parsed.confidence, flag_set: flagChanged, tags_added: newTags, summary: parsed.summary }) };
    } catch (e) {
        await sendAlert({ source: 'enrich-gc', severity: 'warning', title: 'GC enrichment failed', detail: e.message, dedupeKey: 'enrich-gc-fail' });
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
};
