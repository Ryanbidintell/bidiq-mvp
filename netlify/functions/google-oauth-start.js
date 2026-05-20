// netlify/functions/google-oauth-start.js
// Initiates Google OAuth 2.0 flow for sending email on behalf of the user.
// Restricted scope: gmail.send (requires Google verification — see spec §5).
//
// Flow:
//   1. Client GETs this URL with ?user_token=<supabase_jwt>
//   2. We verify the JWT via Supabase admin to get user_id
//   3. We build an HMAC-signed state value encoding user_id + timestamp
//   4. We redirect the browser to Google's consent screen
//
// Env vars required:
//   GOOGLE_OAUTH_CLIENT_ID      — from Google Cloud Console
//   GOOGLE_OAUTH_CLIENT_SECRET  — used for HMAC-signing state (NOT sent to Google here)
//   GOOGLE_OAUTH_CALLBACK_URL   — e.g. https://bidintell.ai/.netlify/functions/google-oauth-callback
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL  = process.env.GOOGLE_OAUTH_CALLBACK_URL;
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL = 'https://bidintell.ai/app.html';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    console.error('Google OAuth env vars missing');
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?gmail_error=not_configured` },
      body: '',
    };
  }

  const { user_token } = event.queryStringParameters || {};
  if (!user_token) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?gmail_error=missing_token` },
      body: '',
    };
  }

  // Verify the Supabase JWT and extract user_id
  let userId;
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(user_token);
    if (error || !user) throw new Error('Invalid or expired token');
    userId = user.id;
  } catch (e) {
    console.error('google-oauth-start — token verification failed:', e.message);
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?gmail_error=auth_failed` },
      body: '',
    };
  }

  // HMAC-signed state: userId|timestamp|hmac, base64url-encoded.
  // The HMAC binds user_id + timestamp to GOOGLE_OAUTH_CLIENT_SECRET so the
  // callback can verify the state came from us. State expires after 10 min.
  const timestamp = Date.now().toString();
  const payload = `${userId}|${timestamp}`;
  const hmac = crypto.createHmac('sha256', GOOGLE_CLIENT_SECRET).update(payload).digest('hex');
  const state = Buffer.from(`${payload}|${hmac}`).toString('base64url');

  const authParams = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: GOOGLE_CALLBACK_URL,
    scope: SCOPES,
    access_type: 'offline',         // required to get refresh_token
    prompt: 'consent',              // force consent screen so refresh_token always returned
    include_granted_scopes: 'true',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: '',
  };
};
