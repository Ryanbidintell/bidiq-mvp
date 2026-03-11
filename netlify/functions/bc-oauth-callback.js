// /.netlify/functions/bc-oauth-callback
// Handles the Autodesk APS OAuth redirect after user authorizes BidIntell.
//
// Flow:
//   1. Autodesk redirects here with ?code=...&state=...
//   2. We verify + decode the state to recover user_id
//   3. We POST to Autodesk token endpoint to exchange code → access/refresh tokens
//   4. We upsert tokens into oauth_connections table (service role key)
//   5. We redirect user back to app.html?bc_connected=true
//
// SECURITY NOTES:
//   - Tokens are never logged or exposed in redirects
//   - State is HMAC-verified to prevent CSRF
//   - oauth_connections rows are never hard-deleted (status='revoked' instead)

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const APS_CLIENT_ID     = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_CALLBACK_URL  = process.env.APS_CALLBACK_URL;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL = 'https://bidintell.ai/app.html';

let supabase = null;
function getSupabase() {
    if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return supabase;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const { code, state, error: oauthError } = event.queryStringParameters || {};

    // User denied authorization on Autodesk side
    if (oauthError) {
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=denied` },
            body: ''
        };
    }

    if (!code || !state) {
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=invalid` },
            body: ''
        };
    }

    // ── Verify & decode state ─────────────────────────────────────────────────
    let userId;
    try {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        const parts   = decoded.split('|');

        if (parts.length !== 3) throw new Error('Bad state format');

        const [uid, timestamp, receivedHmac] = parts;

        // HMAC must be exactly 64 hex chars; reject anything else before timingSafeEqual
        if (receivedHmac.length !== 64) throw new Error('Bad HMAC length');

        const expectedHmac = crypto
            .createHmac('sha256', APS_CLIENT_SECRET)
            .update(`${uid}|${timestamp}`)
            .digest('hex');

        const received = Buffer.from(receivedHmac, 'hex');
        const expected = Buffer.from(expectedHmac, 'hex');

        if (!crypto.timingSafeEqual(received, expected)) {
            throw new Error('HMAC mismatch');
        }

        // State expires after 10 minutes
        if (Date.now() - parseInt(timestamp, 10) > 10 * 60 * 1000) {
            throw new Error('State expired');
        }

        userId = uid;
    } catch (e) {
        console.error('BC OAuth callback — state verification failed:', e.message);
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=state_invalid` },
            body: ''
        };
    }

    // ── Exchange authorization code for tokens ────────────────────────────────
    let tokenData;
    try {
        const tokenRes = await fetch(
            'https://developer.api.autodesk.com/authentication/v2/token',
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type:    'authorization_code',
                    code,
                    client_id:     APS_CLIENT_ID,
                    client_secret: APS_CLIENT_SECRET,
                    redirect_uri:  APS_CALLBACK_URL
                })
            }
        );

        if (!tokenRes.ok) {
            // Log status only — never log the raw response body which may contain tokens
            console.error('APS token exchange failed with status:', tokenRes.status);
            throw new Error('Token exchange failed');
        }

        tokenData = await tokenRes.json();
    } catch (e) {
        console.error('BC OAuth callback — token exchange error:', e.message);
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=token_exchange` },
            body: ''
        };
    }

    // Destructure only what we need — do not log token values
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    if (!access_token) {
        console.error('BC OAuth callback — token response missing access_token');
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=token_missing` },
            body: ''
        };
    }

    const tokenExpiresAt = new Date(
        Date.now() + (expires_in || 3600) * 1000
    ).toISOString();

    // ── Save tokens to oauth_connections ─────────────────────────────────────
    // Upsert on (user_id, provider) so reconnecting replaces the old record.
    // Never hard-delete — revoked rows keep their history.
    try {
        const { error: dbError } = await getSupabase()
            .from('oauth_connections')
            .upsert(
                {
                    user_id:          userId,
                    provider:         'buildingconnected',
                    access_token,
                    refresh_token:    refresh_token || null,
                    token_expires_at: tokenExpiresAt,
                    scope:            scope || null,
                    connected_at:     new Date().toISOString(),
                    status:           'active'
                },
                { onConflict: 'user_id,provider' }
            );

        if (dbError) throw dbError;
    } catch (e) {
        console.error('BC OAuth callback — DB save error:', e.message);
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=db_save` },
            body: ''
        };
    }

    return {
        statusCode: 302,
        headers: { Location: `${APP_URL}?bc_connected=true` },
        body: ''
    };
};
