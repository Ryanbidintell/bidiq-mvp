// netlify/functions/diagnostic-agent/lib-transcript-processor.js
// Reads a post-call Granola transcript from a prospect's Shared Drive folder,
// extracts structured fields via Claude, and updates the Prospects tab row.

const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
const { buildTranscriptExtractionPrompt } = require('./prompts');

const MODEL = 'claude-sonnet-4-6';
const PROCESSED_MARKER = '.processed';
const CONFIDENCE_FLAG_THRESHOLD = 0.7;
const FLAG_PREFIX = '⚠️ ';

// Files written by diagnostic-prep — skip these when looking for a transcript
const KNOWN_PREFIXES = ['00_company_brief', '01_tailored_script', '02_intake_answers'];

function getGoogleClients() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  return {
    drive: google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
  };
}

async function listProspectFolders(drive) {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files || [];
}

async function listFolderContents(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,webViewLink,createdTime)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files || [];
}

function findTranscriptFile(files) {
  if (files.some((f) => f.name === PROCESSED_MARKER)) return null;
  const candidates = files.filter(
    (f) =>
      !KNOWN_PREFIXES.some((p) => f.name.startsWith(p)) &&
      f.name !== PROCESSED_MARKER &&
      f.mimeType !== 'application/vnd.google-apps.folder'
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  return candidates[0];
}

async function fetchTextFromDriveFile(drive, file) {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: 'text/plain' },
      { responseType: 'text' }
    );
    return typeof res.data === 'string' ? res.data : String(res.data);
  }
  if (file.mimeType.startsWith('text/')) {
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'text' }
    );
    return typeof res.data === 'string' ? res.data : String(res.data);
  }
  throw new Error(`Unsupported transcript format: ${file.mimeType} (${file.name})`);
}

async function fetchCompanyBriefText(drive, folderFiles) {
  const brief = folderFiles.find((f) => f.name.startsWith('00_company_brief'));
  if (!brief) return '';
  try {
    return await fetchTextFromDriveFile(drive, brief);
  } catch (err) {
    console.warn('Failed to read company brief:', err.message);
    return '';
  }
}

function extractProspectIdFromFolderName(name) {
  const m = (name || '').match(/^(P\d+)/);
  return m ? m[1] : null;
}

function extractCompanyAndProspect(folderName) {
  // Folder pattern: P001_CompanyName_ProspectName
  const parts = (folderName || '').split('_');
  return {
    companyName: parts[1] || '',
    prospectName: parts.slice(2).join(' ') || '',
  };
}

async function extractFieldsWithClaude({ transcript, companyBrief, companyName, prospectName }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = buildTranscriptExtractionPrompt({
    companyName,
    prospectName,
    companyBrief,
    transcript,
  });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const cleaned = text.replace(/^```\w*\n?/gm, '').replace(/```\s*$/gm, '').trim();
  return JSON.parse(cleaned);
}

function formatCell(field) {
  if (!field || field.value === '' || field.value === null || field.value === undefined) {
    return '';
  }
  const str = String(field.value);
  if (typeof field.confidence === 'number' && field.confidence < CONFIDENCE_FLAG_THRESHOLD) {
    return `${FLAG_PREFIX}${str}`;
  }
  return str;
}

async function findRowByProspectId(sheets, spreadsheetId, prospectId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Prospects!A:A',
  });
  const values = res.data.values || [];
  for (let i = 0; i < values.length; i++) {
    if (values[i]?.[0] === prospectId) {
      return i + 1;
    }
  }
  return null;
}

