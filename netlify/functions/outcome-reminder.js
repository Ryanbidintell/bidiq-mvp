// Outcome Reminder - Netlify Scheduled Function
// Runs daily at 12pm UTC
// Finds bids analyzed 30+ days ago with outcome still 'pending'
// Sends one reminder per user listing their open bids by name
// Never sends more than one reminder per project (tracked in admin_events)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail({ to, subject, htmlBody }) {
    const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: 'Ryan at BidIntell <hello@bidintell.ai>',
            To: to,
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) throw new Error(`Postmark error ${res.status}: ${await res.text()}`);
}

async function alreadyReminded(projectId) {
    const { data } = await supabase
        .from('admin_events')
        .select('id')
        .eq('event_type', 'outcome_reminder_sent')
        .eq('event_data->>project_id', projectId)
        .limit(1);
    return data && data.length > 0;
}

async function logReminders(userId, projectIds, email) {
    const inserts = projectIds.map(id => ({
        user_id: userId,
        event_type: 'outcome_reminder_sent',
        event_data: { project_id: id, email, sent_at: new Date().toISOString() }
    }));
    await supabase.from('admin_events').insert(inserts);
}

exports.handler = async () => {
    console.log('🔔 Outcome reminder started:', new Date().toISOString());

    // Find all pending projects older than 30 days (exclude BC imports)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: staleBids, error } = await supabase
        .from('projects')
        .select('id, user_id, extracted_data, created_at, scores')
        .eq('outcome', 'pending')
        .lt('created_at', cutoff.toISOString())
        .neq('extracted_data->>bc_source', 'buildingconnected')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching stale bids:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`Found ${(staleBids || []).length} pending bids older than 30 days`);

    // Group by user, filter out already-reminded projects
    const byUser = {};
    for (const bid of (staleBids || [])) {
        if (await alreadyReminded(bid.id)) continue;
        if (!byUser[bid.user_id]) byUser[bid.user_id] = [];
        byUser[bid.user_id].push(bid);
    }

    const userIds = Object.keys(byUser);
    console.log(`${userIds.length} users have unreminded stale bids`);

    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
        const bids = byUser[userId];

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const email = authUser?.user?.email;
        if (!email) { skipped += bids.length; continue; }

        const firstName = email.split('@')[0].split('.')[0];
        const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        // Build the bid rows for the email
        const bidRows = bids.map(bid => {
            const projectName = bid.extracted_data?.project_name || 'Unnamed project';
            const gcName = bid.extracted_data?.gc_name || '—';
            const daysAgo = Math.round((Date.now() - new Date(bid.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const score = bid.scores?.final ?? '—';
            return `
            <tr>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:500;">${projectName}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">${gcName}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280; text-align:center;">${score}</td>
                <td style="padding:12px 14px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280; text-align:center;">${daysAgo}d ago</td>
            </tr>`;
        }).join('');

        const bidCount = bids.length;
        const subject = bidCount === 1
            ? `What happened with that bid? — 1 outcome missing`
            : `What happened with those ${bidCount} bids? — outcomes missing`;

        const html = `
        <div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:580px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
            <div style="margin-bottom:28px;">
                <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
            </div>

            <h2 style="font-size:22px; font-weight:700; margin:0 0 12px; color:#0B0F14;">
                Hey ${name} — what happened with ${bidCount === 1 ? 'this bid' : 'these bids'}?
            </h2>
            <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
                You analyzed ${bidCount === 1 ? 'a bid' : `${bidCount} bids`} more than 30 days ago but haven't logged the outcome${bidCount > 1 ? 's' : ''} yet.
                Every outcome you record makes your BidIndex scores more accurate — took you the work to bid it, takes 10 seconds to log what happened.
            </p>

            <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; margin-bottom:28px;">
                <thead>
                    <tr style="background:#f9fafb;">
                        <th style="padding:10px 14px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Project</th>
                        <th style="padding:10px 14px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; border-bottom:1px solid #e5e7eb;">GC</th>
                        <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Score</th>
                        <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Analyzed</th>
                    </tr>
                </thead>
                <tbody>${bidRows}</tbody>
            </table>

            <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:24px;">
                Log Outcomes Now →
            </a>

            <p style="font-size:13px; line-height:1.6; color:#9ca3af; margin:0 0 8px;">
                In the app, click any bid → <strong>Log Outcome</strong> → Won / Lost / No Response / Didn't Bid. Takes 10 seconds.
            </p>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
            <p style="font-size:13px; color:#9ca3af; margin:0;">
                — Ryan<br>
                <span style="color:#d1d5db;">Founder, BidIntell · <a href="https://bidintell.ai" style="color:#F26522; text-decoration:none;">bidintell.ai</a></span>
            </p>
        </div>`;

        try {
            await sendEmail({ to: email, subject, htmlBody: html });
            await logReminders(userId, bids.map(b => b.id), email);
            sent++;
            console.log(`✅ Outcome reminder sent to ${email} for ${bidCount} bid(s)`);
        } catch (err) {
            console.error(`❌ Failed to send to ${email}:`, err.message);
            skipped++;
        }
    }

    console.log(`✅ Outcome reminder done. Users emailed: ${sent}, Skipped: ${skipped}`);
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, usersSent: sent, usersSkipped: skipped })
    };
};
