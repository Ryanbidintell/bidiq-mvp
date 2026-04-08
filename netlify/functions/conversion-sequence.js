// Welcome Sequence - Netlify Scheduled Function
// Runs daily at 11am UTC
// Day 2: 3 settings tips
// Day 4: Log your first outcome nudge
// Day 7: Trial ends today reminder

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
            Bcc: 'ryan@bidintell.ai',
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: 'outbound'
        })
    });
    if (!res.ok) throw new Error(`Postmark error ${res.status}: ${await res.text()}`);
}

async function alreadySent(userId, eventType) {
    const { data } = await supabase
        .from('admin_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', eventType)
        .limit(1);
    return data && data.length > 0;
}

async function logEvent(userId, eventType, data = {}) {
    await supabase.from('admin_events').insert({
        user_id: userId,
        event_type: eventType,
        event_data: data
    });
}

// ── Welcome sequence (post-signup) ───────────────────────────────────────────

function welcomeStep2Html(name) {
    return `
<div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
    </div>
    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">3 settings that make BidIntell more accurate, ${name}.</h2>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">If you haven't done these yet, they make a real difference in your scores:</p>
    <div style="margin-bottom:20px;">
        <p style="font-size:15px; font-weight:700; margin:0 0 6px; color:#0B0F14;">1. Set your CSI spec sections <span style="font-weight:400; color:#6b7280;">(Settings → Your Trades)</span></p>
        <p style="font-size:14px; line-height:1.6; color:#374151; margin:0;">Instead of division-level guessing, BidIntell finds the exact sections you bid — flooring, ceilings, framing, whatever your trade is.</p>
    </div>
    <div style="margin-bottom:20px;">
        <p style="font-size:15px; font-weight:700; margin:0 0 6px; color:#0B0F14;">2. Add and rate your clients <span style="font-weight:400; color:#6b7280;">(Clients tab)</span></p>
        <p style="font-size:14px; line-height:1.6; color:#374151; margin:0;">Your win rate with each client factors directly into your score. The more history you track, the smarter the scoring gets.</p>
    </div>
    <div style="margin-bottom:24px;">
        <p style="font-size:15px; font-weight:700; margin:0 0 6px; color:#0B0F14;">3. Upload specs AND drawings together</p>
        <p style="font-size:14px; line-height:1.6; color:#374151; margin:0;">Got both? Drop them in at the same time. BidIntell combines them for a more complete picture of the scope.</p>
    </div>
    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
        Open BidIntell →
    </a>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
    <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell</span></p>
</div>`;
}

function welcomeStep3Html(name) {
    return `
<div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
    </div>
    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">Your free trial ends today, ${name}.</h2>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
        Your card will be charged today for your BidIntell subscription. Nothing you need to do if you want to keep going.
    </p>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
        If BidIntell hasn't clicked yet — reply to this email and tell me what's not working. I read every response and I'd rather fix it than lose you.
    </p>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
        To cancel or change your plan: Settings → Subscription &amp; Billing → Manage Billing.
    </p>
    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
        Open BidIntell →
    </a>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
    <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell · Reply any time</span></p>
</div>`;
}

function welcomeStep4Html(name) {
    return `
<div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
    </div>
    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">The most valuable thing you can do in BidIntell right now, ${name}.</h2>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
        Log an outcome on any bid — even an old one. Won, lost, ghosted, it doesn't matter.
    </p>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
        Here's why it matters: every outcome you record teaches BidIntell your actual win patterns. The score gets more accurate to <em>your</em> business with each one logged. It takes about 30 seconds.
    </p>
    <div style="background:#f9fafb; border-left:3px solid #F26522; padding:16px 20px; margin:0 0 24px; border-radius:4px;">
        <p style="margin:0 0 6px; font-size:14px; font-weight:700; color:#0B0F14;">To log an outcome:</p>
        <p style="margin:0 0 4px; font-size:14px; color:#374151;">1. Open BidIntell → Dashboard</p>
        <p style="margin:0 0 4px; font-size:14px; color:#374151;">2. Click any project → Log Outcome</p>
        <p style="margin:0; font-size:14px; color:#374151;">3. Pick Won / Lost / Ghosted / Passed — done</p>
    </div>
    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
        Log Your First Outcome →
    </a>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
    <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell · Reply any time</span></p>
</div>`;
}

async function sendWelcomeSequence() {
    const now = new Date();

    // Find subscription_created events that are 2, 4, or 7 days old (±12h window)
    const day2Min = new Date(now - (2.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day2Max = new Date(now - (1.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day4Min = new Date(now - (4.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day4Max = new Date(now - (3.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day7Min = new Date(now - (7.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day7Max = new Date(now - (6.5 * 24 * 60 * 60 * 1000)).toISOString();

    const steps = [
        { minAge: day2Min, maxAge: day2Max, eventType: 'welcome_email_step_2', label: 'Day-2 tips' },
        { minAge: day4Min, maxAge: day4Max, eventType: 'welcome_email_step_4', label: 'Day-4 outcome nudge' },
        { minAge: day7Min, maxAge: day7Max, eventType: 'welcome_email_step_3', label: 'Day-7 trial-end' }
    ];

    let totalSent = 0;

    for (const step of steps) {
        const { data: subscriptions } = await supabase
            .from('admin_events')
            .select('user_id, event_data')
            .eq('event_type', 'subscription_created')
            .gte('created_at', step.maxAge)
            .lte('created_at', step.minAge);

        if (!subscriptions || subscriptions.length === 0) continue;

        for (const sub of subscriptions) {
            const userId = sub.user_id;
            if (!userId) continue;
            if (await alreadySent(userId, step.eventType)) continue;

            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            const userEmail = authUser?.user?.email;
            if (!userEmail) continue;

            const firstName = userEmail.split('@')[0].split('.')[0];
            const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            let subject, htmlBody;
            if (step.eventType === 'welcome_email_step_2') {
                subject = '3 settings that make BidIntell more accurate';
                htmlBody = welcomeStep2Html(name);
            } else if (step.eventType === 'welcome_email_step_4') {
                subject = 'The most valuable thing you can do in BidIntell right now';
                htmlBody = welcomeStep4Html(name);
            } else {
                subject = 'Your free trial ends today';
                htmlBody = welcomeStep3Html(name);
            }

            try {
                await sendEmail({ to: userEmail, subject, htmlBody });
                await logEvent(userId, step.eventType, { email: userEmail, sent_at: new Date().toISOString() });
                totalSent++;
                console.log(`✅ ${step.label} sent to ${userEmail}`);
            } catch (err) {
                console.error(`❌ ${step.label} failed for ${userEmail}:`, err.message);
            }
        }
    }

    return totalSent;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
    console.log(`📅 Welcome sequence running`);
    const sent = await sendWelcomeSequence();
    console.log(`✅ Sequence done. Sent: ${sent}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent }) };
};
