// netlify/functions/diagnostic-agent/lib-google-sheets.js
// Appends a new row to the BidIntell Diagnostic Tracker spreadsheet
// (Prospects tab) when a new diagnostic is booked.

const { google } = require('googleapis');

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Map booking + research fields to the Prospects tab columns.
 *
 * IMPORTANT: This array must match the column order in the Prospects tab.
 * If you change the tracker sheet structure, update this map.
 *
 * Empty strings for fields that get filled in post-call (memo date, follow-up
 * date, conversion fields, etc).
 */
function buildRow({
  prospectId,
  firstName,
  lastName,
  companyName,
  role,
  trade,
  revenueBand,
  geography,
  linkedinUrl,
  email,
  phone,
  source,
  sourceDetail,
  dateBooked,
  dateOfCall,
  intakeAnswer,
  fitRead,
  driveFolderUrl,
}) {
  // Order MUST match Prospects tab column order. See file 07 of playbook.
  return [
    prospectId,                  // A: Prospect ID
    firstName || '',             // B: First Name
    lastName || '',              // C: Last Name
    companyName || '',           // D: Company
    role || '',                  // E: Role
    trade || '',                 // F: Trade
    revenueBand || '',           // G: Revenue Band
    geography || '',             // H: Geography
    linkedinUrl || '',           // I: LinkedIn URL
    email || '',                 // J: Email
    phone || '',                 // K: Phone
    source || 'Inbound /diagnostic page', // L: Source
    sourceDetail || '',          // M: Source detail
    dateBooked || '',            // N: Date booked
    dateOfCall || '',            // O: Date of call
    '',                          // P: Call duration (min) — filled after call
    driveFolderUrl || '',        // Q: Granola transcript link — repurposed for folder URL initially
    intakeAnswer || '',          // R: Intake Q4 answer
    'No',                        // S: No-show?
    // Q1-5 columns — left blank until post-call fill-in
    '', '', '', '', '',          // T-X: Wins fields
    '', '', '', '',              // Y-AB: Losses
    '', '', '', '',              // AC-AF: Regrets
    '', '', '', '',              // AG-AJ: Decision process
    '', '',                      // AK-AL: The Wish
    // Memo / follow-up / conversion — all blank initially
    '', '', '', '', '',          // AM-AQ: Memo
    '', '', '', '',              // AR-AU: Follow-up
    '', '', '', '', '',          // AV-AZ: Conversion
    // Qualitative
    '',                          // BA: Quote of the call
    fitRead || 'Mid',            // BB: Fit rating
    '',                          // BC: Energy rating
    `Drive folder: ${driveFolderUrl}`, // BD: Notes
  ];
}

/**
 * Append the booking row to the Prospects tab.
 * Returns the row range that was appended (e.g. 'Prospects!A47:BD47').
 */
async function appendProspectRow(rowData) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_TRACKER_ID;

  const row = buildRow(rowData);

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Prospects!A:BD',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  return {
    success: true,
    updatedRange: res.data.updates?.updatedRange,
  };
}

module.exports = {
  appendProspectRow,
};
