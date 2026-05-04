// Prospect Unsubscribe - Netlify HTTP Function
// GET /api/prospect-unsubscribe?token=<unsubscribe_token>
// Permanently marks the prospect as unsubscribed — no further emails sent.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function htmlPage(title, message, isError) {
    const color = isError ? '#DC2626' : '#16a34a';
    const icon = isError ? '✗' : '✓';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — BidIntell</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); padding: 48px 40px; max-width: 420px; text-align: center; }
        .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
        h1 { font-size: 22px; color: #111827; margin: 0 0 12px; }
        p { font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0; }
        .brand { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #F26522; margin-bottom: 24px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand">BIDINTELL</div>
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}

exports.handler = async (event) => {
    const token = event.queryStringParameters?.token || '';

    if (!token) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'text/html' },
            body: htmlPage('Invalid Link', 'This unsubscribe link is missing a token. Please contact hello@bidintell.ai if you want to be removed.', true)
        };
    }

    const { data: prospect, error } = await supabase
        .from('prospects')
        .select('id, owner_email, status')
        .eq('unsubscribe_token', token)
        .single();

    if (error || !prospect) {
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'text/html' },
            body: htmlPage('Link Not Found', 'This unsubscribe link is invalid or has already been used. If you keep receiving emails, contact hello@bidintell.ai.', true)
        };
    }

    if (prospect.status === 'unsubscribed') {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: htmlPage("You're already unsubscribed", `${prospect.owner_email} was previously removed from our list. You won't receive any more emails from us.`, false)
        };
    }

    const now = new Date().toISOString();
    await supabase.from('prospects')
        .update({ status: 'unsubscribed', unsubscribed_at: now })
        .eq('id', prospect.id);

    await supabase.from('prospect_sequence_events').insert({
        prospect_id: prospect.id,
        event_type: 'unsubscribed',
        metadata: { unsubscribed_at: now }
    });

    console.log(`✅ Unsubscribed: ${prospect.owner_email}`);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: htmlPage("You're unsubscribed", `${prospect.owner_email} has been permanently removed from our outreach list. You won't hear from us again.`, false)
    };
};
