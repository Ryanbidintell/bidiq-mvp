// netlify/functions/prompt-ghost-outcome.js
// Scheduled daily at 7:00 AM Central (12:00 UTC / 13:00 UTC DST).
// After the final touch of a sequence has been sent for >7 days with no outcome
// logged, sends a prompt email to the user to mark the bid as Ghosted.
//
// This closes the outcome logging loop — the strategic goal is outcome rate ≥80%.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY     = process.env.POSTMARK_API_KEY;
const APP_URL              = 'https://bidintell.ai/app.html';

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return supabase;
}

async function sendGhostPromptEmail({ userEmail, userName, projectName, projectId, gcName }) {
  if (!POSTMARK_API_KEY) {
    console.warn('prompt-ghost-outcome — POSTMARK_API_KEY not set, skipping email send');
    return;
  }

  const firstName = (userName || '').split(' ')[0] || 'there';
  const gcLine = gcName ? ` with ${gcName}` : '';
  const projectLink = `${APP_URL}?tab=projects&project=${encodeURIComponent(projectId)}`;

  const subject = `Any word back on ${projectName || 'that bid'}?`;
  const textBody = [
    `${firstName},`,
    ``,
    `You sent your last follow-up on ${projectName || 'that bid'}${gcLine} over a week ago. Nothing back yet.`,
    ``,
    `If they've gone quiet, marking it as Ghosted takes one click and keeps your win rate accurate.`,
    ``,
    `${projectLink}`,
    ``,
    `If they did respond and you just haven't logged it yet — even better. Log the outcome so your BidIndex Score keeps improving.`,
    ``,
    `BidIntell`,
  ].join('\n');

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_KEY,
    },
    body: JSON.stringify({
      From: 'BidIntell <noreply@bidintell.ai>',
      To: userEmail,
      Subject: subject,
      TextBody: textBody,
      MessageStream: 'outbound',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Postmark send failed (${res.status}): ${err.Message || 'unknown'}`);
  }
}

exports.handler = async function () {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find active schedules where:
  // - The most recent sent touch was sent more than 7 days ago
  // - The project still has no outcome logged (outcome_logged_at IS NULL)
  // - The schedule hasn't already been cancelled/completed
  // We join through to projects to check outcome status.
  const { data: schedules, error: fetchErr } = await getSupabase()
    .from('follow_up_schedules')
    .select(`
      id, user_id, gc_name,
      project:projects(id, name, outcome, bid_submitted_at, gc_contact_name),
      user:users(email, first_name, last_name)
    `)
    .eq('status', 'active');

  if (fetchErr) {
    console.error('prompt-ghost-outcome — fetch schedules failed:', fetchErr.message);
    return { statusCode: 500, body: JSON.stringify({ error: fetchErr.message }) };
  }

  const results = { prompted: 0, skipped: 0, failed: 0 };

  for (const schedule of (schedules || [])) {
    try {
      const project = schedule.project;
      const user    = schedule.user;

      // Skip if project already has an outcome
      if (project?.outcome) {
        results.skipped++;
        continue;
      }

      // Find the most recent sent touch for this schedule
      const { data: lastTouch } = await getSupabase()
        .from('follow_up_touches')
        .select('touch_number, sent_at, schedule_id')
        .eq('schedule_id', schedule.id)
        .eq('status', 'sent')
        .order('touch_number', { ascending: false })
        .limit(1);

      if (!lastTouch || lastTouch.length === 0) {
        results.skipped++;
        continue;
      }

      const mostRecentSent = lastTouch[0];

      // Skip if the last send was less than 7 days ago
      if (mostRecentSent.sent_at > sevenDaysAgo) {
        results.skipped++;
        continue;
      }

      // Check if there are still pending/awaiting touches (schedule not done)
      const { data: remainingTouches } = await getSupabase()
        .from('follow_up_touches')
        .select('id')
        .eq('schedule_id', schedule.id)
        .in('status', ['pending', 'awaiting_approval'])
        .limit(1);

      if (remainingTouches && remainingTouches.length > 0) {
        // There are still future touches — don't prompt yet
        results.skipped++;
        continue;
      }

      // This schedule is done sending and no outcome logged — prompt the user
      await sendGhostPromptEmail({
        userEmail: user?.email,
        userName: user?.first_name
          ? `${user.first_name} ${user.last_name || ''}`.trim()
          : null,
        projectName: project?.name,
        projectId: project?.id,
        gcName: schedule.gc_name || project?.gc_contact_name,
      });

      results.prompted++;
      console.log(`  ✅ Prompted user ${schedule.user_id} re: project ${project?.id} (${project?.name})`);

    } catch (e) {
      results.failed++;
      console.error(`  ❌ Failed schedule ${schedule.id}:`, e.message);
    }
  }

  const summary = `Prompted ${results.prompted}; skipped ${results.skipped}; failed ${results.failed}`;
  console.log(`prompt-ghost-outcome — ${summary}`);

  return { statusCode: 200, body: JSON.stringify({ ...results, summary }) };
};
