// netlify/functions/extension-token.js
//
// Mints (and revokes) the long-lived token the Chrome extension uses to send
// bid packages. Called by /extension-connect.html AFTER the user is already
// logged in with a normal Supabase session — this is NOT a new login method.
//
// Two actions, distinguished by how the caller authenticates:
//   mint   — Authorization: Bearer <supabase session JWT>. Verified server-side
//            via auth.getUser(); the user id is NEVER read from the body
//            (see CLAUDE.md "Endpoint Security", Jun 30 2026 — the Stripe IDOR).
//   revoke — Authorization: Bearer <bix_… extension token>. Possession of the
//            token authorizes revoking that same token, so Disconnect works
//            without a live web session.
//
// The raw token is returned exactly once and never stored; only its sha256 hash
// goes in the DB (migration 20260807_extension_tokens.sql).

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { sendAlert } = require('./alert');

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
// Every function in this repo uses SUPABASE_SERVICE_KEY; the _ROLE_ name is unset
// in Netlify and .env. Accept it as a fallback but don't read it alone.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Anon client is sufficient to verify a JWT.
const supabaseAuth  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// A user should mint a handful of tokens ever, not hundreds. In-memory per
// cold start — same approach as analyze.js. Enough to stop a runaway loop.
const MAX_MINTS_PER_HOUR = 10;
const mintLimits = new Map();

function checkMintLimit(userId) {
    const hourAgo = Date.now() - 3600000;
    const hits = (mintLimits.get(userId) || []).filter(t => t > hourAgo);
    if (hits.length >= MAX_MINTS_PER_HOUR) return false;
    hits.push(Date.now());
    mintLimits.set(userId, hits);
    return true;
}

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!bearer) return json(401, { error: 'Missing authorization' });

    let action = 'mint';
    try {
        if (event.body) action = (JSON.parse(event.body).action || 'mint');
    } catch {
        return json(400, { error: 'Invalid JSON body' });
    }

    try {
        // ---------- revoke ----------
        if (action === 'revoke') {
            // Authorized by possession of the extension token itself.
            const { error } = await supabaseAdmin
                .from('extension_tokens')
                .update({ revoked_at: new Date().toISOString() })
                .eq('token_hash', hashToken(bearer))
                .is('revoked_at', null);

            // Supabase updates never throw — always destructure and check.
            if (error) throw new Error(`revoke failed: ${error.message}`);
            return json(200, { ok: true });
        }

        // ---------- mint ----------
        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(bearer);
        if (userErr || !userData || !userData.user) {
            return json(401, { error: 'Invalid or expired session' });
        }
        const userId = userData.user.id;

        if (!checkMintLimit(userId)) {
            return json(429, { error: 'Too many connection attempts. Try again in an hour.' });
        }

        // The extension identifies its user through this alias, exactly like an
        // email forward does. Without one there is nothing to send bids to, so
        // fail loudly here rather than minting a token that can't score anything.
        const { data: settings, error: settingsErr } = await supabaseAdmin
            .from('user_settings')
            .select('email_alias')
            .eq('user_id', userId)
            .maybeSingle();

        if (settingsErr) throw new Error(`user_settings lookup failed: ${settingsErr.message}`);
        if (!settings || !settings.email_alias) {
            return json(409, {
                error: 'Your account does not have a bid-forwarding address yet. Open bidintell.ai/app.html once to finish setup, then reconnect.'
            });
        }

        const rawToken = `bix_${crypto.randomBytes(32).toString('hex')}`;

        const { error: insertErr } = await supabaseAdmin
            .from('extension_tokens')
            .insert({
                user_id: userId,
                token_hash: hashToken(rawToken),
                label: (event.headers['user-agent'] || '').slice(0, 120) || null
            });

        if (insertErr) throw new Error(`token insert failed: ${insertErr.message}`);

        return json(200, { token: rawToken });
    } catch (error) {
        await sendAlert({
            source: 'extension-token',
            severity: 'error',
            title: `Extension token ${action} failed`,
            detail: error.message,
            dedupeKey: `extension-token-${action}`,
            context: { stack: error.stack }
        });
        return json(500, { error: 'Could not complete the request. Please try again.' });
    }
};
