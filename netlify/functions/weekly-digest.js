// weekly-digest.js
// Netlify scheduled function — runs every Monday at 1pm UTC (8am CT)
// Sends each user a personal performance digest for the past 7 days.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const FROM_EMAIL = 'BidIntell <hello@bidintell.ai>';
const BCC_EMAIL = 'ryan@bidintell.ai';
const APP_URL = 'https://bidintell.ai/app';

async function sendEmail({ to, subject, html }) {
    const res = await fetch('https://api.postmarkapp.com/email', {
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
            HtmlBody: html,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Postmark ${res.status}: ${body}`);
    }
}

function statBlock(label, value, sub, accentColor) {
    const color = accentColor || '#F26522';
    return `
    <td style="width:25%; padding:0 8px; text-align:center; vertical-align:top;">
        <div style="background:#1e293b; border-radius:8px; padding:16px 12px;">
            <div style="font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#64748b; margin-bottom:6px;">${label}</div>
            <div style="font-size:28px; font-weight:700; color:${color}; line-height:1;">${value}</div>
            ${sub ? `<div style="font-size:11px; color:#64748b; margin-top:4px;">${sub}</div>` : ''}
        </div>
    </td>`;
}

function buildDigestHtml({ companyName, weekBids, weekOutcomes, allTimeWinRate, allTimeBids, avgScore, pendingCount }) {
    const greeting = companyName ? `Hi ${companyName},` : 'Hi there,';
    const winRateDisplay = allTimeWinRate != null ? `${allTimeWinRate}%` : '—';
    const avgScoreDisplay = avgScore != null ? String(avgScore) : '—';
    const winRateSub = allTimeWinRate != null ? 'competitive win rate' : 'log outcomes to unlock';
    const avgScoreSub = avgScore != null ? (avgScore >= 80 ? 'GO range' : avgScore >= 60 ? 'REVIEW range' : 'PASS range') : 'no scored bids yet';

    const pendingNote = pendingCount > 0
        ? `<p style="margin:0 0 12px; color:#94a3b8; font-size:14px;">
            You have <strong style="color:#F26522;">${pendingCount} bid${pendingCount !== 1 ? 's' : ''}</strong> still pending an outcome.
            <a href="${APP_URL}" style="color:#F26522;">Log what happened</a> — it sharpens your scores over time.
           </p>`
        : '';

    const activityNote = weekBids === 0
        ? `<p style="margin:0; color:#94a3b8; font-size:14px;">No bids were analyzed this week. Upload a drawing set or spec book to keep your pipeline moving.</p>`
        : `<p style="margin:0; color:#94a3b8; font-size:14px;">You analyzed <strong style="color:#F8FAFC;">${weekBids} bid${weekBids !== 1 ? 's' : ''}</strong> and logged <strong style="color:#F8FAFC;">${weekOutcomes} outcome${weekOutcomes !== 1 ? 's' : ''}</strong> this week. ${allTimeBids > 0 ? `That brings your total to ${allTimeBids} bids in BidIntell.` : ''}</p>`;

    return `
    <div style="background:#0B0F14; color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:32px 24px; max-width:600px; margin:0 auto;">

        <div style="margin-bottom:28px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522; margin-bottom:8px;">BIDINTELL</div>
            <h1 style="margin:0 0 4px; font-size:22px; font-weight:700;">Your Weekly Snapshot</h1>
            <p style="margin:0; color:#64748b; font-size:13px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <p style="margin:0 0 24px; color:#94a3b8; font-size:15px;">${greeting}</p>

        <!-- Stats row -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;" cellpadding="0" cellspacing="0">
            <tr>
                ${statBlock('This Week', weekBids, `bid${weekBids !== 1 ? 's' : ''} analyzed`)}
                ${statBlock('Outcomes', weekOutcomes, `logged this week`, '#22c55e')}
                ${statBlock('Win Rate', winRateDisplay, winRateSub, allTimeWinRate != null ? '#F26522' : '#64748b')}
                ${statBlock('Avg Score', avgScoreDisplay, avgScoreSub, avgScore != null ? (avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#f59e0b' : '#94a3b8') : '#64748b')}
            </tr>
        </table>

        <!-- Activity note -->
        <div style="background:#1e293b; border-radius:8px; padding:16px 20px; margin-bottom:20px;">
            ${activityNote}
            ${pendingNote ? '<div style="margin-top:10px;">' + pendingNote + '</div>' : ''}
        </div>

        <!-- CTA -->
        <div style="text-align:center; margin-bottom:28px;">
            <a href="${APP_URL}" style="display:inline-block; background:#F26522; color:#fff; font-weight:700; font-size:14px; padding:12px 28px; border-radius:6px; text-decoration:none;">Open BidIntell →</a>
        </div>

        <p style="margin:0; font-size:11px; color:#334155; text-align:center;">
            BidIntell · bidintell.ai · Sent every Monday morning
        </p>
    </div>`;
}

exports.handler = async () => {
    console.log('[weekly-digest] Started:', new Date().toISOString());

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !POSTMARK_API_KEY) {
        console.error('[weekly-digest] Missing env vars');
        return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: users, error: usersErr } = await supabase
        .from('user_settings')
        .select('user_id, user_email, company_name');

    if (usersErr) {
        console.error('[weekly-digest] Failed to load users:', usersErr.message);
        return { statusCode: 500, body: JSON.stringify({ error: usersErr.message }) };
    }

    const stats = { sent: 0, skipped: 0, errors: 0 };

    for (const user of users) {
        const { user_id, user_email, company_name } = user;

        if (!user_email) {
            stats.skipped++;
            continue;
        }

        // Skip internal accounts from user-facing digest
        if (user_email.endsWith('@bidintell.ai') || user_email.endsWith('@fsikc.com')) {
            stats.skipped++;
            continue;
        }

        try {
            // Bids analyzed this week
            const { count: weekBids } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user_id)
                .gte('created_at', weekAgo.toISOString());

            // Outcomes logged this week (updated from pending to something else)
            const { count: weekOutcomes } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user_id)
                .neq('outcome', 'pending')
                .gte('updated_at', weekAgo.toISOString());

            // All-time stats
            const { data: allProjects } = await supabase
                .from('projects')
                .select('outcome, scores')
                .eq('user_id', user_id);

            const all = allProjects || [];
            const allTimeBids = all.length;
            const won = all.filter(p => p.outcome === 'won').length;
            const lost = all.filter(p => p.outcome === 'lost').length;
            const competitive = won + lost;
            const allTimeWinRate = competitive > 0 ? Math.round(won / competitive * 100) : null;

            const scoredBids = all.map(p => p.scores?.final ?? p.scores?.bidindex_score).filter(s => s != null && s > 0);
            const avgScore = scoredBids.length > 0 ? Math.round(scoredBids.reduce((a, b) => a + b, 0) / scoredBids.length) : null;

            // Pending bids older than 14 days
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const { count: pendingCount } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user_id)
                .eq('outcome', 'pending')
                .lt('created_at', twoWeeksAgo.toISOString());

            // Skip users with zero activity ever (no bids at all)
            if (allTimeBids === 0) {
                stats.skipped++;
                continue;
            }

            const html = buildDigestHtml({
                companyName: company_name || null,
                weekBids: weekBids || 0,
                weekOutcomes: weekOutcomes || 0,
                allTimeWinRate,
                allTimeBids,
                avgScore,
                pendingCount: pendingCount || 0
            });

            await sendEmail({
                to: user_email,
                subject: `Your BidIntell week — ${weekBids || 0} bid${weekBids !== 1 ? 's' : ''} analyzed`,
                html
            });

            console.log(`[weekly-digest] Sent to ${user_email} (${weekBids} bids this week)`);
            stats.sent++;
        } catch (err) {
            console.error(`[weekly-digest] Error for ${user_email}:`, err.message);
            stats.errors++;
        }
    }

    console.log(`[weekly-digest] Done — sent: ${stats.sent}, skipped: ${stats.skipped}, errors: ${stats.errors}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, stats }) };
};
