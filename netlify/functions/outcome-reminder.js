// outcome-reminder.js
// Netlify scheduled function — runs daily at 12pm UTC
// Finds bids analyzed 7+ days ago with outcome still 'pending'
// Sends per-bid reminder with snooze/skip/unsubscribe links (no login required)
// Tracks attribution: logs admin_event when outcome is logged within 48h of a reminder
//
// Schema dependencies (run supabase/migrations/20260504_outcome_reminders.sql first):
//   projects.outcome_nudge_count    integer NOT NULL DEFAULT 0
//   projects.last_nudge_sent_at     timestamptz
//   projects.outcome_snooze_until   timestamptz
//   projects.outcome_reminder_token text UNIQUE
//   user_settings.outcome_reminder_days integer DEFAULT 21 (null = Never)

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HMAC_SECRET = process.env.REMINDER_HMAC_SECRET || process.env.SUPABASE_SERVICE_KEY || 'bidintell-reminder-secret';

const APP_URL = 'https://bidintell.ai/app';
const SNOOZE_URL = 'https://bidintell.ai/api/outcome-snooze';
const FROM_EMAIL = 'Ryan at BidIntell <hello@bidintell.ai>';
const BCC_EMAIL = 'ryan@bidintell.ai';

const DEFAULT_REMINDER_DAYS = 7;   // trigger 7 days after bid creation
const MAX_NUDGES = 3;              // stop after 3 reminders per bid

// HMAC-signed token so snooze links can't be guessed
function makeToken(projectId, userId) {
    return crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(`${projectId}:${userId}`)
        .digest('hex')
        .slice(0, 32);
}

async function sendEmail({ to, subject, html }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: FROM_EMAIL,
            to: [to],
            bcc: [BCC_EMAIL],
            subject,
            html
        })
    });
    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status}: ${err}`);
    }
}

function buildReminderHtml({ name, nudgeCount, bids, snoozeUrl7, snoozeUrl14, skipUrl, unsubUrl }) {
    const bidCount = bids.length;
    const bidRows = bids.map(bid => {
        const projectName = bid.extracted_data?.project_name || 'Unnamed bid';
        const gcName = bid.gcs?.[0]?.name || bid.extracted_data?.gc_name || '—';
        const daysAgo = Math.round((Date.now() - new Date(bid.created_at).getTime()) / 86400000);
        const score = bid.scores?.final ?? bid.scores?.bidindex_score ?? '—';
        return `
        <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:500;">${projectName}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${gcName}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;text-align:center;">${score}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;text-align:center;">${daysAgo}d ago</td>
        </tr>`;
    }).join('');

    const headline = nudgeCount === 0
        ? `Hey ${name} — what happened with ${bidCount === 1 ? 'this bid' : 'these bids'}?`
        : `Still waiting on ${bidCount === 1 ? 'one outcome' : `${bidCount} outcomes`}`;

    const intro = nudgeCount === 0
        ? `You analyzed ${bidCount === 1 ? 'a bid' : `${bidCount} bids`} a week or more ago and haven't logged the outcome${bidCount > 1 ? 's' : ''} yet. Takes 10 seconds — and it's what makes your BidIndex scores more accurate over time.`
        : `These bids are still showing no outcome. If you know what happened, logging it now keeps your win rate and BidIndex scores accurate.`;

    return `
<div style="background:#ffffff;font-family:'Helvetica Neue',sans-serif;max-width:580px;margin:0 auto;padding:40px 32px;color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F26522;">BIDINTELL</span>
    </div>

    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#0B0F14;">${headline}</h2>
    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 24px;">${intro}</p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:28px;">
        <thead>
            <tr style="background:#f9fafb;">
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Project</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb;">GC</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Score</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Analyzed</th>
            </tr>
        </thead>
        <tbody>${bidRows}</tbody>
    </table>

    <a href="${APP_URL}" style="display:inline-block;background:#F26522;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;margin-bottom:24px;">
        Log Outcomes Now →
    </a>

    <p style="font-size:13px;line-height:1.6;color:#9ca3af;margin:0 0 20px;">
        In the app, click any bid → <strong>Log Outcome</strong> → Won / Lost / No Response / Didn't Bid.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">

    <p style="font-size:12px;color:#9ca3af;margin:0 0 6px;">Not ready yet?</p>
    <p style="font-size:12px;color:#9ca3af;margin:0;">
        <a href="${snoozeUrl7}" style="color:#9ca3af;">Remind me in 7 days</a>
        &nbsp;·&nbsp;
        <a href="${snoozeUrl14}" style="color:#9ca3af;">Remind me in 14 days</a>
        &nbsp;·&nbsp;
        <a href="${skipUrl}" style="color:#9ca3af;">Skip — I'll handle this myself</a>
    </p>

    <p style="font-size:11px;color:#d1d5db;margin:16px 0 0;">
        — Ryan · <a href="https://bidintell.ai" style="color:#F26522;text-decoration:none;">bidintell.ai</a>
        &nbsp;·&nbsp;
        <a href="${unsubUrl}" style="color:#d1d5db;">Turn off these reminders</a>
    </p>
