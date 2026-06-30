// netlify/functions/generate-followup-drafts.js
// Scheduled daily at 6:00 AM Central (11:00 UTC / 12:00 UTC DST).
// Drafts AI follow-up emails for any touches due within 24 hours.
// Sets touch status: pending → awaiting_approval
//
// This is a background function (long timeout). Each touch is processed
// independently; a single failure does not abort the batch.

const { createClient } = require('@supabase/supabase-js');
const { generateDraft } = require('./oauth-shared/claude-draft-followup');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

async function fetchUserContext(userId) {
  const { data } = await getSupabase()
    .from('users')
    .select('first_name, last_name, company_name, trade')
    .eq('id', userId)
    .maybeSingle();
  return data || {};
}

async function fetchPriorTouches(scheduleId, currentTouchNumber) {
  const { data } = await getSupabase()
    .from('follow_up_touches')
    .select('touch_number, draft_subject, user_edited_subject, sent_at, status')
    .eq('schedule_id', scheduleId)
    .lt('touch_number', currentTouchNumber)
    .eq('status', 'sent')
    .order('touch_number');
  return data || [];
}

async function processDraftForTouch(touch) {
  const { schedule } = touch;
  const { project, template } = schedule || {};

  const userCtx = await fetchUserContext(touch.user_id);
  const priorTouches = await fetchPriorTouches(touch.schedule_id, touch.touch_number);

  // Find the step config for this touch number
  const { data: step } = await getSupabase()
    .from('follow_up_sequence_steps')
    .select('*')
    .eq('template_id', schedule.template_id)
    .eq('step_number', touch.touch_number)
    .maybeSingle();

  const context = {
    userName: userCtx.first_name
      ? `${userCtx.first_name} ${userCtx.last_name || ''}`.trim()
      : null,
    userFirstName: userCtx.first_name || null,
    companyName: userCtx.company_name || null,
    trade: userCtx.trade || null,
    projectName: project?.name || null,
    projectAddress: project?.address || null,
    projectType: project?.project_type || null,
    projectSizeSf: project?.project_size_sf || null,
    bidScore: project?.bid_score || null,
    gcName: schedule?.gc_name || project?.gc_contact_name || null,
    gcContactName: touch.recipient_name || null,
    gcContactEmail: touch.recipient_email,
    touchNumber: touch.touch_number,
    totalTouches: schedule?.total_touches || null,
    primaryPrinciple: touch.primary_principle,
    secondaryPrinciple: touch.secondary_principle || null,
    wordCountTarget: step?.word_count_target || 70,
    customInstruction: step?.custom_instruction || null,
    priorTouches,
    templateName: template?.name || null,
  };

  const draft = await generateDraft(context);

  const { error } = await getSupabase()
    .from('follow_up_touches')
    .update({
      draft_subject: draft.subject,
      draft_body: draft.body,
      draft_reasoning: draft.reasoning,
      status: 'awaiting_approval',
    })
    .eq('id', touch.id)
    .eq('status', 'pending'); // Guard: only update if still pending

  if (error) {
    throw new Error(`DB update failed: ${error.message}`);
  }

  return draft;
}

exports.handler = async function (event) {
    // Internal/scheduled endpoint — block public HTTP abuse (email spam / AI cost).
    // Allow Netlify scheduled runs (body carries next_run) or a CRON_SECRET request.
    {
        let _sched = false;
        try { _sched = !!JSON.parse((event && event.body) || '{}').next_run; } catch (_) {}
        const _sec = process.env.CRON_SECRET;
        const _h = (event && event.headers) || {};
        const _q = (event && event.queryStringParameters) || {};
        if (!(_sched || (_sec && (_h['x-cron-secret'] === _sec || _q.cron_secret === _sec)))) {
            return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized internal endpoint' }) };
        }
    }
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Fetch pending touches due within 24 hours that belong to active schedules
  const { data: dueTouches, error: fetchErr } = await getSupabase()
    .from('follow_up_touches')
    .select(`
      id, user_id, touch_number, scheduled_at, primary_principle, secondary_principle,
      recipient_email, recipient_name, schedule_id,
      schedule:follow_up_schedules(
        id, template_id, gc_name, total_touches,
        project:projects(name, address, project_type, project_size_sf, bid_score, gc_contact_name),
        template:follow_up_sequence_templates(name)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', in24h.toISOString())
    .eq('schedule.status', 'active');

  if (fetchErr) {
    console.error('generate-followup-drafts — fetch failed:', fetchErr.message);
    return { statusCode: 500, body: JSON.stringify({ error: fetchErr.message }) };
  }

  const touches = (dueTouches || []).filter(t => t.schedule); // filter out null schedules
  console.log(`generate-followup-drafts — processing ${touches.length} touch(es)`);

  const results = { success: 0, failed: 0, errors: [] };

  for (const touch of touches) {
    try {
      await processDraftForTouch(touch);
      results.success++;
      console.log(`  ✅ Drafted touch ${touch.id} (touch #${touch.touch_number}, scheduled ${touch.scheduled_at})`);
    } catch (e) {
      results.failed++;
      results.errors.push({ touchId: touch.id, error: e.message });
      console.error(`  ❌ Failed touch ${touch.id}:`, e.message);

      // Mark the touch with a non-blocking error note so admins can see it
      await getSupabase()
        .from('follow_up_touches')
        .update({ send_error: `Draft generation failed: ${e.message.slice(0, 200)}` })
        .eq('id', touch.id)
        .eq('status', 'pending');
    }
  }

  const summary = `Drafted ${results.success} touch(es); ${results.failed} failed`;
  console.log(`generate-followup-drafts — ${summary}`);

  return { statusCode: 200, body: JSON.stringify({ ...results, summary }) };
};
