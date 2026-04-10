// weekly-outcome-nudge.js
// Netlify scheduled function — runs every Sunday at 11pm UTC (6pm CT / CDT)
// Sends plain-text re-engagement emails to users who have bids with no outcome logged.
//
// Bi-weekly gate: only executes on even ISO week numbers. Netlify cron doesn't
// natively support "every 2 weeks", so the function fires every Sunday but skips
// odd-numbered weeks at the top of the handler.
//
// Schema dependencies (run migrations/009_outcome_nudge.sql first):
//   projects.outcome_nudge_count  integer NOT NULL DEFAULT 0
//   projects.last_nudge_sent_at   timestamptz
//   user_settings.outcome_reminder_days integer DEFAULT 21 (null = Never)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

const APP_URL = 'https://bidintell.ai/app';
const FROM_EMAIL = 'hello@bidintell.ai';
const BCC_EMAIL = 'ryan@bidintell.ai';
const MAX_NUDGES = 3;
const DEFAULT_REMINDER_DAYS = 21;
const RECENT_OUTCOME_DAYS = 14;

// ISO 8601 week number (week starts Monday)
function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function sendPlainTextEmail({ to, subject, textBody }) {
    const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: FROM_EMAIL,
            To: to,
            Bcc: BCC_EMAIL,
            Subject: subject,
            TextBody: textBody,
            MessageStream: 'outbound'
        })
    });
    if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Postmark ${response.status}: ${errBody}`);
    }
}

exports.handler = async (event, context) => {
    const now = new Date();
    console.log(`[outcome-nudge] Started at ${now.toISOString()}`);

    // ── Bi-weekly gate ───────────────────────────────────────────────────────
    const weekNum = isoWeekNumber(now);
    if (weekNum % 2 !== 0) {
        console.log(`[outcome-nudge] Week ${weekNum} is odd — skipping.`);
        return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'odd_week', week: weekNum }) };
    }
    console.log(`[outcome-nudge] Week ${weekNum} (even) — proceeding.`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !POSTMARK_API_KEY) {
        console.error('[outcome-nudge] Missing required env vars');
        return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const stats = { sent: 0, skipped: 0, errors: 0, bidsUpdated: 0 };

    // ── Load all users ───────────────────────────────────────────────────────
    const { data: users, error: usersErr } = await supabase
        .from('user_settings')
        .select('user_id, user_email, company_name, outcome_reminder_days');

    if (usersErr) {
        console.error('[outcome-nudge] Failed to load users:', usersErr);
        return { statusCode: 500, body: JSON.stringify({ error: usersErr.message }) };
    }

    console.log(`[outcome-nudge] Checking ${users.length} user(s)`);

    for (const user of users) {
        const { user_id, user_email, outcome_reminder_days } = user;

        if (!user_email) {
            console.log(`[outcome-nudge] Skip ${user_id} — no email`);
            stats.skipped++;
            continue;
        }

        // null means "Never" — user opted out
        if (outcome_reminder_days === null) {
            console.log(`[outcome-nudge] Skip ${user_email} — opted out (Never)`);
            stats.skipped++;
            continue;
        }

        const reminderDays = outcome_reminder_days ?? DEFAULT_REMINDER_DAYS;
        const bidAgeCutoff = new Date(now.getTime() - reminderDays * 24 * 60 * 60 * 1000);
        const recentActivityCutoff = new Date(now.getTime() - RECENT_OUTCOME_DAYS * 24 * 60 * 60 * 1000);

        // ── Skip users who logged an outcome recently (already engaged) ──────
        const { data: recentOutcomes, error: recentErr } = await supabase
            .from('projects')
            .select('id')
            .eq('user_id', user_id)
            .not('outcome', 'eq', 'pending')
            .gte('updated_at', recentActivityCutoff.toISOString())
            .limit(1);

        if (recentErr) {
            console.warn(`[outcome-nudge] Error checking recent outcomes for ${user_email}:`, recentErr.message);
            stats.errors++;
            continue;
        }

        if (recentOutcomes && recentOutcomes.length > 0) {
            console.log(`[outcome-nudge] Skip ${user_email} — outcome logged in last ${RECENT_OUTCOME_DAYS} days`);
            stats.skipped++;
            continue;
        }

        // ── Load qualifying bids ─────────────────────────────────────────────
        // pending + older than reminderDays + nudge count below MAX
        const { data: bids, error: bidsErr } = await supabase
            .from('projects')
            .select('id, extracted_data, gcs, scores, outcome_nudge_count')
            .eq('user_id', user_id)
            .eq('outcome', 'pending')
            .lt('created_at', bidAgeCutoff.toISOString())
            .lt('outcome_nudge_count', MAX_NUDGES);

        if (bidsErr) {
            console.warn(`[outcome-nudge] Error loading bids for ${user_email}:`, bidsErr.message);
            stats.errors++;
            continue;
        }

        if (!bids || bids.length === 0) {
            console.log(`[outcome-nudge] Skip ${user_email} — no qualifying bids`);
            stats.skipped++;
            continue;
        }

        console.log(`[outcome-nudge] ${user_email} — ${bids.length} qualifying bid(s)`);

        // ── Build email body ─────────────────────────────────────────────────
        const bidLines = bids.map(bid => {
            const name = bid.extracted_data?.project_name || 'Unnamed bid';
            const gcName = bid.gcs?.[0]?.name || null;
            const score = bid.scores?.final != null ? ` (BidIndex: ${bid.scores.final})` : '';
            return gcName ? `  • ${name} — ${gcName}${score}` : `  • ${name}${score}`;
        }).join('\n');

        const textBody =
`A few bids from a couple weeks ago are still open in your account:

${bidLines}

If you know how they turned out, logging the outcome takes about 30 seconds — and it's what makes your BidIndex scores more accurate over time.

Log outcomes → ${APP_URL}

— Ryan
BidIntell`;

        // ── Send ─────────────────────────────────────────────────────────────
        try {
            await sendPlainTextEmail({
                to: user_email,
                subject: 'A few bids from a couple weeks ago are still open',
                textBody
            });
            console.log(`[outcome-nudge] Sent to ${user_email}`);
            stats.sent++;

            // ── Increment nudge counters per bid ─────────────────────────────
            for (const bid of bids) {
                const newCount = (bid.outcome_nudge_count || 0) + 1;
                const { error: incErr } = await supabase
                    .from('projects')
                    .update({ outcome_nudge_count: newCount, last_nudge_sent_at: now.toISOString() })
                    .eq('id', bid.id);

                if (incErr) {
                    console.warn(`[outcome-nudge] Failed to increment count for bid ${bid.id}:`, incErr.message);
                } else {
                    stats.bidsUpdated++;
                }
            }
        } catch (sendErr) {
            console.error(`[outcome-nudge] Failed to send to ${user_email}:`, sendErr.message);
            stats.errors++;
        }
    }

    console.log(`[outcome-nudge] Done — sent: ${stats.sent}, skipped: ${stats.skipped}, errors: ${stats.errors}, bids updated: ${stats.bidsUpdated}`);

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, week: weekNum, stats })
    };
};
