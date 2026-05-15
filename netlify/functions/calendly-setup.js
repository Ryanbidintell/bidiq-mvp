// netlify/functions/calendly-setup.js
// One-shot diagnostic + repair tool for the Calendly webhook subscription.
//
// GET  /.netlify/functions/calendly-setup?key=...           → lists current webhook subscriptions
// POST /.netlify/functions/calendly-setup?key=...&action=recreate → deletes existing diagnostic-prep webhooks
//                                                             and creates a fresh one. Returns the new
//                                                             signing_key for CALENDLY_WEBHOOK_SECRET.
//
// Required env vars:
//   CALENDLY_API_TOKEN     — Personal Access Token from calendly.com/integrations/api_webhooks
//   CALENDLY_SETUP_SECRET  — random string to gate this endpoint (set anything; pass in ?key=)
//
// After running recreate, you must:
//   1. Copy signing_key from the response
//   2. Update CALENDLY_WEBHOOK_SECRET in Netlify env vars
//   3. Trigger a redeploy so diagnostic-prep picks up the new secret
//   4. Test with a real booking — should hit diagnostic-prep within seconds

const WEBHOOK_URL = 'https://bidintell.ai/.netlify/functions/diagnostic-prep';
const CALENDLY_API = 'https://api.calendly.com';

async function calendlyFetch(path, token, options = {}) {
  const fetchFn = global.fetch || require('node-fetch');
  const res = await fetchFn(`${CALENDLY_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function getCurrentUser(token) {
  const res = await calendlyFetch('/users/me', token);
  if (res.status !== 200) {
    throw new Error(`Calendly /users/me returned ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.resource;
}

async function listWebhooks(token, organizationUri, userUri) {
  const params = new URLSearchParams({ organization: organizationUri, user: userUri, scope: 'user' });
  const res = await calendlyFetch(`/webhook_subscriptions?${params}`, token);
  if (res.status !== 200) {
    throw new Error(`List webhooks returned ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.collection || [];
}

async function deleteWebhook(token, webhookUri) {
  const uuid = webhookUri.split('/').pop();
  const res = await calendlyFetch(`/webhook_subscriptions/${uuid}`, token, { method: 'DELETE' });
  return res.status === 204 || res.status === 200;
}

async function createWebhook(token, organizationUri, userUri) {
  const res = await calendlyFetch('/webhook_subscriptions', token, {
    method: 'POST',
    body: JSON.stringify({
      url: WEBHOOK_URL,
      events: ['invitee.created'],
      organization: organizationUri,
      user: userUri,
      scope: 'user',
    }),
  });
  if (res.status !== 201) {
    throw new Error(`Create webhook returned ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.resource;
}

exports.handler = async (event) => {
  const key = (event.queryStringParameters || {}).key;
  if (!process.env.CALENDLY_SETUP_SECRET || key !== process.env.CALENDLY_SETUP_SECRET) {
    return { statusCode: 401, body: 'Unauthorized — set CALENDLY_SETUP_SECRET env var and pass it in ?key=' };
  }

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'CALENDLY_API_TOKEN env var is not set in Netlify. Generate a Personal Access Token at https://calendly.com/integrations/api_webhooks and add it to Netlify environment variables.',
      }, null, 2),
    };
  }

  try {
    const user = await getCurrentUser(token);
    const userUri = user.uri;
    const organizationUri = user.current_organization;

    const action = (event.queryStringParameters || {}).action;

    if (event.httpMethod === 'GET' || !action) {
      const subs = await listWebhooks(token, organizationUri, userUri);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { uri: userUri, organization: organizationUri, email: user.email, name: user.name },
          expected_webhook_url: WEBHOOK_URL,
          subscriptions: subs.map((s) => ({
            uri: s.uri,
            callback_url: s.callback_url,
            events: s.events,
            state: s.state,
            created_at: s.created_at,
            matches_our_url: s.callback_url === WEBHOOK_URL,
          })),
        }, null, 2),
      };
    }

    if (event.httpMethod === 'POST' && action === 'recreate') {
      const subs = await listWebhooks(token, organizationUri, userUri);
      const ours = subs.filter((s) => s.callback_url === WEBHOOK_URL || s.callback_url.includes('diagnostic-prep'));
      const deleted = [];
      for (const s of ours) {
        const ok = await deleteWebhook(token, s.uri);
        deleted.push({ uri: s.uri, deleted: ok });
      }

      const fresh = await createWebhook(token, organizationUri, userUri);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleted_old_subscriptions: deleted,
          new_subscription: {
            uri: fresh.uri,
            callback_url: fresh.callback_url,
            events: fresh.events,
            state: fresh.state,
          },
          signing_key: fresh.signing_key,
          next_steps: [
            '1. Copy the signing_key value above',
            '2. Update CALENDLY_WEBHOOK_SECRET in Netlify env vars to that value',
            '3. Trigger a Netlify redeploy so diagnostic-prep picks up the new secret',
            '4. Book a test diagnostic — it should hit the function within 5 seconds',
          ],
        }, null, 2),
      };
    }

    return { statusCode: 400, body: `Unknown action: ${action}` };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack }, null, 2),
    };
  }
};
