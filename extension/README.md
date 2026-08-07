# BidIntell Chrome Extension — Downloads-Based Bid Sender

A Manifest V3 extension that watches the browser's own Downloads activity,
notices when something that looks like a bid package lands, and lets the user
send it to BidIntell for a BidIndex score in two clicks — no second login.

## How it fits the existing system

**It adds no scoring code.** The extension posts the PDFs to the Supabase edge
function `inbound-email` — the same function that already handles email
forwards — using a per-user token instead of an email alias. That function does
extraction, contract-risk detection, BidIndex v2 scoring, the project save,
merge detection and the report email. One implementation, so an extension bid
and a forwarded bid cannot drift apart.

```
extension  ──POST JSON (base64 PDFs) + Bearer bix_…──┐
                                                     ├─► supabase/functions/inbound-email
SendGrid   ──POST multipart (email forward)──────────┘        (unchanged pipeline)
```

The edge function resolves the token to the user's `email_alias` and synthesises
the `To:` address the rest of `processEmail()` already expects. The only marker
downstream is `sourceLabel`, stamped as `chrome_extension` into
`scores.source`, `extracted_data.source` and `company_context.source`.

PDFs are sent as base64 rather than text-extracted in the browser, because the
pipeline hands the PDF to Claude's document API, which reads tables, sheet
titles and layout that a plain text dump loses.

## Why not the other designs

1. **A badge/overlay reading bid pages on BuildingConnected / PlanHub /
   ConstructConnect** — ruled out. All three prohibit automated reading of page
   content, and BuildingConnected sits under Autodesk, whose AECO Technology
   Partner relationship isn't worth risking.
2. **A desktop agent watching the filesystem** — disproportionate build cost
   (cross-platform packaging, signing, auto-update) for what an extension does.

This build only touches (a) metadata `chrome.downloads` already exposes for any
completed download, and (b) files the user explicitly picks. It requests no host
permission for any plan room and never re-fetches from their servers.

## The honest caveat: not zero-click

Chrome cannot read a downloaded file's bytes just because the download finished
— browser sandboxing, regardless of permissions. So:

1. **Automatic:** detect the download pattern.
2. **Automatic:** show a notification.
3. **One click:** user clicks it; a review tab opens listing the detected filenames.
4. **One click:** user selects those files (usually one select-all, since they
   just landed together) and clicks Send.

Two clicks, no typing, no second login. The alternative — re-fetching the
original download URL from the extension — reopens the automated-access question
this design exists to avoid, so it isn't built.

## MV3 constraint that shaped background.js

A service worker is killed after ~30s idle and **all module-level state dies with
it**. The obvious implementation (an in-memory bundle array + `setTimeout`
debounce) silently stops working most of the time. So the pending bundle lives
in `chrome.storage.local` and the debounce is a `chrome.alarms` alarm.
`chrome.alarms` has a 30-second floor, which is why the debounce is 30s and not 20s.

## Limits (enforced client- and server-side)

| Limit | Value | Why |
|---|---|---|
| Files per send | 3 | `MAX_ATTACHMENTS` in the edge function. The UI refuses extras out loud rather than letting the server drop them silently. |
| Per file | 10 MB | Server refuses >25 MB; this leaves headroom. |
| Total per send | 20 MB | Base64 inflates ~33% on the wire. |
| Uploads per user | 20/hour | Best-effort, in-memory per edge instance. Bounds a stuck retry loop, not a distributed attack. |
| File type | PDF only | The pipeline reads PDFs and nothing else. Detection is PDF-only too, so we never notify about a file we'd have to refuse. |

## Deploy checklist

1. **Migration** — apply `supabase/migrations/20260807_extension_tokens.sql` via
   the Supabase MCP `apply_migration` tool or the SQL Editor.
   **Not** `supabase db push` (see CLAUDE.md).
2. **Edge function** — `supabase functions deploy inbound-email`.
   This deploys separately from Netlify; a Netlify deploy alone won't ship it.
3. **Netlify** — `extension-token.js` and `extension-connect.html` ship with the
   normal site deploy. No new env vars and no new npm dependencies.
4. **Extension** — `chrome://extensions` → Developer Mode → Load unpacked → this
   folder.

## Testing locally

1. Load the extension unpacked.
2. Visit `bidintell.ai/extension-connect` while logged in → **Connect extension**
   → should land on "Connected."
3. Download two PDFs with "spec" or "addendum" in the name (or any PDF from a
   `buildingconnected.com` / `planhub.com` URL).
4. Wait ~30s → notification appears → click it → select those PDFs → Send.
5. Expect a 202, then a scored report by email within a minute or two, and a new
   row in `projects` with `extracted_data.source = 'chrome_extension'`.

If nothing happens at step 3, check that you're connected — detection is skipped
entirely when no token is stored, so the extension doesn't nag people who
installed it and never signed in.

## Known gaps

- **Icons are placeholders.** Swap for real brand assets before publishing.
- **`auth.html` has no `?next=` support**, so a signed-out user must navigate
  back to `/extension-connect` manually after signing in. The page says so
  rather than pretending it will redirect.
- **The `downloads` permission sees metadata for every download on every site.**
  That is what makes detection work without touching plan-room pages, but Chrome
  Web Store review will ask for justification, and it needs to be stated plainly
  in the listing and privacy policy.
- **Not yet tested against a real bid package end-to-end.** Nothing here has
  been through a live browser.
