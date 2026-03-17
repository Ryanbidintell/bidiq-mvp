// Activation Check - Netlify Scheduled Function
// Runs daily at 10am UTC
// Finds users who signed up 3 days ago with no bids analyzed and sends activation email

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

exports.handler = async () => {
    console.log('🚀 Activation check started:', new Date().toISOString());

    // Find users who signed up between 3 and 4 days ago
    const start = new Date();
    start.setDate(start.getDate() - 4);
    const end = new Date();
    end.setDate(end.getDate() - 3);

    const { data: users, error } = await supabase
        .from('user_settings')
        .select('user_id, company_name, created_at')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

    if (error) {
        console.error('Error fetching users:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`Found ${(users || []).length} users in activation window`);

    let sent = 0;
    let skipped = 0;

    for (const user of (users || [])) {
        // Check if they've analyzed any bids
        const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .neq('extracted_data->>bc_source', 'buildingconnected');

        if (count > 0) {
            skipped++;
            continue; // Already active — skip
        }

        // Check if we already sent this email
        if (await alreadySent(user.user_id, 'activation_email_sent')) {
            skipped++;
            continue;
        }

        // Get their email from auth (via user_settings doesn't store it — use admin API)
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
        const email = authUser?.user?.email;
        if (!email) { skipped++; continue; }

        const firstName = email.split('@')[0].split('.')[0];
        const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        try {
            await sendEmail({
                to: email,
                subject: `Score your first bid in 5 minutes — here's how`,
                htmlBody: `
                <div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
                    <div style="margin-bottom:28px;">
                        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
                    </div>
                    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px; color:#0B0F14;">Hey ${name} — you're almost there.</h2>
                    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
                        You signed up for BidIntell a few days ago but haven't scored a bid yet.
                        That first score is where it clicks — took most of our beta users about 5 minutes.
                    </p>
                    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
                        Here's all you need to do:
                    </p>
                    <ol style="font-size:15px; line-height:1.8; color:#374151; margin:0 0 28px; padding-left:20px;">
                        <li>Log in and go to <strong>Analyze</strong></li>
                        <li>Upload any bid invitation PDF you've received recently</li>
                        <li>Get your BidIndex score in about 30 seconds</li>
                    </ol>
                    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
                        Score My First Bid →
                    </a>
                    <p style="font-size:14px; line-height:1.6; color:#6b7280; margin:0 0 8px;">
                        Don't have a PDF handy? Any bid invitation email with a project name, GC, and location works too — you can type the details in manually.
                    </p>
                    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
                    <p style="font-size:14px; color:#6b7280; margin:0;">
                        — Ryan<br>
                        <span style="color:#9ca3af;">Founder, BidIntell · <a href="https://bidintell.ai" style="color:#F26522;">bidintell.ai</a></span>
                    </p>
                </div>`
            });

            await logEvent(user.user_id, 'activation_email_sent', { email, sent_at: new Date().toISOString() });
            sent++;
            console.log(`✅ Activation email sent to ${email}`);
        } catch (err) {
            console.error(`❌ Failed to send to ${email}:`, err.message);
        }
    }

    console.log(`✅ Activation check done. Sent: ${sent}, Skipped: ${skipped}`);
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, sent, skipped })
    };
};
