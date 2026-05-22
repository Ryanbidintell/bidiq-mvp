// netlify/functions/microsoft-oauth-callback.js
// Handles Microsoft OAuth redirect after user consents to Mail.Send scope.
//
// Flow:
//   1. Microsoft redirects here with ?code=...&state=...
//   2. We HMAC-verify the state to recover user_id
//   3. POST to Microsoft token endpoint to exchange code → access + refresh tokens
//   4. Fetch user's email address from Graph /me endpoint
//   5. Encrypt tokens via oauth-shared/token-crypto
//   6. Upsert into user_email_integrations
//   7. Redirect browser back to /app.html?ms_connected=true
//
// SECURITY:
//   - Tokens never logged or included in redirect query strings
//   - State is HMAC-verified to prevent CSRF
//   - Tokens encrypted at rest with AES-256-GCM (TOKEN_ENCRYPTION_KEY)

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { encryptToken } = require('./oauth-shared/token-crypto');

const MS_CLIENT_ID     = process.env.MICROSOFT_OAUTH_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
const MS_CALLBACK_URL  = process.env.MICROSOFT_OAUTH_CALLBACK_URL;
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL = 'https://bidintell.ai/app.html';
const STATE_TTL_MS = 10 * 60 * 1000;

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

function redirectWithError(reason) {
  return {
    statusCode: 302,
    headers: { Location: `${APP_URL}?ms_error=${encodeURIComponent(reason)}` },
    body: '',
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) {
    return redirectWithError(oauthError === 'access_denied' ? 'denied' : oauthError);
  }
  if (!code || !state) {
    return redirectWithError('invalid_request');
  }

  // Verify HMAC-signed state — same pattern as google-oauth-callback.js
  let userId;
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) throw new Error('Bad state format');
    const [uid, timestamp, receivedHmac] = parts;
    if (receivedHmac.length !== 64) throw new Error('Bad HMAC length');

    const expectedHmac = crypto
      .createHmac('sha256', MS_CLIENT_SECRET)
      .update(`${uid}|${timestamp}`)
      .digest('hex');

    const received = Buffer.from(receivedHmac, 'hex');
    const expected = Buffer.from(expectedHmac, 'hex');
    if (!crypto.timingSafeEqual(received, expected)) throw new Error('HMAC mismatch');
    if (Date.now() - parseInt(timestamp, 10) > STATE_TTL_MS) throw new Error('State expired');
    userId = uid;
  } catch (e) {
    console.error('microsoft-oauth-callback — state verification failed:', e.message);
    return redirectWithError('state_invalid');
  }

  // Exchange code for tokens
  let tokenData;
  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        redirect_uri: MS_CALLBACK_URL,
        scope: 'Mail.Send offline_access User.Read',
      }),
    });
    if (!tokenRes.ok) {
      console.error('Microsoft token exchange failed with status:', tokenRes.status);
      return redirectWithError('token_exchange');
    }
    tokenData = await tokenRes.json();
  } catch (e) {
    console.error('microsoft-oauth-callback — token exchange error:', e.message);
    return redirectWithError('token_exchange');
  }

  const { access_token, refresh_token, expires_in, scope: grantedScope } = tokenData;
  if (!access_token || !refresh_token) {
    console.error('microsoft-oauth-callback — token response missing access_token or refresh_token');
    return redirectWithError('token_incomplete');
  }

  // Fetch email address from Microsoft Graph
  let emailAddress = null;
  try {
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      emailAddress = me.mail || me.userPrincipalName || null;
    }
  } catch (e) {
    console.error('microsoft-oauth-callback — /me fetch failed (non-fatal):', e.message);
  }
  if (!emailAddress) {
    return redirectWithError('email_unavailable');
  }

  // Encrypt tokens before persisting
  let accessTokenEncrypted, refreshTokenEncrypted;
  try {
    accessTokenEncrypted = encryptToken(access_token);
    refreshTokenEncrypted = encryptToken(refresh_token);
  } catch (e) {
    console.error('microsoft-oauth-callback — encryption failed:', e.message);
    return redirectWithError('encryption_failed');
  }

  const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();
  const scopes = (grantedScope || '').split(/\s+/).filter(Boolean);

  try {
    const { error: dbError } = await getSupabase()
      .from('user_email_integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'microsoft',
          email_address: emailAddress,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: tokenExpiresAt,
          scopes_granted: scopes,
          is_active: true,
          connected_at: new Date().toISOString(),
          disconnected_at: null,
        },
        { onConflict: 'user_id' }
      );
    if (dbError) throw dbError;
  } catch (e) {
    console.error('microsoft-oauth-callback — DB save error:', e.message);
    return redirectWithError('db_save');
  }

  return {
    statusCode: 302,
    headers: { Location: `${APP_URL}?ms_connected=true` },
    body: '',
  };
};
