// netlify/functions/diagnostic-agent/lib-google-drive.js
// Creates per-prospect folders and writes prep artifacts as Google Docs.
// Uses service account auth via base64-encoded JSON in env.

const { google } = require('googleapis');

function getGoogleCredentials() {
  return {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
}

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getGoogleCredentials(),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Generate next prospect ID — P001, P002...
 * Reads existing folder names in the Prospects parent and increments.
 * For high-volume use this should query the tracker sheet instead, but for
 * 5/week throughput, a folder count works fine.
 */
async function getNextProspectId(drive) {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(name)',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = res.data.files || [];
  const ids = existing
    .map((f) => {
      const m = f.name.match(/^P(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const nextNum = ids.length === 0 ? 1 : Math.max(...ids) + 1;
  return `P${String(nextNum).padStart(3, '0')}`;
}

/**
 * Sanitize text for use in a folder name. Drive allows most chars but we
 * keep it tidy: no slashes, no leading/trailing whitespace, single spaces.
 */
function sanitizeForFolderName(s) {
  return (s || '')
    .replace(/[\\/]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

/**
 * Look for an existing folder for this prospect (idempotency).
 * Calendly may retry webhooks; we don't want duplicate folders.
 * Match heuristic: folder name contains both the company short-name and
 * the prospect short-name. False positives are unlikely at our throughput.
 */
async function findExistingProspectFolder(drive, { prospectName, companyName }) {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  // Search by partial name match — pull up to 50 recent folders
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name,webViewLink,createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const compShort = (companyName || '').split(/\s+/).slice(0, 2).join(' ').toLowerCase();
  const nameShort = (prospectName || '').toLowerCase();

  for (const f of res.data.files || []) {
    const n = (f.name || '').toLowerCase();
    if (compShort && nameShort && n.includes(compShort) && n.includes(nameShort.split(' ')[0])) {
      const idMatch = f.name.match(/^P(\d+)/);
      return {
        folderId: f.id,
        folderUrl: f.webViewLink,
        prospectId: idMatch ? `P${idMatch[1]}` : 'P---',
        existing: true,
      };
    }
  }
  return null;
}

/**
 * Create a new folder for a prospect under the parent Prospects folder.
 * If a matching folder already exists (idempotency for retried webhooks),
 * returns the existing one instead of creating a duplicate.
 * Returns: { folderId, folderUrl, prospectId, existing }.
 */
async function createProspectFolder({ prospectName, companyName }) {
  const drive = getDriveClient();
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

  // Idempotency check
  const existing = await findExistingProspectFolder(drive, { prospectName, companyName });
  if (existing) {
    console.log(`Found existing folder for ${companyName} / ${prospectName}: ${existing.folderId}`);
    return existing;
  }

  const prospectId = await getNextProspectId(drive);
  const safeName = sanitizeForFolderName(`${prospectId}_${companyName}_${prospectName}`);

  const folder = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id,webViewLink',
    supportsAllDrives: true,
  });

  return {
    folderId: folder.data.id,
    folderUrl: folder.data.webViewLink,
    prospectId,
    existing: false,
  };
}

/**
 * Write a markdown string to Drive as a Google Doc inside the prospect folder.
 * Drive auto-converts uploaded text/markdown to Google Doc format if requested
 * via mimeType. We use text/markdown upload + targetMimeType conversion.
 */
async function writeMarkdownAsDoc({ folderId, fileName, markdown }) {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/vnd.google-apps.document', // converts on upload
    },
    media: {
      mimeType: 'text/markdown',
      body: markdown,
    },
    fields: 'id,webViewLink',
    supportsAllDrives: true,
  });

  return {
    fileId: res.data.id,
    fileUrl: res.data.webViewLink,
  };
}

/**
 * Convenience: write a plain text file (no Doc conversion).
 * Used for transcripts and raw intake captures.
 */
async function writePlainText({ folderId, fileName, text, mimeType = 'text/plain' }) {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: text,
    },
    fields: 'id,webViewLink',
    supportsAllDrives: true,
  });

  return {
    fileId: res.data.id,
    fileUrl: res.data.webViewLink,
  };
}

module.exports = {
  createProspectFolder,
  findExistingProspectFolder,
  writeMarkdownAsDoc,
  writePlainText,
};
