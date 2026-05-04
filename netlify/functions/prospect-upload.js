// Prospect Upload - Netlify HTTP Function
// POST /api/prospect-upload
// Body: { prospects: [{company_name, owner_email, trade?, geography?, estimated_revenue?, owner_name?}] }
// Admin-only: requires valid Supabase session token for ryan@bidintell.ai or ryan@fsikc.com

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    // Verify admin session
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const raw = body.prospects;
    if (!Array.isArray(raw) || raw.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'prospects array required' }) };
    }

    const valid = [];
    const validationErrors = [];

    for (let i = 0; i < raw.length; i++) {
        const p = raw[i];
        const email = (p.owner_email || '').trim().toLowerCase();
        if (!email || !email.includes('@') || !email.includes('.')) {
            validationErrors.push(`Row ${i + 1}: invalid owner_email "${p.owner_email || ''}"`);
            continue;
        }
        const companyName = (p.company_name || '').trim();
        if (!companyName) {
            validationErrors.push(`Row ${i + 1}: missing company_name`);
            continue;
        }
        valid.push({
            company_name: companyName,
            owner_email: email,
            trade: (p.trade || '').trim() || null,
            geography: (p.geography || '').trim() || null,
            estimated_revenue: (p.estimated_revenue || '').trim() || null,
            owner_name: (p.owner_name || '').trim() || null
        });
    }

    if (valid.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No valid prospects after validation', validationErrors })
        };
    }

    // Skip emails already in the table to avoid restarting sequences
    const emails = valid.map(p => p.owner_email);
    const { data: existing } = await supabase
        .from('prospects')
        .select('owner_email')
        .in('owner_email', emails);

    const existingSet = new Set((existing || []).map(p => p.owner_email));
    const newProspects = valid.filter(p => !existingSet.has(p.owner_email));
    const skippedCount = valid.length - newProspects.length;

    if (newProspects.length > 0) {
        const { error: insertError } = await supabase.from('prospects').insert(newProspects);
        if (insertError) {
            console.error('Insert error:', insertError);
            return { statusCode: 500, body: JSON.stringify({ error: insertError.message }) };
        }
    }

    console.log(`✅ Uploaded ${newProspects.length} new prospects, ${skippedCount} already existed`);
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            inserted: newProspects.length,
            skipped_existing: skippedCount,
            validation_errors: validationErrors
        })
    };
};
