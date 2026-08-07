/**
 * BidIntell Extension — background.js (MV3 service worker)
 *
 * WHAT THIS DOES
 * Watches the browser's own Downloads activity (chrome.downloads), notices when
 * something that looks like a bid package lands, and offers to send it to
 * BidIntell for a BidIndex score.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It never reads page content on BuildingConnected, PlanHub or ConstructConnect
 * — no host permission is requested for any of them. Everything here runs off
 * metadata chrome.downloads already exposes for any completed download, the
 * same way Chrome's own download history does. It never re-fetches anything
 * from a plan room's servers; only files the user's own click already pulled to
 * their machine are considered.
 *
 * A REAL BROWSER CONSTRAINT — this is not zero-click
 * An extension cannot read a file's bytes from disk just because a download
 * finished; that's browser sandboxing, regardless of permissions. So the flow
 * is: detect (automatic) -> notify (automatic) -> user clicks the notification
 * -> user selects the files in the picker and clicks Send. Two clicks, no
 * typing, no second login.
 *
 * ── MV3 STATE RULE (the reason this file looks the way it does) ──────────────
 * A service worker is terminated after ~30s idle and ALL module-level state
 * dies with it. An in-memory bundle array plus a setTimeout debounce — the
 * obvious implementation — silently stops working the moment Chrome unloads the
 * worker, which is most of the time. So:
 *   • the pending bundle lives in chrome.storage.local, never in a variable
 *   • the debounce is a chrome.alarms alarm, never setTimeout
 * chrome.alarms has a 30-second floor, hence DEBOUNCE_MINUTES below.
 */

// PDFs only. The scoring pipeline reads PDFs (via Claude's document API) and
// nothing else, so detecting .dwg/.zip would notify about files we'd then have
// to refuse. Better to stay quiet than to promise a score we can't produce.
const BID_FILENAME_HINTS = [
  'bid', 'itb', 'rfp', 'rfq', 'addend', 'spec', 'drawing',
  'plan', 'proposal', 'invitation', 'scope', 'package'
];

// Known plan-room / bid-distribution domains. Used ONLY to raise confidence
// that a download is bid-related — we request no permission for these; the
// downloads API reports the referrer of any completed download already.
const KNOWN_SOURCE_HOSTS = [
  'buildingconnected.com',
  'planhub.com',
  'constructconnect.com',
  'dodge.construction',
  'isqft.com',
  'procore.com',
  'smartbidnet.com',
  'pipelinesuite.com'
];

const BUNDLE_WINDOW_MS = 5 * 60 * 1000; // files landing this close together = one package
const DEBOUNCE_MINUTES = 0.5;           // chrome.alarms minimum; ~30s after the last file
const FLUSH_ALARM = 'bidintell-flush-bundle';
const BUNDLE_KEY = 'pendingBundle';

const storageGet = (keys) => new Promise((r) => chrome.storage.local.get(keys, r));
const storageSet = (obj) => new Promise((r) => chrome.storage.local.set(obj, r));

function hostnameOf(urlString) {
  try {
    return new URL(urlString).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function looksLikeBidFile(downloadItem) {
  const filename = (downloadItem.filename || '').toLowerCase();
  if (!filename.endsWith('.pdf')) return false;

  const host = hostnameOf(downloadItem.referrer || downloadItem.url || '');
  if (KNOWN_SOURCE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;

  // Filename itself says "bid"/"spec"/… — covers email links, Dropbox, etc.
  return BID_FILENAME_HINTS.some((hint) => filename.includes(hint));
}

function shortFilename(fullPath) {
  const parts = String(fullPath).split(/[\\/]/);
  return parts[parts.length - 1];
}

async function openReviewTab(files) {
  await storageSet({ pendingReview: files });
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?review=1') });
}

async function flushBundle() {
  const data = await storageGet([BUNDLE_KEY]);
  const bundle = data[BUNDLE_KEY] || [];
  if (bundle.length === 0) return;

  await storageSet({ [BUNDLE_KEY]: [] });

  const fileList = bundle.map((f) => f.name);
  const notifId = `bidintell-bundle-${Date.now()}`;

  // Store the filenames against the notification id: the worker that handles
  // the click is very likely a different one from the worker that created it.
  await storageSet({ [notifId]: fileList });

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: bundle.length === 1
      ? 'Looks like a bid document'
      : `Looks like a bid package (${bundle.length} files)`,
    message: 'Click to review and send to BidIntell for a score.',
    buttons: [{ title: 'Review & Send' }, { title: 'Ignore' }],
    priority: 2
  });
}

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state || delta.state.current !== 'complete') return;

  chrome.downloads.search({ id: delta.id }, async (results) => {
    const item = results && results[0];
    if (!item || !looksLikeBidFile(item)) return;

    // Only bundle for users who have actually connected — otherwise we'd nag
    // people who installed the extension and never signed in.
    const { bidintellToken } = await storageGet(['bidintellToken']);
    if (!bidintellToken) return;

    const now = Date.now();
    const data = await storageGet([BUNDLE_KEY]);
    const bundle = (data[BUNDLE_KEY] || []).filter((f) => now - f.detectedAt < BUNDLE_WINDOW_MS);

    bundle.push({
      name: shortFilename(item.filename),
      detectedAt: now,
      sourceHost: hostnameOf(item.referrer || item.url || '')
    });

    await storageSet({ [BUNDLE_KEY]: bundle });
    // Re-creating an alarm with the same name replaces it — that's the debounce.
    chrome.alarms.create(FLUSH_ALARM, { delayInMinutes: DEBOUNCE_MINUTES });
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) flushBundle();
});

async function handleNotificationOpen(notifId) {
  const data = await storageGet([notifId]);
  await openReviewTab(data[notifId] || []);
  chrome.notifications.clear(notifId);
  chrome.storage.local.remove(notifId);
}

chrome.notifications.onClicked.addListener(handleNotificationOpen);

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (buttonIndex === 0) {
    handleNotificationOpen(notifId);
    return;
  }
  chrome.notifications.clear(notifId);
  chrome.storage.local.remove(notifId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'STORE_EXTENSION_TOKEN' && message.token) {
    // Only the connect page may hand us a token. sender.origin is set by Chrome
    // and cannot be spoofed by page script, unlike anything inside the message.
    const origin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
    if (origin !== 'https://bidintell.ai' && origin !== 'https://www.bidintell.ai') {
      sendResponse({ ok: false, error: 'untrusted origin' });
      return false;
    }
    chrome.storage.local.set(
      { bidintellToken: message.token, connectedAt: Date.now() },
      () => sendResponse({ ok: true })
    );
    return true; // keep the channel open for the async response
  }
  return false;
});
