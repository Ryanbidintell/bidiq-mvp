// Daily Ops Digest - Netlify Scheduled Function
// Runs every morning at 8am UTC
// Sends Ryan a personal daily briefing: signups, bids, outcomes, health flags

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const DIGEST_RECIPIENT = 'ryan@bidintell.ai';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail({ subject, htmlBody }) {
    const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: 'BidIntell Daily <hello@bidintell.ai>',
            To: DIGEST_RECIPIENT,
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) throw new Error(`Postmark error ${res.status}: ${await res.text()}`);
}

function stat(label, value, sub = '') {
    return `
    <td style="padding:16px 20px; text-align:center; border-right:1px solid #1e293b;">
        <div style="font-size:28px; font-weight:700; color:#F8FAFC; font-family:monospace;">${value}</div>
        <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">${label}</div>
        ${sub ? `<div style="font-size:11px; color:#475569; margin-top:2px;">${sub}</div>` : ''}
    </td>`;
}

exports.handler = async () => {
    console.log('📰 Daily digest started:', new Date().toISOString());

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const ydStart = new Date(yesterday.toISOString().split('T')[0] + 'T00:00:00Z');
    const ydEnd   = new Date(yesterday.toISOString().split('T')[0] + 'T23:59:59Z');
    const week    = new Date(now); week.setDate(week.getDate() - 7);

    // ── yesterday's numbers ───────────────────────────────────────────────────
    const { count: newSignups } = await supabase
        .from('user_settings').select('*', { count: 'exact', head: true })
        .gte('created_at', ydStart.toISOString()).lte('created_at', ydEnd.toISOString());

    const { count: bidsYesterday } = await supabase
        .from('projects').select('*', { count: 'exact', head: true })
        .neq('extracted_data->>bc_source', 'buildingconnected')
        .gte('created_at', ydStart.toISOString()).lte('created_at', ydEnd.toISOString());

    const { count: outcomesYesterday } = await supabase
        .from('projects').select('*', { count: 'exact', head: true })
        .neq('outcome', 'pending')
        .gte('updated_at', ydStart.toISOString()).lte('updated_at', ydEnd.toISOString());

    // ── totals ────────────────────────────────────────────────────────────────
    const { count: totalUsers } = await supabase
        .from('user_settings').select('*', { count: 'exact', head: true });

    const { count: totalBids } = await supabase
        .from('projects').select('*', { count: 'exact', head: true })
        .neq('extracted_data->>bc_source', 'buildingconnected');

    const { count: paidUsers } = await supabase
        .from('user_settings').select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active').neq('subscription_tier', 'beta');

    // ── MRR ───────────────────────────────────────────────────────────────────
    const { data: revenueRows } = await supabase
        .from('user_revenue').select('mrr').eq('status', 'active');
    const mrr = ((revenueRows || []).reduce((s, r) => s + (r.mrr || 0), 0) / 100).toFixed(0);

    // ── 7-day activity ────────────────────────────────────────────────────────
    const { count: bids7d } = await supabase
        .from('projects').select('*', { count: 'exact', head: true })
        .neq('extracted_data->>bc_source', 'buildingconnected')
        .gte('created_at', week.toISOString());

    const { count: signups7d } = await supabase
        .from('user_settings').select('*', { count: 'exact', head: true })
        .gte('created_at', week.toISOString());

    // ── users with 0 bids (stuck in onboarding) ───────────────────────────────
    const { data: allUsers } = await supabase
        .from('user_settings').select('user_id, created_at');
    let stuckUsers = 0;
    const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14);
    for (const u of (allUsers || [])) {
        if (new Date(u.created_at) > cutoff14) continue;
        const { count } = await supabase.from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.user_id)
            .neq('extracted_data->>bc_source', 'buildingconnected');
        if (count === 0) stuckUsers++;
    }

    // ── days until paid launch ────────────────────────────────────────────────
    const deadline = new Date('2026-04-01T00:00:00Z');
    const daysLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
    const deadlineBadge = daysLeft > 0
        ? `<span style="background:#F26522; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:1px;">LAUNCH IN ${daysLeft}D</span>`
        : `<span style="background:#16a34a; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:1px;">LIVE</span>`;

    const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const subject = `BidIntell ${dateStr} — ${newSignups || 0} signups · ${bidsYesterday || 0} bids · $${mrr} MRR`;

    const html = `
    <div style="background:#0B0F14; color:#F8FAFC; font-family:'Helvetica Neue',sans-serif; max-width:620px; margin:0 auto; padding:32px;">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
          <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL DAILY</span>
          <h1 style="margin:6px 0 0; font-size:18px; color:#F8FAFC;">${dateStr}</h1>
        </div>
        <div>${deadlineBadge}</div>
      </div>

      <!-- Yesterday headline stats -->
      <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; margin-bottom:16px; overflow:hidden;">
        <tr>
          <td colspan="3" style="padding:10px 20px; background:#0f172a; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">
            Yesterday
          </td>
        </tr>
        <tr>
          ${stat('New Signups', newSignups || 0)}
          ${stat('Bids Analyzed', bidsYesterday || 0)}
          ${stat('Outcomes Logged', outcomesYesterday || 0, '')}
        </tr>
      </table>

      <!-- Totals -->
      <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; margin-bottom:16px; overflow:hidden;">
        <tr>
          <td colspan="4" style="padding:10px 20px; background:#0f172a; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">
            All-Time
          </td>
        </tr>
        <tr>
          ${stat('Total Users', totalUsers || 0)}
          ${stat('Paid Users', paidUsers || 0)}
          ${stat('Total Bids', totalBids || 0)}
          ${stat('MRR', '$' + mrr, '')}
        </tr>
      </table>

      <!-- 7-day trend -->
      <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; margin-bottom:16px; overflow:hidden;">
        <tr>
          <td colspan="2" style="padding:10px 20px; background:#0f172a; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">
            Last 7 Days
          </td>
        </tr>
        <tr>
          ${stat('New Signups', signups7d || 0)}
          ${stat('Bids Analyzed', bids7d || 0)}
        </tr>
      </table>

      <!-- Health flags -->
      ${stuckUsers > 0 ? `
      <div style="background:#1e293b; border-left:3px solid #d97706; border-radius:4px; padding:14px 18px; margin-bottom:16px;">
        <span style="font-size:12px; font-weight:700; color:#d97706; text-transform:uppercase; letter-spacing:1px;">⚠ Attention</span>
        <p style="margin:6px 0 0; font-size:14px; color:#94a3b8;">${stuckUsers} user${stuckUsers > 1 ? 's' : ''} signed up 14+ days ago with 0 bids analyzed. Consider reaching out directly.</p>
      </div>` : `
      <div style="background:#1e293b; border-left:3px solid #16a34a; border-radius:4px; padding:14px 18px; margin-bottom:16px;">
        <span style="font-size:12px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:1px;">✓ All Clear</span>
        <p style="margin:6px 0 0; font-size:14px; color:#94a3b8;">No users stuck in onboarding.</p>
      </div>`}

      <div style="margin-top:20px; padding-top:16px; border-top:1px solid #1e293b;">
        <a href="https://bidintell.ai/admin" style="color:#F26522; font-size:13px; text-decoration:none; margin-right:16px;">Open Admin →</a>
        <a href="https://bidintell.ai/app" style="color:#64748b; font-size:13px; text-decoration:none;">Open App</a>
      </div>
    </div>`;

    try {
        await sendEmail({ subject, htmlBody: html });
        console.log('✅ Daily digest sent');
    } catch (err) {
        console.error('❌ Failed to send digest:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, stats: { newSignups, bidsYesterday, outcomesYesterday, totalUsers, paidUsers, mrr, stuckUsers } })
    };
};
