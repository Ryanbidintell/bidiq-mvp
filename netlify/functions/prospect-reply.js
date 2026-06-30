// netlify/functions/prospect-reply.js
// Postmark inbound webhook — marks a prospect as replied and stops their sequence.
//
// SETUP REQUIRED:
// 1. Postmark Dashboard → Servers → Create new server (e.g. "BidIntell Prospect Replies")
//    Set inbound webhook URL to: https://bidintell.ai/.netlify/functions/prospect-reply
//    Note the inbound email address (e.g. <hash>@inbound.postmarkapp.com)
// 2. Gmail Settings → Filters → Create filter
//    Criteria: To: hello@bidintell.ai (or leave blank to catch all incoming)
//    Action: Forward a copy to <new inbound address from step 1>
// 3. Netlify env vars needed:
//    SUPABASE_URL, SUPABASE_SERVICE_KEY (already set)
//    POSTMARK_PROSPECT_REPLY_TOKEN (optional shared secret — set in Netlify + Postmark custom header)

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let _supabase = null;
function getSupabase() {
    if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return _supabase;
}

// Extract bare email address from "Display Name <email@domain.com>" or "email@domain.com"
function extractEmail(raw) {
    if (!raw) return null;
    const angleMatch = raw.match(/<([^>]+)>/);
    return (angleMatch ? angleMatch[1] : raw).trim().toLowerCase();
}

exports.handler = async (event) => {
    // Always return 200 — Postmark retries on non-2xx responses
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: 'ok' };
    }

    // Optional shared secret to block spoofed webhooks.
    // Set POSTMARK_PROSPECT_REPLY_TOKEN in Netlify env and as a custom header
    // (X-Prospect-Reply-Token) in Postmark's inbound webhook settings.
    const inboundToken = event.headers['x-prospect-reply-token']
        || event.headers['X-Prospect-Reply-Token'];
    // Fail CLOSED: require the shared secret. Previously, if POSTMARK_PROSPECT_REPLY_TOKEN
    // was unset the check was skipped and anyone could POST to mark prospects "replied"
    // and stop their sequence. Now an unset secret rejects all calls.
    if (!process.env.POSTMARK_PROSPECT_REPLY_TOKEN
            || inboundToken !== process.env.POSTMARK_PROSPECT_REPLY_TOKEN) {
        console.warn('prospect-reply: rejected — missing/invalid X-Prospect-Reply-Token (or POSTMARK_PROSPECT_REPLY_TOKEN unset)');
        return { statusCode: 200, body: 'ok' };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 200, body: 'ok' };
    }

    // Prefer the structured FromFull.Email field; fall back to parsing the From string
    const fromRaw = payload.FromFull?.Email || payload.From || '';
    const fromEmail = extractEmail(fromRaw);

    if (!fromEmail) {
        console.warn('prospect-reply: no From email in payload');
        return { statusCode: 200, body: 'ok' };
    }

    const supabase = getSupabase();

    // Case-insensitive lookup by owner_email
    const { data: prospect, error: lookupErr } = await supabase
        .from('prospects')
        .select('id, replied_at, status')
        .ilike('owner_email', fromEmail)
        .maybeSingle();

    if (lookupErr) {
        console.error('prospect-reply: lookup error', lookupErr.message);
        return { statusCode: 200, body: 'ok' };
    }

    if (!prospect) {
        console.log(`prospect-reply: no prospect found for ${fromEmail} — ignoring`);
        return { statusCode: 200, body: 'ok' };
    }

    // Idempotent: if already replied, skip without error
    if (prospect.replied_at) {
        console.log(`prospect-reply: already marked replied for ${fromEmail} — no-op`);
        return { statusCode: 200, body: 'ok' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
        .from('prospects')
        .update({ replied_at: now, status: 'replied' })
        .eq('id', prospect.id);

    if (updateErr) {
        console.error('prospect-reply: update error', updateErr.message);
        return { statusCode: 200, body: 'ok' };
    }

    // Log the reply event (non-fatal)
    await supabase
        .from('prospect_sequence_events')
        .insert({
            prospect_id: prospect.id,
            event_type: 'reply_received',
            step: null,
            metadata: {
                from_email: fromEmail,
                subject: payload.Subject || null,
                received_at: now
            }
        })
        .then(({ error }) => {
            if (error) console.warn('prospect-reply: event log failed', error.message);
        });

    console.log(`prospect-reply: ✅ marked ${fromEmail} as replied at ${now}`);
    return { statusCode: 200, body: 'ok' };
};
