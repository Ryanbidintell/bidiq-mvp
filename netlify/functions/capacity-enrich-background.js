// netlify/functions/capacity-enrich-background.js
// Fired server-side by notify.js when someone joins the Capacity early-access list.
// Runs the SAME Claude web-research brief the diagnostic agent uses, emails Ryan the
// background, and logs it to admin_events against the lead.
//
// Background function (filename ends in -background): invoked async, returns 202 to
// the caller immediately, runs up to 15 min — so it never blocks the waitlist form.
//
// GATED: runs Claude (real cost + web_search), so it must never be publicly invokable.
// Requires the internal secret (CRON_SECRET) and FAILS CLOSED if it isn't configured.

const { runResearch } = require('./diagnostic-agent/lib-claude-research');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SB_URL = process.env.SUPABASE_URL || 'https://szifhqmrddmdkgschkkw.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function emailRyan(subject, html) {
  if (!RESEND_API_KEY) { console.warn('RESEND_API_KEY unset — skipping enrichment email'); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'BidIntell <hello@bidintell.ai>', to: ['ryan@bidintell.ai'], subject, html })
  });
}

function briefToHtml(md) {
  const safe = String(md).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return `<pre style="font-family:ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;font-size:13px;line-height:1.55;background:#F4F1EA;color:#17130E;padding:16px;border-radius:8px;">${safe}</pre>`;
}

exports.handler = async function (event) {
  // ── Gate: internal-only. Fail closed when no secret is configured. ──
  const secret = process.env.CRON_SECRET;
  const provided = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'] || '';
  if (!secret || provided !== secret) {
    return { statusCode: 401, body: 'unauthorized' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const email = String(body.email || '').trim();
  const company = String(body.company || '').trim();
  const trade = String(body.trade || '').trim();
  if (!email) return { statusCode: 400, body: 'email required' };

  const domain = email.split('@')[1] || '';
  const companyName = company || domain || email;
  const prospectData = {
    companyName,
    prospectName: 'Early-access signup',
    trade: trade || '(unspecified)',
    geography: '',
  };

  // Same research the diagnostic agent runs (Claude + web_search → ICP-fit brief)
  let brief = '', ok = false, searches = 0;
  try {
    const r = await runResearch(prospectData);
    brief = r.brief; ok = r.success; searches = r.searchesRun || 0;
  } catch (err) {
    brief = `Research failed: ${err.message}`;
  }

  // Email Ryan the background so it's ready before he reaches out
  try {
    await emailRyan(
      `🔎 Capacity early-access background: ${companyName}`,
      `<div style="font-family:sans-serif;max-width:660px;margin:0 auto;color:#17130E;">
        <h2 style="color:#E4562A;margin:0 0 6px;">Capacity early-access — background brief</h2>
        <p style="margin:0 0 14px;color:#3A342B;font-size:14px;">
          <strong>Email:</strong> ${email}<br>
          <strong>Company:</strong> ${company || '(inferred from domain: ' + (domain || 'n/a') + ')'}<br>
          <strong>Trade:</strong> ${trade || '—'}<br>
          <strong>Research:</strong> ${ok ? ('ok · ' + searches + ' searches') : 'fallback (research API unavailable)'}
        </p>
        ${briefToHtml(brief)}
      </div>`
    );
  } catch (err) { console.warn('enrichment email failed:', err); }

  // Log to admin_events so it's attached to the lead in the founder dashboard
  if (SB_KEY) {
    try {
      await fetch(`${SB_URL}/rest/v1/admin_events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          event_type: 'capacity_enrichment',
          user_id: null,
          event_data: { email, company: company || null, trade: trade || null, research_ok: ok, searches, brief: String(brief).slice(0, 4000) }
        })
      });
    } catch (err) { console.warn('enrichment log failed:', err); }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, research_ok: ok, searches }) };
};
