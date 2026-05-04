// Prospect Sequence - Netlify Scheduled Function
// Runs daily at 14:00 UTC (9am CDT)
// Step 0 → 1: Day-0 personalized initial email (Claude-generated, template fallback)
// Step 1 → 2: Day-4 follow-up if still active
// Step 2 → 3: Day-10 break-up email, marks sequence completed

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const UNSUBSCRIBE_BASE = 'https://bidintell.ai/api/prospect-unsubscribe';

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

async function generateClaudeEmail(prospect) {
    if (!ANTHROPIC_API_KEY) return null;

    const system = `You are writing outbound sales emails on behalf of Ryan, founder of BidIntell — a bid intelligence tool for specialty subcontractors in commercial construction.

Voice: "confidently boring." Write like a 20-year commercial estimator who found a useful tool, not a startup founder pitching. Short sentences. No buzzwords. No exclamation points. No "game-changing" or "revolutionize." Sound like an email from a real person.

The email should:
- Be 3–5 sentences total
- Reference the recipient's trade and geography specifically
- Name a real problem: chasing bid invites that were never going to convert, or not knowing which GCs are worth the effort
- Mention BidIntell as something that scores bids before you spend time on them
- One clear call to action: try it free at bidintell.ai
- No subject line. No salutation. No sign-off. Just the body text — the salutation and signature are added separately.`;

    const user = `Write a first-touch outbound email to:
- Name: ${prospect.owner_name || 'the owner'}
- Company: ${prospect.company_name}
- Trade: ${prospect.trade || 'specialty contractor'}
- Geography: ${prospect.geography || 'the region'}
- Estimated revenue: ${prospect.estimated_revenue || 'mid-size firm'}

Output only the email body text.`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 400,
                system,
                messages: [{ role: 'user', content: user }]
            })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.content?.[0]?.text?.trim() || null;
    } catch {
        return null;
    }
}

function templateStep1(prospect) {
    const trade = prospect.trade || 'specialty sub';
    const geo = prospect.geography ? ` in ${prospect.geography}` : '';
    return `Most ${trade} owners${geo} I talk to are losing 10–20 hours a month chasing invites that were never going to convert — GCs who price-shop, project types outside their wheelhouse, scopes with margin already gone.

BidIntell scores bid invitations before you spend time on them. Based on the GC, the project type, your win history, and how the specs are written. Most guys who try it start declining 20–30% of their chase list within a few weeks.

Free to try at bidintell.ai. No credit card required.`;
}

function templateStep4(prospect) {
    const trade = prospect.trade || 'your trade';
    return `Sent you a note a few days ago about BidIntell — just making sure it didn't get buried.

If you're spending hours on bids you probably shouldn't be chasing, it might be worth 10 minutes. The scoring is specific to ${trade} work and accounts for GC behavior in your market.

Free trial at bidintell.ai if you want to run a few through it.`;
}

function templateStep10() {
    return `Last note from me on this.

If the timing isn't right or bid volume isn't a problem, totally understand. I'll leave it here.

If anything changes, bidintell.ai is there when you need it.`;
}

function getSubject(step, prospect) {
    const trade = (prospect.trade || '').toLowerCase();
    if (step === 1) return trade ? `scoring ${trade} invites before you chase them` : 'scoring bid invites before you chase them';
    if (step === 2) return 're: BidIntell';
    return 'closing the loop';
}

function buildHtml(bodyText, unsubscribeUrl) {
    const paragraphs = bodyText
        .split('\n')
        .filter(p => p.trim())
        .map(p => `<p style="font-size:15px; line-height:1.7; color:#374151; margin:0 0 16px;">${p.trim()}</p>`)
        .join('');

    return `<div style="background:#ffffff; font-family:'Helvetica Neue',Arial,sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    ${paragraphs}
    <p style="font-size:15px; line-height:1.7; color:#374151; margin:0 0 32px;">Ryan Elder<br>Founder<br><a href="https://bidintell.ai" style="color:#374151;">bidintell.ai</a></p>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 16px;">
    <p style="font-size:11px; color:#9ca3af; margin:0;">
        You're receiving this because your company was identified as a potential fit for BidIntell.<br>
        <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
    </p>
</div>`;
}

async function logEvent(prospectId, eventType, step, metadata = {}) {
    await supabase.from('prospect_sequence_events').insert({
        prospect_id: prospectId,
        event_type: eventType,
        step,
        metadata
    });
}

exports.handler = async () => {
    console.log('📬 Prospect sequence running:', new Date().toISOString());

    const now = new Date();
    const day4Cutoff = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    const day6Cutoff = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();

    const { data: prospects, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('status', 'active')
        .lt('sequence_step', 3)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching prospects:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`Found ${(prospects || []).length} active prospects`);

    let sent = 0;
    let skipped = 0;

    for (const prospect of (prospects || [])) {
        const unsubscribeUrl = `${UNSUBSCRIBE_BASE}?token=${prospect.unsubscribe_token}`;
        let step = null;
        let bodyText = null;

        if (prospect.sequence_step === 0) {
            step = 1;
            const generated = await generateClaudeEmail(prospect);
            bodyText = generated || templateStep1(prospect);
        } else if (prospect.sequence_step === 1 && prospect.last_email_sent_at <= day4Cutoff) {
            step = 2;
            bodyText = templateStep4(prospect);
        } else if (prospect.sequence_step === 2 && prospect.last_email_sent_at <= day6Cutoff) {
            step = 3;
            bodyText = templateStep10();
        }

        if (step === null) { skipped++; continue; }

        const firstName = (prospect.owner_name || '').split(' ')[0];
        const salutation = firstName ? `Hi ${firstName},` : 'Hi,';
        const fullBody = salutation + '\n\n' + bodyText;

        const subject = getSubject(step, prospect);
        const htmlBody = buildHtml(fullBody, unsubscribeUrl);
        const newStatus = step === 3 ? 'completed' : 'active';
        const nowIso = now.toISOString();

        try {
            await sendEmail({ to: prospect.owner_email, subject, htmlBody });
            await supabase.from('prospects')
                .update({ sequence_step: step, last_email_sent_at: nowIso, status: newStatus })
                .eq('id', prospect.id);
            await logEvent(prospect.id, 'email_sent', step, { subject, sent_at: nowIso });
            sent++;
            console.log(`✅ Step ${step} → ${prospect.owner_email}`);
        } catch (err) {
            console.error(`❌ Failed for ${prospect.owner_email}:`, err.message);
            skipped++;
        }
    }

    console.log(`✅ Done. Sent: ${sent}, Skipped/not-ready: ${skipped}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent, skipped }) };
};