</div>`;
}

exports.handler = async () => {
    console.log('[outcome-reminder] Started:', new Date().toISOString());

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
        console.error('[outcome-reminder] Missing required env vars');
        return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();
    const stats = { sent: 0, skipped: 0, errors: 0 };

    // Load all users who have reminders enabled
    const { data: users, error: usersErr } = await supabase
        .from('user_settings')
        .select('user_id, user_email, company_name, outcome_reminder_days');

    if (usersErr) {
        console.error('[outcome-reminder] Failed to load users:', usersErr);
        return { statusCode: 500, body: JSON.stringify({ error: usersErr.message }) };
    }

    for (const user of users) {
        const { user_id, user_email, outcome_reminder_days } = user;

        if (!user_email) { stats.skipped++; continue; }
        if (user_email.endsWith('@bidintell.ai') || user_email.endsWith('@fsikc.com')) { stats.skipped++; continue; }

        // null = "Never" — user opted out
        if (outcome_reminder_days === null) { stats.skipped++; continue; }

        const reminderDays = outcome_reminder_days ?? DEFAULT_REMINDER_DAYS;
        const cutoff = new Date(now.getTime() - reminderDays * 86400000);

        // Fetch qualifying bids: pending, old enough, nudge count below max, not snoozed
        const { data: bids, error: bidsErr } = await supabase
            .from('projects')
            .select('id, extracted_data, gcs, scores, created_at, outcome_nudge_count, outcome_snooze_until, outcome_reminder_token')
            .eq('user_id', user_id)
            .eq('outcome', 'pending')
            .lt('created_at', cutoff.toISOString())
            .lt('outcome_nudge_count', MAX_NUDGES)
            .neq('extracted_data->>bc_source', 'buildingconnected');

        if (bidsErr) {
            console.warn(`[outcome-reminder] Error loading bids for ${user_email}:`, bidsErr.message);
            stats.errors++;
            continue;
        }

        if (!bids || bids.length === 0) { stats.skipped++; continue; }

        // Filter out snoozed bids
        const activeBids = bids.filter(b =>
            !b.outcome_snooze_until || new Date(b.outcome_snooze_until) <= now
        );

        if (activeBids.length === 0) { stats.skipped++; continue; }

        // Ensure each bid has a reminder token (generate if missing)
        const bidsWithTokens = await Promise.all(activeBids.map(async (bid) => {
            if (bid.outcome_reminder_token) return bid;
            const token = makeToken(bid.id, user_id);
            await supabase.from('projects').update({ outcome_reminder_token: token }).eq('id', bid.id);
            return { ...bid, outcome_reminder_token: token };
        }));

        // Use first bid's token for per-user snooze/unsubscribe links
        // (snooze.js looks up user from token and applies to all their bids)
        const primaryToken = bidsWithTokens[0].outcome_reminder_token;

        const name = (user.company_name || user_email.split('@')[0]).split(' ')[0];
        const nudgeCount = Math.min(...bidsWithTokens.map(b => b.outcome_nudge_count || 0));

        const snoozeUrl7 = `${SNOOZE_URL}?token=${primaryToken}&action=snooze7`;
        const snoozeUrl14 = `${SNOOZE_URL}?token=${primaryToken}&action=snooze14`;
        const skipUrl = `${SNOOZE_URL}?token=${primaryToken}&action=skip`;
        const unsubUrl = `${SNOOZE_URL}?token=${primaryToken}&action=unsubscribe`;

        const bidCount = bidsWithTokens.length;
        const subject = nudgeCount === 0
            ? (bidCount === 1 ? `What happened with that bid? — 1 outcome missing` : `What happened with those ${bidCount} bids? — outcomes missing`)
            : (bidCount === 1 ? `Still waiting on 1 outcome` : `Still waiting on ${bidCount} outcomes`);

        const html = buildReminderHtml({
            name,
            nudgeCount,
            bids: bidsWithTokens,
            snoozeUrl7,
            snoozeUrl14,
            skipUrl,
            unsubUrl
        });

        try {
            await sendEmail({ to: user_email, subject, html });

            // Increment nudge count and update last_nudge_sent_at for each bid
            const bidIds = bidsWithTokens.map(b => b.id);
            for (const bid of bidsWithTokens) {
                await supabase.from('projects').update({
                    outcome_nudge_count: (bid.outcome_nudge_count || 0) + 1,
                    last_nudge_sent_at: now.toISOString()
                }).eq('id', bid.id);
            }

            // Log to admin_events for attribution tracking
            await supabase.from('admin_events').insert({
                user_id,
                event_type: 'outcome_reminder_sent',
                event_data: {
                    email: user_email,
                    bid_count: bidCount,
                    bid_ids: bidIds,
                    nudge_sequence: nudgeCount + 1,
                    sent_at: now.toISOString()
                }
            });

            console.log(`[outcome-reminder] ✅ Sent to ${user_email} for ${bidCount} bid(s) (seq ${nudgeCount + 1})`);
            stats.sent++;
        } catch (err) {
            console.error(`[outcome-reminder] ❌ Failed for ${user_email}:`, err.message);
            stats.errors++;
        }
    }

    console.log(`[outcome-reminder] Done — sent: ${stats.sent}, skipped: ${stats.skipped}, errors: ${stats.errors}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, stats }) };
};
