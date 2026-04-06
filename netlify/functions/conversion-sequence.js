// Beta-to-Paid Conversion Sequence - Netlify Scheduled Function
// Runs daily at 11am UTC
// Sends 3 timed emails to beta users as March 31 founding pricing deadline approaches
//   Email 1: 7 days before (March 24) — "Founding pricing locks in 7 days"
//   Email 2: 3 days before (March 28) — "3 days left at founding price"
//   Email 3: 1 day before (March 30) — "Last chance — price goes up tomorrow"

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

const DEADLINE = new Date('2026-04-01T00:00:00Z'); // Founding pricing ends

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
            Bcc: 'ryan@fsikc.com',
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

function daysUntilDeadline() {
    const now = new Date();
    return Math.ceil((DEADLINE - now) / (1000 * 60 * 60 * 24));
}

function emailForDaysLeft(daysLeft, name) {
    if (daysLeft <= 7 && daysLeft > 3) {
        return {
            eventType: 'conversion_email_7day',
            subject: `Founding pricing locks in 7 days`,
            html: `
            <div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
                <div style="margin-bottom:28px;">
                    <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
                </div>
                <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">Founding pricing ends March 31, ${name}.</h2>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
                    You've been using BidIntell free during beta. On April 1, we go live with paid plans — and everyone who locks in before then gets <strong>founding member pricing for life</strong>.
                </p>
                <div style="background:#f9fafb; border-left:3px solid #F26522; padding:16px 20px; margin:0 0 24px; border-radius:4px;">
                    <p style="margin:0 0 8px; font-size:15px; font-weight:700;">Founding pricing (locks in before April 1):</p>
                    <p style="margin:0 0 4px; font-size:15px; color:#374151;">Starter — <strong>$49/mo</strong></p>
                    <p style="margin:0; font-size:15px; color:#374151;">Pro — <strong>$99/mo</strong></p>
                </div>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
                    Lock in now and your rate never changes — even as we add features and raise prices for new subscribers.
                </p>
                <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
                    Lock In Founding Price →
                </a>
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
                <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell</span></p>
            </div>`
        };
    }

    if (daysLeft <= 3 && daysLeft > 1) {
        return {
            eventType: 'conversion_email_3day',
            subject: `3 days left at founding price`,
            html: `
            <div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
                <div style="margin-bottom:28px;">
                    <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
                </div>
                <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">3 days left, ${name}.</h2>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
                    Founding pricing disappears on April 1. After that, new subscribers pay standard rates. The only way to lock in $49/mo for Starter forever is to subscribe before Monday.
                </p>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
                    Takes 2 minutes. No annual contract — cancel anytime.
                </p>
                <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
                    Subscribe Before April 1 →
                </a>
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
                <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell</span></p>
            </div>`
        };
    }

    if (daysLeft <= 1 && daysLeft >= 0) {
        return {
            eventType: 'conversion_email_1day',
            subject: `Last chance — founding price ends tomorrow`,
            html: `
            <div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
                <div style="margin-bottom:28px;">
                    <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
                </div>
                <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">Tomorrow it's gone, ${name}.</h2>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
                    Founding pricing ends at midnight tonight. If you've been thinking about it, now is the time.
                </p>
                <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
                    Your data, your GC history, your bid scores — they're all still there. Subscribe before midnight and keep founding pricing for as long as you're a member.
                </p>
                <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
                    Subscribe Now — Last Chance →
                </a>
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
                <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell</span></p>
            </div>`
        };
    }

    return null;
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
        <p style="font-size:15px; font-weight:700; margin:0 0 6px; color:#0B0F14;">2. Add and rate your GCs <span style="font-weight:400; color:#6b7280;">(GC Manager tab)</span></p>
        <p style="font-size:14px; line-height:1.6; color:#374151; margin:0;">Your win rate with each GC factors directly into your score. The more history you track, the smarter the scoring gets.</p>
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

async function sendWelcomeSequence() {
    const now = new Date();

    // Find subscription_created events that are 2 or 7 days old (±12h window)
    const day2Min = new Date(now - (2.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day2Max = new Date(now - (1.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day7Min = new Date(now - (7.5 * 24 * 60 * 60 * 1000)).toISOString();
    const day7Max = new Date(now - (6.5 * 24 * 60 * 60 * 1000)).toISOString();

    const steps = [
        { minAge: day2Min, maxAge: day2Max, eventType: 'welcome_email_step_2', label: 'Day-2 tips' },
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
            const isStep2 = step.eventType === 'welcome_email_step_2';
            const subject = isStep2
                ? '3 settings that make BidIntell more accurate'
                : 'Your free trial ends today';
            const htmlBody = isStep2 ? welcomeStep2Html(name) : welcomeStep3Html(name);

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
    const daysLeft = daysUntilDeadline();
    console.log(`📅 Conversion sequence: ${daysLeft} days until deadline`);

    let sent = 0;
    let skipped = 0;

    // Part 1: Beta-to-paid conversion emails (fires on days 7, 3, 1 before April 1)
    const email = emailForDaysLeft(daysLeft, 'there');
    if (email) {
        const { data: users, error } = await supabase
            .from('user_settings')
            .select('user_id')
            .not('subscription_status', 'eq', 'active');

        if (error) {
            console.error('Error fetching users:', error);
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }

        console.log(`Found ${(users || []).length} non-paying users`);

        for (const user of (users || [])) {
            if (await alreadySent(user.user_id, email.eventType)) { skipped++; continue; }

            const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
            const userEmail = authUser?.user?.email;
            if (!userEmail) { skipped++; continue; }

            const firstName = userEmail.split('@')[0].split('.')[0];
            const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            const personalizedEmail = emailForDaysLeft(daysLeft, name);

            try {
                await sendEmail({ to: userEmail, subject: personalizedEmail.subject, htmlBody: personalizedEmail.html });
                await logEvent(user.user_id, email.eventType, { email: userEmail, days_left: daysLeft, sent_at: new Date().toISOString() });
                sent++;
                console.log(`✅ Conversion email sent to ${userEmail}`);
            } catch (err) {
                console.error(`❌ Failed to send to ${userEmail}:`, err.message);
            }
        }
    }

    // Part 2: Welcome sequence for new paid subscribers (day 2 tips + day 7 trial-end)
    const welcomeSent = await sendWelcomeSequence();
    sent += welcomeSent;

    console.log(`✅ Sequence done. Sent: ${sent}, Skipped: ${skipped}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent, skipped, daysLeft }) };
};
