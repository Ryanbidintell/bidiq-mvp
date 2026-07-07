// netlify/functions/diagnostic-prep.js
// Triggered by Calendly webhook when a prospect books a diagnostic.
//
// Flow:
//  1. Verify Calendly signature
//  2. Parse prospect data from invitee.created payload
//  3. Run Claude research (web_search) → company brief
//  4. Tailor the call script using the brief
//  5. Create Google Drive prospect folder
//  6. Write brief, tailored script, intake doc into folder
//  7. Append tracker sheet row
//  8. Generate + send founder summary email via Postmark
//
// Designed to degrade gracefully — partial success > total failure.

const crypto = require('crypto');
const {
  runResearch,
  tailorScript,
  generateFounderEmail,
  extractFitRead,
} = require('./diagnostic-agent/lib-claude-research');
const {
  createProspectFolder,
  writeMarkdownAsDoc,
} = require('./diagnostic-agent/lib-google-drive');
const { appendProspectRow } = require('./diagnostic-agent/lib-google-sheets');

// ---------- Webhook signature verification ----------

function verifyCalendlySignature(rawBody, signatureHeader) {
  if (process.env.CALENDLY_WEBHOOK_SECRET === 'test-skip') {
    return true; // dev override
  }
  if (!signatureHeader || !process.env.CALENDLY_WEBHOOK_SECRET) return false;

  try {
    // Calendly format: "t=<timestamp>,v1=<hmac>"
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((kv) => kv.split('='))
    );
    const { t, v1 } = parts;
    if (!t || !v1) return false;

    const signedPayload = `${t}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', process.env.CALENDLY_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    // timingSafeEqual throws if buffers are different lengths.
    const v1Buf = Buffer.from(v1, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (v1Buf.length !== expectedBuf.length) return false;

    return crypto.timingSafeEqual(v1Buf, expectedBuf);
  } catch (err) {
    console.warn('Signature verification error:', err.message);
    return false;
  }
}

// ---------- Parse Calendly payload ----------

function findAnswer(qa, ...keywords) {
  if (!Array.isArray(qa)) return '';
  for (const item of qa) {
    const q = (item.question || '').toLowerCase();
    if (keywords.some((k) => q.includes(k.toLowerCase()))) {
      return item.answer || '';
    }
  }
  return '';
}

// Calendly start_time is ISO-8601 UTC. Render it in Central (where BidIntell's
// construction ops live) for the founder email + agent prompt — otherwise a 4 PM CT
// slot shows as "9 PM UTC" and the agent wrongly flags it as a "late slot".
function formatCentralTime(iso) {
  if (!iso || iso === 'TBD') return 'TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}
function centralDateOnly(iso) {
  if (!iso || iso === 'TBD') return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
}

function parseProspect(payload) {
  const qa = payload.questions_and_answers || [];
  const fullName = payload.name || '';
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || '';

  // Intake form Q1: "Company name and your role"
  const companyAndRole = findAnswer(qa, 'company name', 'company and your role', 'role');
  // Try to split on " — " or "/" or ","
  let companyName = companyAndRole;
  let role = '';
  const splitMatch = companyAndRole.match(/^(.+?)\s*[—\-/,]\s*(.+)$/);
  if (splitMatch) {
    companyName = splitMatch[1].trim();
    role = splitMatch[2].trim();
  }

  const callTimeRaw =
    payload.calendar_event?.start_time ||
    payload.scheduled_event?.start_time ||
    payload.event?.start_time ||
    'TBD';

  return {
    firstName,
    lastName,
    prospectName: fullName,
    email: payload.email || '',
    companyName: companyName || 'Unknown Company',
    role: role || 'Unknown',
    trade: findAnswer(qa, 'trade', 'scope you specialize'),
    revenueBand: findAnswer(qa, 'revenue', 'annual revenue'),
    intakeAnswer: findAnswer(qa, 'hoping to get', 'one sentence', 'on your mind'),
    geography: '', // not collected in current Calendly form; agent infers from research
    callTimeISO: callTimeRaw,
    callTime: formatCentralTime(callTimeRaw), // Central, human-readable (was raw UTC ISO)
    callDate: centralDateOnly(callTimeRaw),
  };
}

// ---------- Postmark email ----------

async function sendFounderEmail({ subject, body, driveFolderUrl }) {
  // CLAUDE.md rule: always use @bidintell.ai — M365 silently drops BidIntell system emails
  const recipient = process.env.DIAGNOSTIC_NOTIFY_EMAIL || 'ryan@bidintell.ai';

  const fetchFn = global.fetch || require('node-fetch');
  await fetchFn('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
    },
    body: JSON.stringify({
      From: 'hello@bidintell.ai',
      To: recipient,
      Subject: subject,
      TextBody: body,
      MessageStream: 'outbound',
    }),
  });
}

// Sent when the main agent flow fails to send the founder email.
// Guarantees we hear about failures instead of them disappearing into Netlify logs.
async function sendFailureAlert(prospect, status) {
  const recipient = process.env.DIAGNOSTIC_NOTIFY_EMAIL || 'ryan@bidintell.ai';
  const fetchFn = global.fetch || require('node-fetch');

  const p = prospect || {};
  const subject = `[BidIntell agent FAILED] ${p.companyName || 'Unknown'} — ${p.prospectName || 'unknown prospect'}`;

  const errorLines = (status.errors && status.errors.length > 0)
    ? status.errors.map((e) => `  - ${e}`).join('\n')
    : '  (none recorded)';

  const body = [
    `The diagnostic agent failed during processing.`,
    `The Calendly booking still happened, but some or all prep artifacts may be missing.`,
    ``,
    `Prospect: ${p.prospectName || '(unknown)'}`,
    `Company:  ${p.companyName || '(unknown)'}`,
    `Email:    ${p.email || '(unknown)'}`,
    `Trade:    ${p.trade || '(unknown)'}`,
    `Call:     ${p.callTime || '(unknown)'}`,
    ``,
    `Agent step status:`,
    `  research: ${status.research}`,
    `  script:   ${status.script}`,
    `  drive:    ${status.drive}`,
    `  sheet:    ${status.sheet}`,
    `  email:    ${status.email}`,
    ``,
    `Errors recorded:`,
    errorLines,
    ``,
    `Next steps:`,
    `  1. Check Netlify function logs for diagnostic-prep around this booking time.`,
    `  2. If a Google credential error is listed, verify GOOGLE_PRIVATE_KEY format in Netlify.`,
    `  3. Manually set up the prep folder + intake until the agent is fixed.`,
  ].join('\n');

  await fetchFn('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
    },
    body: JSON.stringify({
      From: 'hello@bidintell.ai',
      To: recipient,
      Subject: subject,
      TextBody: body,
      MessageStream: 'outbound',
    }),
  });
}

// ---------- Intake doc markdown ----------

function buildIntakeDoc(prospect) {
  return `# Intake — ${prospect.companyName}

**Prospect:** ${prospect.prospectName}
**Role:** ${prospect.role}
**Email:** ${prospect.email}
**Company:** ${prospect.companyName}
**Trade:** ${prospect.trade}
**Revenue band:** ${prospect.revenueBand}
**Call time:** ${prospect.callTime}

## What they're hoping to get out of the call

> ${prospect.intakeAnswer}

---

This is the raw intake. The company brief and tailored script are separate files in this folder.
`;
}

// ---------- Main handler ----------

exports.handler = async (event) => {
  // Health check — allow GET to return 200
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'diagnostic-prep agent live' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify webhook signature (skip in dev)
  const sigHeader = event.headers['calendly-webhook-signature'] || event.headers['Calendly-Webhook-Signature'];
  if (!verifyCalendlySignature(event.body, sigHeader)) {
    console.warn('Calendly signature verification failed');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Only handle the booking event
  if (body.event !== 'invitee.created') {
    return { statusCode: 200, body: JSON.stringify({ skipped: body.event }) };
  }

  const prospect = parseProspect(body.payload || {});

  // Track partial failures
  const status = {
    research: 'pending',
    script: 'pending',
    drive: 'pending',
    sheet: 'pending',
    email: 'pending',
    errors: [],
  };

  // Early idempotency check — if a folder already exists for this prospect,
  // we're handling a Calendly retry. Short-circuit before spending Claude tokens.
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    const { findExistingProspectFolder } = require('./diagnostic-agent/lib-google-drive');
    const existing = await findExistingProspectFolder(drive, {
      prospectName: prospect.prospectName,
      companyName: prospect.companyName,
    });
    if (existing) {
      console.log(`Webhook retry detected — folder ${existing.folderId} already exists for ${prospect.companyName}, returning 200 without re-running.`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          retry: true,
          prospectId: existing.prospectId,
          folderUrl: existing.folderUrl,
          message: 'Folder already exists; this looks like a retried webhook.',
        }),
      };
    }
  } catch (err) {
    // If the early check itself fails, log and proceed — fall through to the normal path
    // which has its own idempotency check at folder creation.
    console.warn('Early idempotency check failed (non-fatal):', err.message);
  }

  // Run research
  let companyBrief = '';
  let fitRead = 'Mid';
  try {
    const research = await runResearch(prospect);
    companyBrief = research.brief;
    fitRead = extractFitRead(companyBrief);
    status.research = research.success ? 'ok' : 'fallback';
  } catch (err) {
    status.research = 'failed';
    status.errors.push(`research: ${err.message}`);
    companyBrief = `# Company Brief\n\nResearch step failed: ${err.message}`;
  }

  // Tailor script
  let tailoredScript = '';
  try {
    const scriptRes = await tailorScript({ prospectData: prospect, companyBrief });
    tailoredScript = scriptRes.script;
    status.script = scriptRes.success ? 'ok' : 'fallback';
  } catch (err) {
    status.script = 'failed';
    status.errors.push(`script: ${err.message}`);
    tailoredScript = `# Tailored Script\n\nTailoring failed: ${err.message}\n\nUse the standard script from playbook file 04.`;
  }

  // Create Drive folder + write artifacts
  let folderUrl = '';
  let prospectId = '';
  let folderAlreadyExisted = false;
  try {
    const folder = await createProspectFolder({
      prospectName: prospect.prospectName,
      companyName: prospect.companyName,
    });
    folderUrl = folder.folderUrl;
    prospectId = folder.prospectId;
    folderAlreadyExisted = !!folder.existing;

    if (folderAlreadyExisted) {
      console.log(`Idempotency: folder existed, skipping doc writes and sheet append for ${prospect.companyName}`);
      status.drive = 'skipped (already existed)';
      status.sheet = 'skipped (already existed)';
    } else {
      // Write the three docs in parallel
      await Promise.all([
        writeMarkdownAsDoc({
          folderId: folder.folderId,
          fileName: '00_company_brief',
          markdown: companyBrief,
        }),
        writeMarkdownAsDoc({
          folderId: folder.folderId,
          fileName: '01_tailored_script',
          markdown: tailoredScript,
        }),
        writeMarkdownAsDoc({
          folderId: folder.folderId,
          fileName: '02_intake_answers',
          markdown: buildIntakeDoc(prospect),
        }),
      ]);

      status.drive = 'ok';
    }
  } catch (err) {
    status.drive = 'failed';
    status.errors.push(`drive: ${err.message}`);
    folderUrl = '(Drive folder creation failed — set up manually)';
  }

  // Append tracker row (skip if folder already existed — assume row was already written)
  if (!folderAlreadyExisted) {
    try {
      await appendProspectRow({
        prospectId: prospectId || `P-${Date.now().toString(36).toUpperCase()}`,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        companyName: prospect.companyName,
        role: prospect.role,
        trade: prospect.trade,
        revenueBand: prospect.revenueBand,
        email: prospect.email,
        source: 'Inbound /diagnostic page',
        dateBooked: new Date().toISOString().split('T')[0],
        dateOfCall: prospect.callDate || (prospect.callTimeISO || '').split('T')[0],
        intakeAnswer: prospect.intakeAnswer,
        fitRead,
        driveFolderUrl: folderUrl,
      });
      status.sheet = 'ok';
    } catch (err) {
      status.sheet = 'failed';
      status.errors.push(`sheet: ${err.message}`);
    }
  }

  // Send founder summary email (skip if this was a webhook retry)
  if (folderAlreadyExisted) {
    status.email = 'skipped (already existed)';
  } else {
    try {
      const emailBody = await generateFounderEmail({
        companyName: prospect.companyName,
        prospectName: prospect.prospectName,
        callTime: prospect.callTime,
        driveFolderUrl: folderUrl,
        intakeAnswer: prospect.intakeAnswer,
        companyBrief,
        fitRead,
      });

      // Parse subject from generated email (first "Subject:" line)
      const subjectMatch = emailBody.match(/^Subject:\s*(.+)$/m);
      const subject = subjectMatch
        ? subjectMatch[1].trim()
        : `New diagnostic booked — ${prospect.companyName}`;
      const bodyText = emailBody.replace(/^Subject:.+$/m, '').trim();

      // Append agent status footer for transparency
      const statusFooter = `\n\n---\nAgent status: research ${status.research}, script ${status.script}, drive ${status.drive}, sheet ${status.sheet}` +
        (status.errors.length > 0 ? `\nErrors:\n  - ${status.errors.join('\n  - ')}` : '');

      await sendFounderEmail({
        subject,
        body: bodyText + statusFooter,
        driveFolderUrl: folderUrl,
      });
      status.email = 'ok';
    } catch (err) {
      status.email = 'failed';
      status.errors.push(`email: ${err.message}`);
      console.error('Founder email failed:', err);
    }
  }

  // Fallback alert — if the founder email didn't send and this wasn't a retry,
  // send a barebones plain-text alert so silent failures become loud.
  if (status.email !== 'ok' && !folderAlreadyExisted) {
    try {
      await sendFailureAlert(prospect, status);
      status.failureAlert = 'sent';
    } catch (alertErr) {
      status.failureAlert = 'failed';
      console.error('Failure alert email also failed:', alertErr);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      prospectId,
      folderUrl,
      status,
    }),
  };
};
