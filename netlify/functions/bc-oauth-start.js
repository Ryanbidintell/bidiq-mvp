// /.netlify/functions/bc-oauth-start
// Initiates Autodesk APS 3-legged OAuth flow for BuildingConnected.
//
// Flow:
//   1. Client GETs this URL with ?user_token=<supabase_jwt>
//   2. We verify the JWT via Supabase admin to get user_id
//   3. We build a HMAC-signed state value encoding user_id + timestamp
//   4. We redirect the browser to Autodesk's authorization URL

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const APS_CLIENT_ID     = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_CALLBACK_URL  = process.env.APS_CALLBACK_URL;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL = 'https://bidintell.ai/app.html';

// Lazy-init Supabase client (service role — bypasses RLS, needed for auth.getUser)
let supabase = null;
function getSupabase() {
    if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return supabase;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const { user_token } = event.queryStringParameters || {};

    if (!user_token) {
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=missing_token` },
            body: ''
        };
    }

    // Verify the Supabase JWT and extract user_id
    let userId;
    try {
        const { data: { user }, error } = await getSupabase().auth.getUser(user_token);
        if (error || !user) throw new Error('Invalid or expired token');
        userId = user.id;
    } catch (e) {
        console.error('BC OAuth start — token verification failed:', e.message);
        return {
            statusCode: 302,
            headers: { Location: `${APP_URL}?bc_error=auth_failed` },
            body: ''
        };
    }

    // Build HMAC-signed state: base64url( userId|timestamp|hmac )
    // The HMAC binds user_id + timestamp to APS_CLIENT_SECRET so the callback
    // can verify the state came from us and extract user_id safely.
    const timestamp = Date.now().toString();
    const payload   = `${userId}|${timestamp}`;
    const hmac      = crypto
        .createHmac('sha256', APS_CLIENT_SECRET)
        .update(payload)
        .digest('hex');
    const state = Buffer.from(`${payload}|${hmac}`).toString('base64url');

    // Build Autodesk authorization URL (APS OAuth v2)
    const authParams = new URLSearchParams({
        client_id:     APS_CLIENT_ID,
        response_type: 'code',
        redirect_uri:  APS_CALLBACK_URL,
        scope:         'data:read',
        state
    });

    const authUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?${authParams.toString()}`;

    return {
        statusCode: 302,
        headers: { Location: authUrl },
        body: ''
    };
};
