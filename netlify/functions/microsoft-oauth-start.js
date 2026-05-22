// netlify/functions/microsoft-oauth-start.js
// Initiates Microsoft OAuth 2.0 (PKCE) flow for sending email via Microsoft Graph.
// Scope: Mail.Send + offline_access + User.Read (requires Azure app registration)
//
// Flow:
//   1. Client GETs this URL with ?user_token=<supabase_jwt>
//   2. We verify the JWT via Supabase admin to get user_id
//   3. We build an HMAC-signed state value encoding user_id + timestamp
//   4. We redirect to Microsoft identity platform consent screen
//
// Env vars required:
//   MICROSOFT_OAUTH_CLIENT_ID      — from Azure App Registration
//   MICROSOFT_OAUTH_CLIENT_SECRET  — used for HMAC-signing state
//   MICROSOFT_OAUTH_CALLBACK_URL   — e.g. https://bidintell.ai/.netlify/functions/microsoft-oauth-callback
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const MS_CLIENT_ID     = process.env.MICROSOFT_OAUTH_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
const MS_CALLBACK_URL  = process.env.MICROSOFT_OAUTH_CALLBACK_URL;
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL = 'https://bidintell.ai/app.html';

const SCOPES = [
  'Mail.Send',
  'offline_access',
  'User.Read',
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

  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET || !MS_CALLBACK_URL) {
    console.error('Microsoft OAuth env vars missing');
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?ms_error=not_configured` },
      body: '',
    };
  }

  const { user_token } = event.queryStringParameters || {};
  if (!user_token) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?ms_error=missing_token` },
      body: '',
    };
  }

  let userId;
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(user_token);
    if (error || !user) throw new Error('Invalid or expired token');
    userId = user.id;
  } catch (e) {
    console.error('microsoft-oauth-start — token verification failed:', e.message);
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?ms_error=auth_failed` },
      body: '',
    };
  }

  // HMAC-signed state identical to Google pattern: userId|timestamp|hmac, base64url-encoded.
  const timestamp = Date.now().toString();
  const payload = `${userId}|${timestamp}`;
  const hmac = crypto.createHmac('sha256', MS_CLIENT_SECRET).update(payload).digest('hex');
  const state = Buffer.from(`${payload}|${hmac}`).toString('base64url');

  const authParams = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MS_CALLBACK_URL,
    scope: SCOPES,
    response_mode: 'query',
    prompt: 'consent',
    state,
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${authParams.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: '',
  };
};
