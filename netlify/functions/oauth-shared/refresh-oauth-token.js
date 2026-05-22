// oauth-shared/refresh-oauth-token.js
// Refreshes an expired OAuth access token transparently.
// Used by send-followup-email.js before every send.
//
// SECURITY: Never log tokens. Scrub from any debug output.

const { decryptToken, encryptToken } = require('./token-crypto');

async function refreshGoogleToken(clientId, clientSecret, refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google refresh failed (${res.status}): ${body.slice(0, 100)}`);
  }
  return res.json();
}

async function refreshMicrosoftToken(clientId, clientSecret, callbackUrl, refreshToken) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      scope: 'Mail.Send offline_access User.Read',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Microsoft refresh failed (${res.status}): ${body.slice(0, 100)}`);
  }
  return res.json();
}

/**
 * Returns a valid plaintext access token for the given integration row.
 * If the stored token is still fresh (>60s remaining), decrypts and returns it.
 * Otherwise refreshes at the provider, persists the new token, and returns it.
 *
 * @param {object} integration  - Row from user_email_integrations
 * @param {object} supabase     - Service-role Supabase client
 * @returns {string}            - Plaintext access token (NEVER log this)
 */
async function getValidAccessToken(integration, supabase) {
  const now = Date.now();
  const expiresAt = new Date(integration.token_expires_at).getTime();

  if (now < expiresAt - 60000) {
    return decryptToken(integration.access_token_encrypted);
  }

  const refreshToken = decryptToken(integration.refresh_token_encrypted);
  let newTokens;

  if (integration.provider === 'google') {
    newTokens = await refreshGoogleToken(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refreshToken
    );
  } else if (integration.provider === 'microsoft') {
    newTokens = await refreshMicrosoftToken(
      process.env.MICROSOFT_OAUTH_CLIENT_ID,
      process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
      process.env.MICROSOFT_OAUTH_CALLBACK_URL,
      refreshToken
    );
  } else {
    throw new Error(`Unknown provider: ${integration.provider}`);
  }

  const newAccessTokenEncrypted = encryptToken(newTokens.access_token);
  const newExpiresAt = new Date(now + (newTokens.expires_in || 3600) * 1000).toISOString();

  // Persist the refreshed access token (refresh_token typically unchanged)
  const { error } = await supabase
    .from('user_email_integrations')
    .update({
      access_token_encrypted: newAccessTokenEncrypted,
      token_expires_at: newExpiresAt,
    })
    .eq('id', integration.id);

  if (error) {
    console.error('refresh-oauth-token — DB update failed:', error.message);
    // Non-fatal: still return the token so the current send doesn't fail
  }

  return newTokens.access_token;
}

module.exports = { getValidAccessToken };
