// Weekly Health Check - Netlify Scheduled Function
// Runs every Monday at 9am UTC
// Checks key app systems and emails a digest to hello@bidintell.ai

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const ALERT_EMAIL = 'hello@bidintell.ai';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── helpers ────────────────────────────────────────────────────────────────

function pass(name, detail) { return { name, status: 'PASS', detail }; }
function fail(name, detail) { return { name, status: 'FAIL', detail }; }
function warn(name, detail) { return { name, status: 'WARN', detail }; }

async function sendEmail(subject, htmlBody) {
    const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: 'BidIntell System <hello@bidintell.ai>',
            To: ALERT_EMAIL,
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Postmark error ${res.status}: ${text}`);
    }
}

// ─── checks ─────────────────────────────────────────────────────────────────

async function checkSupabaseConnectivity() {
    const { count, error } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true });
    if (error) return fail('Supabase connectivity', error.message);
    return pass('Supabase connectivity', `user_settings reachable (${count} rows)`);
}

async function checkUserRevenueRLS() {
    // Service key should always read user_revenue — if it can't, something is broken
    const { data, error } = await supabase
        .from('user_revenue')
        .select('user_id, status, mrr')
        .limit(1);
    if (error) return fail('user_revenue RLS', `Service key blocked: ${error.message}`);
    return pass('user_revenue RLS', 'Service key can read user_revenue');
}

async function checkProjectsTable() {
    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
    if (error) return fail('Projects table', error.message);
    return pass('Projects table', `${count} total projects`);
}

async function checkBCProjectDrift() {
    // BC projects should never accumulate as 'pending' older than 90 days
    // (they'd trigger auto-ghost next load)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('outcome', 'pending')
        .eq('extracted_data->>bc_source', 'buildingconnected')
        .lt('created_at', cutoff.toISOString());
    if (error) return warn('BC project drift', `Could not check: ${error.message}`);
    if (count > 0) return warn('BC project drift', `${count} BC projects pending > 90 days — will auto-ghost on next user load`);
    return pass('BC project drift', 'No stale BC projects');
}

async function checkAutoGhostConstraint() {
    // Verify the check_outcome_data_structure constraint is working correctly
    // by checking for any ghost projects missing days_since_submission
    const { data, error } = await supabase
        .from('projects')
        .select('id, outcome_data')
        .eq('outcome', 'ghost')
        .limit(5);
    if (error) return warn('Auto-ghost constraint', `Could not check: ${error.message}`);
    const broken = (data || []).filter(p => !p.outcome_data?.days_since_submission);
    if (broken.length > 0) return warn('Auto-ghost constraint', `${broken.length} ghost projects missing days_since_submission`);
    return pass('Auto-ghost constraint', 'Ghost projects have valid outcome_data');
}

async function checkOrphanedUsers() {
    // Users with no projects after 14+ days may be stuck in onboarding
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const { data: users, error: usersError } = await supabase
        .from('user_settings')
        .select('user_id, created_at')
        .lt('created_at', cutoff.toISOString());
    if (usersError) return warn('Orphaned users', `Could not check: ${usersError.message}`);

    let orphaned = 0;
    for (const user of (users || [])) {
        const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id);
        if (count === 0) orphaned++;
    }
    if (orphaned > 2) return warn('Orphaned users', `${orphaned} users with 0 bids after 14+ days — may be stuck`);
    return pass('Orphaned users', `${orphaned} users with 0 bids after 14+ days`);
}

async function checkStripeWebhookHealth() {
    // Paid users (active in user_settings) should have a user_revenue row
    const { data: paidSettings, error: e1 } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('subscription_status', 'active')
        .neq('subscription_tier', 'beta');
    if (e1) return warn('Stripe webhook health', `Could not check: ${e1.message}`);

    const { data: revenueRows, error: e2 } = await supabase
        .from('user_revenue')
        .select('user_id')
        .eq('status', 'active');
    if (e2) return warn('Stripe webhook health', `Could not check revenue: ${e2.message}`);

    const revenueIds = new Set((revenueRows || []).map(r => r.user_id));
    const missing = (paidSettings || []).filter(u => !revenueIds.has(u.user_id));
    if (missing.length > 0) return fail('Stripe webhook health', `${missing.length} active users missing user_revenue row — webhook may have missed events`);
    return pass('Stripe webhook health', `All ${(paidSettings || []).length} paid users have revenue rows`);
}

async function checkWeeklyActivity() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: newBids } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .neq('extracted_data->>bc_source', 'buildingconnected')
        .gte('created_at', weekAgo.toISOString());

    const { count: newUsers } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

    const { count: outcomes } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .neq('outcome', 'pending')
        .gte('updated_at', weekAgo.toISOString());

    return pass('Weekly activity', `${newBids || 0} bids analyzed · ${outcomes || 0} outcomes recorded · ${newUsers || 0} new signups`);
}

// ─── handler ─────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    console.log('🔍 Weekly health check started:', new Date().toISOString());

    const results = await Promise.allSettled([
        checkSupabaseConnectivity(),
        checkUserRevenueRLS(),
        checkProjectsTable(),
        checkBCProjectDrift(),
        checkAutoGhostConstraint(),
        checkOrphanedUsers(),
        checkStripeWebhookHealth(),
        checkWeeklyActivity(),
    ]);

    const checks = results.map(r =>
        r.status === 'fulfilled' ? r.value : fail('Unknown', r.reason?.message || 'Check threw an exception')
    );

    const failures = checks.filter(c => c.status === 'FAIL');
    const warnings = checks.filter(c => c.status === 'WARN');
    const passes   = checks.filter(c => c.status === 'PASS');

    const overallStatus = failures.length > 0 ? '🔴 ACTION REQUIRED' : warnings.length > 0 ? '🟡 WARNINGS' : '🟢 ALL CLEAR';
    const subject = `BidIntell Weekly Health Check — ${overallStatus}`;

    const rows = checks.map(c => {
        const icon = c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️';
        const color = c.status === 'PASS' ? '#16a34a' : c.status === 'FAIL' ? '#dc2626' : '#d97706';
        return `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b;">${icon} <strong>${c.name}</strong></td>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b; color:${color}; font-weight:600;">${c.status}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b; color:#94a3b8;">${c.detail}</td>
        </tr>`;
    }).join('');

    const html = `
    <div style="background:#0B0F14; color:#F8FAFC; font-family:sans-serif; padding:32px; max-width:680px; margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL SYSTEM</span>
        <h1 style="margin:8px 0 4px; font-size:22px;">Weekly Health Check</h1>
        <p style="margin:0; color:#94a3b8; font-size:14px;">${new Date().toUTCString()}</p>
      </div>

      <div style="background:#1e293b; border-radius:8px; padding:16px 20px; margin-bottom:24px; font-size:18px; font-weight:700;">
        ${overallStatus} &nbsp;·&nbsp; <span style="font-weight:400; font-size:14px; color:#94a3b8;">${passes.length} passed · ${warnings.length} warnings · ${failures.length} failed</span>
      </div>

      <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Check</th>
            <th style="padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Status</th>
            <th style="padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Detail</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="margin-top:24px; font-size:12px; color:#475569;">
        Sent automatically every Monday · <a href="https://bidintell.ai/app" style="color:#F26522;">Open App</a>
      </p>
    </div>`;

    try {
        await sendEmail(subject, html);
        console.log('✅ Health check email sent');
    } catch (emailErr) {
        console.error('❌ Failed to send health check email:', emailErr.message);
    }

    console.log('📊 Health check results:', checks);

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, overallStatus, checks })
    };
};
