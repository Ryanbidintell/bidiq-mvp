// netlify/functions/send-followup-email.js
// Sends an approved follow-up email via the user's connected email account.
// Called from app.html when the user clicks Send in the Approval Modal.
//
// Rate limit: max 10 sends per hour per user (in-memory; resets on cold start).
//
// SECURITY: Tokens never logged. send_error stored without token data.

const { createClient } = require('@supabase/supabase-js');
const { getValidAccessToken } = require('./oauth-shared/refresh-oauth-token');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MAX_SENDS_PER_HOUR = 10;
const sendCounts = new Map(); // userId → [timestamp, ...]

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

function checkSendRateLimit(userId) {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const recent = (sendCounts.get(userId) || []).filter(t => t > hourAgo);
  if (recent.length >= MAX_SENDS_PER_HOUR) return false;
  recent.push(now);
  sendCounts.set(userId, recent);
  return true;
}

async function sendViaGmail(accessToken, { from, to, subject, body }) {
  // RFC 2822 message
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join('\r\n');

  const encoded = Buffer.from(message).toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Gmail send failed (${res.status}): ${errBody.error?.message || 'unknown'}`);
  }
  return res.json();
}

async function sendViaMicrosoft(accessToken, { to, subject, body }) {
  const payload = {
    message: {
      subject,
      body: { contentType: 'Text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const detail = errBody.error?.message || errBody.error?.code || 'unknown';
    throw new Error(`Microsoft send failed (${res.status}): ${detail}`);
  }
  // Microsoft returns 202 No Content on success
  return { success: true };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { user_token, touchId, finalSubject, finalBody } = body;
  if (!user_token || !touchId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'user_token and touchId required' }) };
  }

  // Verify auth
  let userId;
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(user_token);
    if (error || !user) throw new Error('Invalid or expired token');
    userId = user.id;
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication failed' }) };
  }

  // Rate limit
  if (!checkSendRateLimit(userId)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Rate limit: max 10 sends per hour. Try again later.' }) };
  }

  // Load touch — verify ownership via RLS by using user_id filter
  const { data: touch, error: touchErr } = await getSupabase()
    .from('follow_up_touches')
    .select('*, schedule:follow_up_schedules(project:projects(name, gc_contact_name))')
    .eq('id', touchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (touchErr || !touch) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Touch not found' }) };
  }
  if (touch.status !== 'awaiting_approval') {
    return { statusCode: 400, body: JSON.stringify({ error: `Touch status is '${touch.status}', expected 'awaiting_approval'` }) };
  }

  // Load email integration
  const { data: integration, error: integErr } = await getSupabase()
    .from('user_email_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (integErr || !integration) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No active email integration. Connect Gmail or Microsoft 365 in Settings.' }) };
  }

  // Get a valid (possibly refreshed) access token
  let accessToken;
  try {
    accessToken = await getValidAccessToken(integration, getSupabase());
  } catch (e) {
    console.error('send-followup-email — token refresh failed:', e.message);
    await getSupabase()
      .from('follow_up_touches')
      .update({ status: 'failed', send_error: 'Token refresh failed — reconnect your email in Settings.' })
      .eq('id', touchId);
    return { statusCode: 502, body: JSON.stringify({ error: 'Token refresh failed. Reconnect your email in Settings.' }) };
  }

  const subjectToSend = (finalSubject || touch.user_edited_subject || touch.draft_subject || '').trim();
  const bodyToSend    = (finalBody   || touch.user_edited_body   || touch.draft_body   || '').trim();

  if (!subjectToSend || !bodyToSend) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Subject and body are required' }) };
  }

  // Send
  try {
    if (integration.provider === 'google') {
      await sendViaGmail(accessToken, {
        from: integration.email_address,
        to: touch.recipient_email,
        subject: subjectToSend,
        body: bodyToSend,
      });
    } else if (integration.provider === 'microsoft') {
      await sendViaMicrosoft(accessToken, {
        to: touch.recipient_email,
        subject: subjectToSend,
        body: bodyToSend,
      });
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: `Unknown provider: ${integration.provider}` }) };
    }
  } catch (e) {
    console.error('send-followup-email — send failed:', e.message);
    await getSupabase()
      .from('follow_up_touches')
      .update({ status: 'failed', send_error: e.message.slice(0, 500) })
      .eq('id', touchId);
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }

  const now = new Date().toISOString();

  // Mark touch as sent
  await getSupabase()
    .from('follow_up_touches')
    .update({
      status: 'sent',
      sent_at: now,
      user_edited_subject: finalSubject || null,
      user_edited_body: finalBody || null,
    })
    .eq('id', touchId);

  // Increment send counter on the integration
  await getSupabase()
    .from('user_email_integrations')
    .update({
      last_send_at: now,
      total_sends: (integration.total_sends || 0) + 1,
    })
    .eq('id', integration.id);

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
