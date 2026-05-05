// Prospect Sequence - Netlify Scheduled Function
// Runs daily at 14:00 UTC (9am CDT)
// 5-touch sequence (v2 Owner Outreach, Hormozi frame):
// Step 0 → 1: Day-0  personalized initial email (dollar math hook)
// Step 1 → 2: Day-2  tribal knowledge / data moat
// Step 2 → 3: Day-5  full offer + pricing
// Step 3 → 4: Day-9  founding-member pricing reminder
// Step 4 → 5: Day-14 break-up, marks sequence completed

const { createClient } = require('@supabase/supabase-js');
const { syncEmailStepToPipedrive } = require('./pipedrive-utils');

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

    const system = `You are writing outbound sales emails on behalf of Ryan, founder of BidIntell — a bid intelligence tool for specialty subcontractors and building products distributors in commercial construction.

Voice: "confidently boring." Write like a 20-year commercial estimator who found a useful tool, not a startup founder pitching. Short sentences. No buzzwords. No exclamation points. No "game-changing" or "revolutionize." Sound like an email from a real person.

The email should:
- Be 3–5 sentences total
- Reference the recipient's trade and company specifically
- Open with the cost of a bad bid: 1 bad bid = 6–20 estimating hours × $75–$150/hr = $450–$3,000 wasted
- Mention BidIntell scores bid invites before you commit estimating hours to them
- One clear CTA: free to try at bidintell.ai — no credit card, no calls. Drop your next bid invite in and see the score.
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

// Day 0 — dollar math hook + self-serve signup CTA
function templateStep1(prospect) {
    const company = prospect.company_name || 'your company';
    return `Quick math on bid triage:

- 1 bad bid = 6–20 estimating hours
- Loaded estimator cost = $75–$150/hr
- Cost of one bad bid: $450 to $3,000

If ${company} is chasing more than one of those a month, BidIntell pays for itself 5–50x over.

Free to try at bidintell.ai — no credit card, no calls. Drop your next bid invite in and see the score.`;
}

// Day 2 — tribal knowledge / data moat
function templateStep2(prospect) {
    const company = prospect.company_name || 'your company';
    return `Most subs I talk to win with certain GCs and lose with others — but it's tribal knowledge in someone's head.

BidIntell quantifies it. Win rate by GC. Win rate by project type. Pay behavior. Bid-shopping signals. Over 6–12 months it becomes ${company}'s internal bidding algorithm — not gut feel.

That's how you scale past today's relationships.

Free to try at bidintell.ai — no credit card, no calls.`;
}

// Day 5 — full offer + pricing
function templateStep3(prospect) {
    const company = prospect.company_name || 'your company';
    return `Here's the deal if ${company} wants in:

You get: BidIntell scoring engine (5 factors, every invite), GC database that learns your win/loss patterns over time, contract risk detection (pay-if-paid, LDs, etc.), and founder-led onboarding. Founding-member pricing locks for the life of your subscription.

You pay: $470 / $950 / $1,720 per year (Starter / Pro / Team)

Kill at least 1 bad bid in 30 days or we refund you, no questions.

We are capping founding members at 50. After that, founding pricing goes away.

Try it free at bidintell.ai — no credit card, no calls.`;
}

// Day 9 — founding-member pricing reminder + urgency
function templateStep4(prospect) {
    const company = prospect.company_name || 'your company';
    return `Founding-member pricing locks for life — the rate you sign up at stays put as long as you're a customer.

We are capping founding members at 50. After that, founding pricing goes away.

If ${company} gets 20+ invites a week and you're tired of chasing the wrong ones, try it free at bidintell.ai.

Kill at least 1 bad bid in 30 days or we refund you, no questions.`;
}

// Day 14 — break-up
function templateStep5(prospect) {
    const company = prospect.company_name || 'your company';
    return `Last note from me.

If bid triage isn't a priority at ${company} right now, no worries — just hit reply with "not now" and I'll back off.

If it is, even a one-line reply works.

Either way, thanks for your time.`;
}

function getSubject(step, prospect) {
    const company = prospect.company_name || '';
    if (step === 1) return 'the math says 1 bad bid costs you $450–$3,000';
    if (step === 2) return 'scale past tribal knowledge';
    if (step === 3) return 'the offer (founding-member pricing)';
    if (step === 4) return 'founding pricing — still available';
    return company ? `closing the file on ${company}?` : 'closing the loop';
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
    const day2Cutoff = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const day3Cutoff = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const day4Cutoff = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    const day5Cutoff = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: prospects, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('status', 'active')
        .lt('sequence_step', 5)
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
        } else if (prospect.sequence_step === 1 && prospect.last_email_sent_at <= day2Cutoff) {
            step = 2;
            bodyText = templateStep2(prospect);
        } else if (prospect.sequence_step === 2 && prospect.last_email_sent_at <= day3Cutoff) {
            step = 3;
            bodyText = templateStep3(prospect);
        } else if (prospect.sequence_step === 3 && prospect.last_email_sent_at <= day4Cutoff) {
            step = 4;
            bodyText = templateStep4(prospect);
        } else if (prospect.sequence_step === 4 && prospect.last_email_sent_at <= day5Cutoff) {
            step = 5;
            bodyText = templateStep5(prospect);
        }

        if (step === null) { skipped++; continue; }

        const firstName = (prospect.owner_name || '').split(' ')[0];
        const salutation = firstName ? `Hi ${firstName},` : 'Hi,';
        const fullBody = salutation + '\n\n' + bodyText;

        const subject = getSubject(step, prospect);
        const htmlBody = buildHtml(fullBody, unsubscribeUrl);
        const newStatus = step === 5 ? 'completed' : 'active';
        const nowIso = now.toISOString();

        try {
            await sendEmail({ to: prospect.owner_email, subject, htmlBody });
            await supabase.from('prospects')
                .update({ sequence_step: step, last_email_sent_at: nowIso, status: newStatus })
                .eq('id', prospect.id);
            await logEvent(prospect.id, 'email_sent', step, { subject, sent_at: nowIso });
            sent++;
            console.log(`✅ Step ${step} → ${prospect.owner_email}`);

            // Sync email step to Pipedrive — non-fatal, does not affect email delivery
            try {
                await syncEmailStepToPipedrive(prospect.owner_email, step, subject);
            } catch (pErr) {
                console.error(`Pipedrive step sync failed for ${prospect.owner_email}:`, pErr.message);
            }
        } catch (err) {
            console.error(`❌ Failed for ${prospect.owner_email}:`, err.message);
            skipped++;
        }
    }

    console.log(`✅ Done. Sent: ${sent}, Skipped/not-ready: ${skipped}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent, skipped }) };
};
