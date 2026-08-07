/**
 * Runs ONLY on https://bidintell.ai/extension-connect (see manifest "matches" —
 * scoped narrowly on purpose, not injected on every page).
 *
 * Contract with the page: once /extension-connect has a logged-in Supabase
 * session and has minted a token, it runs
 *
 *   window.postMessage(
 *     { source: 'bidintell-web', type: 'BIDINTELL_EXTENSION_TOKEN', token },
 *     window.location.origin
 *   );
 *
 * This script picks that up and hands it to the service worker. The user never
 * sees or copies a token — it's one click on the page.
 */

const TRUSTED_ORIGINS = ['https://bidintell.ai', 'https://www.bidintell.ai'];

window.addEventListener('message', (event) => {
  // event.source === window rules out iframes; the origin check rules out a
  // same-page frame on another host. Both are needed — neither alone is enough.
  if (event.source !== window) return;
  if (!TRUSTED_ORIGINS.includes(event.origin)) return;

  const data = event.data;
  if (!data || data.source !== 'bidintell-web') return;
  if (data.type !== 'BIDINTELL_EXTENSION_TOKEN' || !data.token) return;

  chrome.runtime.sendMessage(
    { type: 'STORE_EXTENSION_TOKEN', token: data.token },
    (response) => {
      // Tell the page whether it stuck, so it can show "Connected" without the
      // user having to switch tabs to find out.
      window.postMessage(
        {
          source: 'bidintell-extension',
          type: 'BIDINTELL_TOKEN_STORED',
          ok: !!(response && response.ok)
        },
        window.location.origin
      );
    }
  );
});

// Let the page know an extension is present at all, so it can show "Connect"
// instead of "Install the extension first".
window.postMessage(
  { source: 'bidintell-extension', type: 'BIDINTELL_EXTENSION_PRESENT' },
  window.location.origin
);
