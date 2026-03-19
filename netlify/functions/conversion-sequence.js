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

exports.handler = async () => {
    const daysLeft = daysUntilDeadline();
    console.log(`📅 Conversion sequence: ${daysLeft} days until deadline`);

    // Only fire on the three target days
    const email = emailForDaysLeft(daysLeft, 'there');
    if (!email) {
        console.log('Not a send day — skipping');
        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Not a send day' }) };
    }

    // Get all beta users who are not yet paying
    const { data: users, error } = await supabase
        .from('user_settings')
        .select('user_id')
        .not('subscription_status', 'eq', 'active');

    if (error) {
        console.error('Error fetching users:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`Found ${(users || []).length} non-paying users`);

    let sent = 0;
    let skipped = 0;

    for (const user of (users || [])) {
        if (await alreadySent(user.user_id, email.eventType)) {
            skipped++;
            continue;
        }

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

    console.log(`✅ Conversion sequence done. Sent: ${sent}, Skipped: ${skipped}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent, skipped, daysLeft }) };
};
