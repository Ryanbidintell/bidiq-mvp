// /.netlify/functions/outcome-triggered-followup
// Agent #3: when a user logs a bid outcome (won/lost/ghost), draft a one-off follow-up
// to the GC and queue it for approval — reusing the existing follow-up pipeline
// (templates -> schedules -> touches -> approval UI -> send via the user's Gmail/M365).
//
// Model: a per-user "Outcome Follow-Ups" template + a 1-touch schedule per outcome.
// No schema change — it slots into follow_up_touches like any cadence touch, so it
// shows up in "Needs Review" and sends through send-followup-email.js unchanged.
//
// Caller: app.html after saveOutcome() (admin-gated + non-blocking there). Auth: user JWT.
// Returns { touchId } so the UI can open the approval modal, or { needsEmail:true } if no
// GC email is on record yet.

const { createClient } = require('@supabase/supabase-js');
const { generateDraft } = require('./oauth-shared/claude-draft-followup');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
const db = () => (supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY));

const PRINCIPLE_BY_OUTCOME = { won: 'unity', lost: 'reciprocity', ghost: 'reciprocity' };

/** One reusable "Outcome Follow-Ups" template per user (find-or-create). */
async function getOutcomeTemplateId(userId) {
    const { data: existing } = await db().from('follow_up_sequence_templates')
        .select('id').eq('user_id', userId).eq('name', 'Outcome Follow-Ups').limit(1).maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await db().from('follow_up_sequence_templates')
        .insert({ user_id: userId, name: 'Outcome Follow-Ups', description: 'Auto-generated one-off follow-ups triggered when you log a bid outcome.', is_system_template: false, is_default: false })
        .select('id').single();
    if (error) throw new Error('template create: ' + error.message);
    return created.id;
}

exports.handler = async function (event) {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://bidintell.ai', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Auth required' }) };
    let userId;
    try { const { data: { user }, error } = await db().auth.getUser(token); if (error || !user) throw new Error('bad token'); userId = user.id; }
    catch (_) { return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }; }

    try {
        const { projectId, outcome, gcName, outcomeData } = JSON.parse(event.body || '{}');
        if (!projectId || !['won', 'lost', 'ghost'].includes(outcome)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId and outcome (won|lost|ghost) required' }) };
        }

        // Load project + settings (scoped to this user) for draft context.
        const [{ data: project }, { data: settings }] = await Promise.all([
            db().from('projects').select('extracted_data, gcs').eq('id', projectId).eq('user_id', userId).maybeSingle(),
            db().from('user_settings').select('company_name, user_name, trades, city, state').eq('user_id', userId).maybeSingle()
        ]);
        if (!project) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Project not found' }) };
        const ed = project.extracted_data || {};
        const resolvedGcName = gcName || ed.gc_name || project.gcs?.[0]?.name || null;

        // Resolve GC recipient: clients.email (matched by name) -> project.gc_contact_email.
        let recipientEmail = null, recipientName = null;
        if (resolvedGcName) {
            const { data: client } = await db().from('clients').select('email, contact_person')
                .eq('user_id', userId).ilike('name', resolvedGcName).limit(1).maybeSingle();
            if (client?.email) { recipientEmail = client.email; recipientName = client.contact_person || null; }
        }
        if (!recipientEmail && ed.gc_contact_email) { recipientEmail = ed.gc_contact_email; recipientName = ed.gc_contact_name || null; }
        if (!recipientEmail) return { statusCode: 200, headers, body: JSON.stringify({ needsEmail: true, gcName: resolvedGcName, message: 'No GC email on record — add one to the client to send a follow-up.' }) };

        // Draft via the outcome-aware engine.
        const od = outcomeData || {};
        const firstName = (settings?.user_name || '').trim().split(/\s+/)[0] || null;
        let draft;
        try {
            draft = await generateDraft({
                userFirstName: firstName, companyName: settings?.company_name, trade: (settings?.trades || [])[0] || 'specialty trade',
                projectName: ed.project_name, projectAddress: [ed.project_city, ed.project_state].filter(Boolean).join(', '),
                projectType: ed.building_type || 'commercial construction',
                gcName: resolvedGcName, gcContactName: recipientName, gcContactEmail: recipientEmail,
                touchNumber: 1, totalTouches: 1, primaryPrinciple: PRINCIPLE_BY_OUTCOME[outcome], wordCountTarget: 75,
                outcomeContext: { outcome, margin: od.margin ?? null, howHigh: od.howHigh || null, bidderCount: od.bidderCount || od.bidder_count || null }
            });
        } catch (e) {
            // Drafting failed (e.g. AI down) — still create the touch so the user can write it manually.
            draft = null;
        }

        const templateId = await getOutcomeTemplateId(userId);
        const { data: schedule, error: schedErr } = await db().from('follow_up_schedules')
            .insert({ project_id: projectId, user_id: userId, template_id: templateId, status: 'active', bid_submitted_at: new Date().toISOString() })
            .select('id').single();
        if (schedErr) throw new Error('schedule create: ' + schedErr.message);

        const { data: touch, error: touchErr } = await db().from('follow_up_touches').insert({
            schedule_id: schedule.id, user_id: userId, touch_number: 1, scheduled_at: new Date().toISOString(),
            status: 'awaiting_approval', primary_principle: PRINCIPLE_BY_OUTCOME[outcome],
            draft_subject: draft?.subject || null, draft_body: draft?.body || null, draft_reasoning: draft?.reasoning || null,
            recipient_email: recipientEmail, recipient_name: recipientName
        }).select('id').single();
        if (touchErr) throw new Error('touch create: ' + touchErr.message);

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, touchId: touch.id, drafted: !!draft, recipientEmail }) };
    } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
};
