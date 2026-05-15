// Archive Prospects - Netlify HTTP Function (one-shot for BID-142 Phase 3)
// POST /api/archive-prospects
// Body: { dry_run?: boolean, reason?: string }
//
// Sets status='archived_wrong_icp' on every prospect not already archived.
// Sequence is already disabled in netlify.toml so this won't fire any emails;
// archived rows just stop being eligible for future cron picks once the
// sequence is re-enabled, and the ICP gate on prospect-upload prevents
// new bad rows from entering.
//
// Admin-only. Default body returns a dry-run preview (no writes).

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
        return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch { /* defaults */ }
    const dryRun = body.dry_run !== false;   // default to dry-run for safety
    const reason = (body.reason || 'BID-142 wrong-ICP cleanup').trim();

    const { data: targets, error: snapErr } = await supabase
        .from('prospects')
        .select('id, company_name, owner_email, status, sequence_step')
        .neq('status', 'archived_wrong_icp')
        .order('company_name');

    if (snapErr) {
        console.error('Snapshot failed:', snapErr);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: snapErr.message }) };
    }

    if (dryRun) {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                dry_run: true,
                would_archive_count: targets.length,
                reason,
                targets,
                hint: 'POST again with { "dry_run": false } to commit.'
            })
        };
    }

    const { error: updErr } = await supabase
        .from('prospects')
        .update({ status: 'archived_wrong_icp' })
        .neq('status', 'archived_wrong_icp');

    if (updErr) {
        console.error('Archive update failed:', updErr);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: updErr.message }) };
    }

    console.log(`[archive-prospects] ${user.email} archived ${targets.length} prospect(s). Reason: ${reason}`);

    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            dry_run: false,
            archived_count: targets.length,
            reason,
            archived_by: user.email,
            archived_at: new Date().toISOString(),
            targets
        })
    };
};