async function updateProspectRow({ sheets, spreadsheetId, rowNum, fields, transcriptUrl }) {
  // Row layout (1-indexed sheet columns):
  //   P (16) = Call duration (min)
  //   Q (17) = Granola transcript link
  //   S (19) = No-show? (set to "No" since we have a transcript)
  //   T-X (20-24) = Q1 Wins
  //   Y-AB (25-28) = Q2 Losses
  //   AC-AF (29-32) = Q3 Regrets
  //   AG-AJ (33-36) = Q4 Decision Process
  //   AK-AL (37-38) = Q5 Wish
  //   BA (53) = Quote of the call
  //   BB (54) = Fit rating
  //   BC (55) = Energy rating
  //   BD (56) = Notes for next conversation

  const data = [
    { range: `Prospects!P${rowNum}`, values: [[formatCell(fields.duration_min)]] },
    { range: `Prospects!Q${rowNum}`, values: [[transcriptUrl || '']] },
    { range: `Prospects!S${rowNum}`, values: [['No']] },
    {
      range: `Prospects!T${rowNum}:X${rowNum}`,
      values: [[
        formatCell(fields.win_count),
        formatCell(fields.gcs_they_win_with),
        formatCell(fields.win_attribution),
        formatCell(fields.win_concentration),
        formatCell(fields.win_self_awareness),
      ]],
    },
    {
      range: `Prospects!Y${rowNum}:AB${rowNum}`,
      values: [[
        formatCell(fields.loss_count),
        formatCell(fields.gcs_they_lose_to),
        formatCell(fields.loss_pattern),
        formatCell(fields.loss_self_awareness),
      ]],
    },
    {
      range: `Prospects!AC${rowNum}:AF${rowNum}`,
      values: [[
        formatCell(fields.regret_stories),
        formatCell(fields.common_regret_pattern),
        formatCell(fields.hours_wasted),
        formatCell(fields.verbatim_emotional_quote),
      ]],
    },
    {
      range: `Prospects!AG${rowNum}:AJ${rowNum}`,
      values: [[
        formatCell(fields.decision_maker),
        formatCell(fields.decision_time_spent),
        formatCell(fields.tools_used_today),
        formatCell(fields.has_real_process),
      ]],
    },
    {
      range: `Prospects!AK${rowNum}:AL${rowNum}`,
      values: [[
        formatCell(fields.wish_verbatim),
        formatCell(fields.wish_category),
      ]],
    },
    {
      range: `Prospects!BA${rowNum}:BD${rowNum}`,
      values: [[
        formatCell(fields.quote_of_call),
        formatCell(fields.fit_rating),
        formatCell(fields.energy_rating),
        formatCell(fields.notes_next),
      ]],
    },
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
}

async function dropProcessedMarker(drive, folderId) {
  await drive.files.create({
    requestBody: {
      name: PROCESSED_MARKER,
      parents: [folderId],
      mimeType: 'text/plain',
    },
    media: {
      mimeType: 'text/plain',
      body: `Processed ${new Date().toISOString()}`,
    },
    fields: 'id',
    supportsAllDrives: true,
  });
}

/**
 * Process a single prospect folder if it has an unprocessed transcript.
 * Returns: { status: 'skipped'|'processed'|'failed', folderName, reason?, error? }
 */
async function processFolder({ drive, sheets, folder }) {
  const folderName = folder.name;
  const prospectId = extractProspectIdFromFolderName(folderName);
  if (!prospectId) {
    return { status: 'skipped', folderName, reason: 'no prospect ID prefix' };
  }

  const files = await listFolderContents(drive, folder.id);
  const transcript = findTranscriptFile(files);
  if (!transcript) {
    return { status: 'skipped', folderName, reason: 'no unprocessed transcript' };
  }

  try {
    const transcriptText = await fetchTextFromDriveFile(drive, transcript);
    if (!transcriptText || transcriptText.length < 200) {
      throw new Error(`Transcript too short (${transcriptText?.length || 0} chars) — likely empty file`);
    }
    const companyBrief = await fetchCompanyBriefText(drive, files);
    const { companyName, prospectName } = extractCompanyAndProspect(folderName);

    const fields = await extractFieldsWithClaude({
      transcript: transcriptText,
      companyBrief,
      companyName,
      prospectName,
    });

    const spreadsheetId = process.env.GOOGLE_SHEETS_TRACKER_ID;
    const rowNum = await findRowByProspectId(sheets, spreadsheetId, prospectId);
    if (!rowNum) {
      throw new Error(`No row found in Prospects tab for ${prospectId}`);
    }

    await updateProspectRow({
      sheets,
      spreadsheetId,
      rowNum,
      fields,
      transcriptUrl: transcript.webViewLink,
    });

    await dropProcessedMarker(drive, folder.id);

    return { status: 'processed', folderName, prospectId, rowNum };
  } catch (err) {
    return { status: 'failed', folderName, error: err.message };
  }
}

module.exports = {
  getGoogleClients,
  listProspectFolders,
  processFolder,
};
