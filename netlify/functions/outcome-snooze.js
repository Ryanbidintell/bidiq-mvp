// outcome-snooze.js
// Netlify function — handles token-based snooze / skip / unsubscribe from email links
// No login required — the HMAC token in the email link authenticates the request
//
// Actions:
//   snooze7      — snooze all pending bids for this user for 7 days
//   snooze14     — snooze all pending bids for this user for 14 days
//   skip         — set outcome_nudge_count = MAX_NUDGES for this user's pending bids (no more reminders)
//   unsubscribe  — set outcome_reminder_days = null in user_settings (global opt-out)

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const HMAC_SECRET = process.env.REMINDER_HMAC_SECRET || process.env.SUPABASE_SERVICE_KEY || 'bidintell-reminder-secret';
const APP_URL = 'https://bidintell.ai/app';

function makeToken(projectId, userId) {
    return crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(`${projectId}:${userId}`)
        .digest('hex')
        .slice(0, 32);
}

function html(title, message, showAppLink = true) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — BidIntell</title></head>
<body style="font-family:-apple-system,sans-serif;max-width:460px;margin:60px auto;padding:0 24px;color:#1a1a1a;text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F26522;margin-bottom:20px;">BIDINTELL</div>
    <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
    <p style="color:#555;line-height:1.6;margin:0 0 24px;">${message}</p>
    ${showAppLink ? `<a href="${APP_URL}" style="font-family:sans-serif;font-size:14px;color:#F26522;text-decoration:none;font-weight:600;">Open BidIntell →</a>` : ''}
</body>
</html>`;
}

exports.handler = async (event) => {
    const params = event.queryStringParameters || {};
    const token = params.token;
    const action = params.action;

    const redirectHeaders = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
    };

    if (!token || !action) {
        return { statusCode: 400, headers: redirectHeaders, body: html('Bad Request', 'Missing token or action.', false) };
    }

    if (!['snooze7', 'snooze14', 'skip', 'unsubscribe'].includes(action)) {
        return { statusCode: 400, headers: redirectHeaders, body: html('Bad Request', 'Unknown action.', false) };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { statusCode: 500, headers: redirectHeaders, body: html('Error', 'Service unavailable. Please try again.', false) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Look up the project by token
    const { data: project, error: projErr } = await supabase
        .from('projects')
        .select('id, user_id, outcome_nudge_count')
        .eq('outcome_reminder_token', token)
        .single();

    if (projErr || !project) {
        return { statusCode: 404, headers: redirectHeaders, body: html('Link expired', 'This link has expired or is no longer valid.', true) };
    }

    const { id: projectId, user_id: userId } = project;

    // Verify HMAC to prevent token forgery
    const expectedToken = makeToken(projectId, userId);
    if (token !== expectedToken) {
        return { statusCode: 403, headers: redirectHeaders, body: html('Invalid link', 'This link is not valid.', false) };
    }

    const now = new Date();

    // ── Snooze 7 days ──────────────────────────────────────────────────────────
    if (action === 'snooze7' || action === 'snooze14') {
        const days = action === 'snooze7' ? 7 : 14;
        const snoozeUntil = new Date(now.getTime() + days * 86400000);

        // Snooze all pending bids for this user
        const { error: updateErr } = await supabase
            .from('projects')
            .update({ outcome_snooze_until: snoozeUntil.toISOString() })
            .eq('user_id', userId)
            .eq('outcome', 'pending');

        if (updateErr) console.error('[outcome-snooze] snooze update error:', updateErr.message);

        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'outcome_reminder_snoozed',
            event_data: { action, days, token, snoozed_until: snoozeUntil.toISOString() }
        }).catch(() => {});

        return {
            statusCode: 200,
            headers: redirectHeaders,
            body: html(
                `Snoozed for ${days} days`,
                `We'll remind you about your pending bids again on ${snoozeUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. If you log outcomes before then, we won't send the reminder.`
            )
        };
    }

    // ── Skip — stop reminders for all current pending bids ────────────────────
    if (action === 'skip') {
        const { error: updateErr } = await supabase
            .from('projects')
            .update({ outcome_nudge_count: 3 }) // MAX_NUDGES = 3
            .eq('user_id', userId)
            .eq('outcome', 'pending')
            .lt('outcome_nudge_count', 3);

        if (updateErr) console.error('[outcome-snooze] skip update error:', updateErr.message);

        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'outcome_reminder_skipped',
            event_data: { token, skipped_at: now.toISOString() }
        }).catch(() => {});

        return {
            statusCode: 200,
            headers: redirectHeaders,
            body: html(
                "Got it",
                "We won't send any more reminders for your current open bids. If you add new bids in the future, we'll still follow up on those."
            )
        };
    }

    // ── Global unsubscribe ────────────────────────────────────────────────────
    if (action === 'unsubscribe') {
        const { error: updateErr } = await supabase
            .from('user_settings')
            .update({ outcome_reminder_days: null })
            .eq('user_id', userId);

        if (updateErr) console.error('[outcome-snooze] unsubscribe update error:', updateErr.message);

        // Also snooze all pending bids far into the future so the in-app banner
        // disappears immediately on next page load (before cached settings refresh).
        const farFuture = new Date('2099-01-01').toISOString();
        await supabase
            .from('projects')
            .update({ outcome_snooze_until: farFuture })
            .eq('user_id', userId)
            .eq('outcome', 'pending')
            .catch(e => console.warn('[outcome-snooze] banner snooze failed:', e.message));

        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'outcome_reminder_unsubscribed',
            event_data: { token, unsubscribed_at: now.toISOString() }
        }).catch(() => {});

        return {
            statusCode: 200,
            headers: redirectHeaders,
            body: html(
                "Reminders off",
                'You\'ve turned off outcome reminders. You can re-enable them any time in Settings → Notification Preferences.',
                true
            )
        };
    }
};
