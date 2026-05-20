// netlify/functions/process-transcripts-background.js
// Scheduled background function: hourly poll of every prospect folder in the
// diagnostic Shared Drive. For any folder with an unprocessed transcript,
// extract structured Q1-5 + memo fields via Claude and update the matching
// row in the Prospects tab of the tracker sheet.
//
// Idempotency: a `.processed` marker file is dropped in the folder after
// successful update so subsequent runs skip it.
//
// Background function (15-min ceiling) so we can process multiple folders
// without hitting the 60s sync cap. Per-folder failures don't block siblings.

const {
  getGoogleClients,
  listProspectFolders,
  processFolder,
} = require('./diagnostic-agent/lib-transcript-processor');

exports.handler = async (event) => {
  // GET → manual trigger (visit URL to kick off a run on demand)
  // Scheduled → no event.httpMethod, runs from netlify.toml cron entry

  const isManual = event && event.httpMethod === 'GET';
  console.log(`process-transcripts-background starting (${isManual ? 'manual' : 'scheduled'})`);

  let drive, sheets;
  try {
    ({ drive, sheets } = getGoogleClients());
  } catch (err) {
    console.error('Google auth failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'auth failed', message: err.message }) };
  }

  let folders;
  try {
    folders = await listProspectFolders(drive);
  } catch (err) {
    console.error('Failed to list prospect folders:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'list folders failed', message: err.message }) };
  }

  console.log(`Found ${folders.length} prospect folders to scan`);

  const results = [];
  for (const folder of folders) {
    try {
      const result = await processFolder({ drive, sheets, folder });
      results.push(result);
      if (result.status === 'processed') {
        console.log(`Processed ${result.folderName} → row ${result.rowNum}`);
      } else if (result.status === 'failed') {
        console.warn(`Failed ${result.folderName}: ${result.error}`);
      }
    } catch (err) {
      console.error(`Unexpected error processing ${folder.name}:`, err);
      results.push({ status: 'failed', folderName: folder.name, error: err.message });
    }
  }

  const summary = {
    total: results.length,
    processed: results.filter((r) => r.status === 'processed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };

  console.log('Run summary:', summary);

  return {
    statusCode: 200,
    body: JSON.stringify({ summary, results }, null, 2),
  };
};
