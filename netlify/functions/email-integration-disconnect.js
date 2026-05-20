// netlify/functions/email-integration-disconnect.js
// Disconnects the user's email integration (Google or Microsoft).
//
// Soft-disconnect by default: sets is_active=false, disconnected_at=now.
// Refresh token stays encrypted in DB until user reconnects (which upserts
// over the row) — this lets us tell "never connected" from "previously
// connected then disconnected" in the UI.
//
// Optional ?revoke=true also calls the provider's revoke endpoint to
// invalidate the refresh token at Google/Microsoft.
//
// Auth: requires user_token (Supabase JWT) — only the owner can disconnect
// their own integration.

const { createClient } = require('@supabase/supabase-js');
const { decryptToken } = require('./oauth-shared/token-crypto');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

async function revokeGoogleToken(refreshToken) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.ok;
  } catch (err) {
    console.error('Google token revoke failed:', err.message);
    return false;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  const { user_token, revoke } = body;
  if (!user_token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'user_token required' }) };
  }

  let userId;
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(user_token);
    if (error || !user) throw new Error('Invalid or expired token');
    userId = user.id;
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication failed' }) };
  }

  // Optionally revoke at the provider before soft-disconnecting locally
  if (revoke) {
    try {
      const { data: integration } = await getSupabase()
        .from('user_email_integrations')
        .select('provider, refresh_token_encrypted')
        .eq('user_id', userId)
        .maybeSingle();
      if (integration?.refresh_token_encrypted) {
        const refreshToken = decryptToken(integration.refresh_token_encrypted);
        if (integration.provider === 'google' && refreshToken) {
          await revokeGoogleToken(refreshToken);
        }
        // Microsoft revoke handled when M365 OAuth ships (Week 5)
      }
    } catch (e) {
      console.error('Revoke step failed (non-fatal):', e.message);
    }
  }

  // Soft-disconnect: keep row history, flip flags
  const { error: dbError } = await getSupabase()
    .from('user_email_integrations')
    .update({
      is_active: false,
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (dbError) {
    console.error('email-integration-disconnect — DB update failed:', dbError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Disconnect failed' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
