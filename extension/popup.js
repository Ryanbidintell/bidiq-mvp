/**
 * BidIntell extension — popup / review-and-send UI.
 *
 * Files go straight to the Supabase edge function that already handles email
 * forwards. That function does the extraction, contract-risk detection,
 * BidIndex v2 scoring, project save and report email — so an extension bid and
 * a forwarded bid run through exactly one implementation and cannot drift
 * apart. Nothing is scored here, and no scoring logic is duplicated.
 *
 * PDFs are sent as base64 rather than being text-extracted locally: the
 * pipeline hands the PDF to Claude's document API, which reads tables, sheet
 * titles and layout that a plain text dump loses.
 */

const BACKEND_BASE = 'https://bidintell.ai';
const CONNECT_URL = `${BACKEND_BASE}/extension-connect`;
const TOKEN_ENDPOINT = `${BACKEND_BASE}/.netlify/functions/extension-token`;
const UPLOAD_ENDPOINT = 'https://szifhqmrddmdkgschkkw.supabase.co/functions/v1/inbound-email';

// Mirrors the server: MAX_ATTACHMENTS = 3 in the edge function. Enforced here
// too so extra files are refused out loud instead of being silently dropped
// server-side and quietly missing from the score.
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;   // per file
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;  // base64 inflates ~33% on the wire

const params = new URLSearchParams(location.search);
const isReview = params.get('review') === '1';

const el = (id) => document.getElementById(id);
const storageGet = (keys) => new Promise((r) => chrome.storage.local.get(keys, r));

function showSection(id) {
  ['stateDisconnected', 'stateConnectedIdle', 'stateReview'].forEach((s) => {
    el(s).classList.toggle('hidden', s !== id);
  });
}

async function getToken() {
  const data = await storageGet(['bidintellToken']);
  return data.bidintellToken || null;
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** ArrayBuffer -> base64, chunked. btoa on a 10MB string blows the call stack
 *  if you spread it into String.fromCharCode in one go. */
function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ---------- Connect / disconnect ----------

el('connectBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: CONNECT_URL });
});

el('sendNowBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?review=1') });
});

el('disconnectBtn').addEventListener('click', async () => {
  const token = await getToken();

  // Revoke server-side as well as locally. Clearing only local storage would
  // leave a live token in the database forever.
  if (token) {
    try {
      await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'revoke' })
      });
    } catch (e) {
      console.warn('Server-side revoke failed; clearing locally anyway:', e);
    }
  }

  chrome.storage.local.remove(['bidintellToken', 'connectedAt'], () => {
    showSection('stateDisconnected');
  });
});

// ---------- Review & send ----------

let selectedFiles = [];

function validateSelection(files) {
  const problems = [];
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');

  if (pdfs.length < files.length) {
    problems.push(`${files.length - pdfs.length} non-PDF file(s) ignored — only PDFs can be read.`);
  }

  let kept = pdfs;
  if (kept.length > MAX_FILES) {
    problems.push(`Only the first ${MAX_FILES} PDFs are scored; the rest were dropped.`);
    kept = kept.slice(0, MAX_FILES);
  }

  const oversize = kept.filter((f) => f.size > MAX_FILE_BYTES);
  if (oversize.length) {
    problems.push(`Too large (${formatMB(MAX_FILE_BYTES)} max each): ${oversize.map((f) => f.name).join(', ')}`);
    kept = kept.filter((f) => f.size <= MAX_FILE_BYTES);
  }

  const total = kept.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    problems.push(`Total is ${formatMB(total)} — the limit is ${formatMB(MAX_TOTAL_BYTES)}. Send the key documents first.`);
    kept = [];
  }

  return { kept, problems };
}

async function loadReviewMode() {
  const data = await storageGet(['pendingReview']);
  const detected = data.pendingReview || [];

  const list = el('detectedList');
  if (detected.length === 0) {
    el('detectedWrap').classList.add('hidden');
  } else {
    detected.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name; // textContent, not innerHTML — filenames are untrusted
      list.appendChild(li);
    });
  }

  const fileInput = el('fileInput');
  const dropZone = el('dropZone');
  const dropZoneLabel = el('dropZoneLabel');
  const selectedSummary = el('selectedSummary');
  const limitNote = el('limitNote');
  const sendBtn = el('sendBtn');
  const sendStatus = el('sendStatus');

  function updateSelection(fileList) {
    const { kept, problems } = validateSelection(Array.from(fileList));
    selectedFiles = kept;

    limitNote.textContent = problems.join(' ');
    limitNote.classList.toggle('hidden', problems.length === 0);

    if (kept.length > 0) {
      const total = kept.reduce((s, f) => s + f.size, 0);
      dropZoneLabel.textContent = `${kept.length} file${kept.length === 1 ? '' : 's'} selected (${formatMB(total)})`;
      selectedSummary.textContent = kept.map((f) => f.name).join(', ');
      selectedSummary.classList.remove('hidden');
      sendBtn.disabled = false;
    } else {
      dropZoneLabel.textContent = 'Click to select files, or drag them here';
      selectedSummary.classList.add('hidden');
      sendBtn.disabled = true;
    }
  }

  fileInput.addEventListener('change', (e) => updateSelection(e.target.files));

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) updateSelection(e.dataTransfer.files);
  });

  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    sendStatus.className = 'status-line';
    sendStatus.textContent = 'Reading files…';

    try {
      const token = await getToken();
      if (!token) throw new Error('Not connected. Open the extension and connect your account.');

      const attachments = [];
      for (const file of selectedFiles) {
        attachments.push({
          Name: file.name,
          ContentType: 'application/pdf',
          Content: toBase64(await file.arrayBuffer())
        });
      }

      sendStatus.textContent = 'Uploading…';

      const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          Subject: selectedFiles.map((f) => f.name).join(', ').slice(0, 200),
          TextBody: 'Bid package sent from the BidIntell Chrome extension.',
          Attachments: attachments
        })
      });

      if (res.status === 401) {
        throw new Error('Your connection expired. Open the extension and reconnect.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      sendStatus.className = 'status-line ok';
      sendStatus.textContent = 'Sent. Your BidIndex report will be emailed in a minute or two.';
      chrome.storage.local.remove(['pendingReview']);
    } catch (err) {
      sendStatus.className = 'status-line error';
      sendStatus.textContent = err.message || 'Something went wrong sending this bundle.';
      sendBtn.disabled = false;
    }
  });
}

async function init() {
  const token = await getToken();

  if (isReview) {
    document.body.classList.add('review');
    if (!token) {
      showSection('stateDisconnected');
      return;
    }
    showSection('stateReview');
    await loadReviewMode();
    return;
  }

  showSection(token ? 'stateConnectedIdle' : 'stateDisconnected');
}

init();
