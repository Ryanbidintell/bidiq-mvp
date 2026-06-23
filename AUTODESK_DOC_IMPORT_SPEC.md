# "Import from Autodesk" — Document-Pull Integration Build Spec

**Status: SPEC (gated on ADN access). Created Jun 23 2026 after the Autodesk call where Jeremy confirmed the path.**
Pairs with: `AUTODESK_AECO_PARTNER_KIT.md`, memory `bidintell-autodesk-partnership` / `bidintell-bc-roadmap`.

## Goal
A subcontractor clicks **"Import from Autodesk"** → BidIntell pulls the bid's drawings/specs from BuildingConnected/Autodesk Docs → runs them through the existing scoring pipeline → saves a fully-scored bid. Removes the separate-login friction beta users flagged. This is the *real* product (document-based score), vs. metadata-only.

## Strategic context
This is the lead-platform build. The path was **confirmed by Jeremy on the Jun 23 call**: APS app w/ Forma Data Management + Forma Build entitlements, 3-legged OAuth (user's own file permission), published to the Autodesk App Gallery. Reference: https://aps.autodesk.com/en/docs/data/v2/tutorials/download-file/

---

## Prerequisites / GATE (none of the build runs without these)
- **ADN membership** → developer accounts + **BuildingConnected sandbox/alpha** + API support. (Jeremy sending discount/partner code + approval.) **Critical path — nothing testable until this lands.**
- **APS app** with entitlements for **Forma Data Management + Forma Build**. (May be the existing "BidIntell.ai" app + added entitlements, or a new app — see partner-kit caveat about not blind-swapping prod creds.)
- **OAuth:** 3-legged. Scope **`data:read`** (read-only doc pull — we don't need `data:create`/`data:write`; those are for upload) **plus the existing BuildingConnected scopes.**
- **App Gallery listing** (consent screen + assets + Autodesk review) before customers can self-serve the tile.

---

## Architecture — reuses the existing BC integration
```
[Import from Autodesk]  (app.html, new button)
        │  3LO consent (data:read + BC scopes) — REUSE bc-oauth-start/callback.js
        ▼
BC: opportunity → bid-package → currentAccDocsFolderId  (the Forma Docs folder URN)
        │   REUSE bc-sync.js token refresh + BC API client
        │   ⚠️ Jeremy: the bid-package endpoint MAY surface the doc refs directly (could skip hub/project discovery)
        ▼
Data Management (NEW code):
   GET /data/v1/projects/:project_id/folders/:folder_id/contents   → list files
   → filter to drawings/specs (PDFs)
   → GET .../items/:item_id/versions                                → version
   → GET /oss/v2/buckets/:bucket/objects/:object/signeds3download   → signed S3 URL
   → GET <signed_url>                                               → file bytes
        │
        ▼
analyze.js  (EXISTING deep-scoring pipeline) → BidIndex + contract flags
        ▼
Save as a scored project  (EXISTING projects flow)
```
Standard Data Management traversal also includes `GET /project/v1/hubs` → `/hubs/:id/projects` to discover the project/folder; **for a sub, the GC-shared folder may be reachable directly via `currentAccDocsFolderId` instead** (see Open Question 1 — must confirm in sandbox).

## Reuse map — what exists vs what's new
| Need | Status |
|---|---|
| 3-legged OAuth + token refresh | ✅ EXISTS — `bc-oauth-start.js`, `bc-oauth-callback.js`, `refreshAccessToken()` in `bc-sync.js` |
| BC opportunities/bid-package fetch | ✅ EXISTS — `bc-sync.js` (extend to read `currentAccDocsFolderId`) |
| Deep document scoring | ✅ EXISTS — `analyze.js` (PDF → BidIndex + contract flags) |
| Save scored project | ✅ EXISTS — projects insert flow |
| **Data Management folder→file download** | 🆕 NEW — the core new code (steps above) |
| **"Import from Autodesk" button + folder/PDF picker** | 🆕 NEW — app.html UI |
| **Async pipeline for large drawing sets** | 🆕 NEW — queue download+score (APS rate limits) |
| **App Gallery listing** | 🆕 NEW — consent screen, assets, review |

---

## Build phases
- **Phase 0 — Access (gated on ADN):** join ADN, provision APS app w/ Forma DM + Forma Build entitlements + scopes, get sandbox.
- **Phase 1 — Sandbox validation (DO FIRST, answers the open questions):** prove the doc-pull works end-to-end in the BC sandbox for a *sub-context* token; resolve every Open Question below before building UI.
- **Phase 2 — Doc-pull service:** new Netlify function (e.g. `bc-doc-import.js`) doing the Data Management traversal + signed-URL download, reusing `bc-sync.js` token logic.
- **Phase 3 — Wire to scoring:** feed pulled PDFs into `analyze.js`; save scored project.
- **Phase 4 — UI + async + observability:** "Import from Autodesk" button; async queue for big sets; `sendAlert()` on failures (existing alert.js).
- **Phase 5 — App Gallery:** listing, consent screen, assets, Autodesk review → launch.

## Non-functional
- **Async:** large plan sets + APS rate limits → queue downloads, score in background, surface results (don't block the click).
- **Errors:** wrap each step; `sendAlert()` (alert.js) on failures; never silent.
- **Security:** never log tokens/signed URLs; 3LO only sees what the user can see.

---

## ★ Open questions — MUST resolve in the sandbox (Phase 1) before building
1. **Sub-side folder access (the crux):** does a Bid Board Pro sub's 3LO token resolve the GC-shared bid folder — via the standard hub/project traversal, OR directly via `currentAccDocsFolderId`? (The shared docs likely aren't under the sub's own hubs.) This determines the whole traversal.
2. **Forma DM subscription:** does the *customer* need a separate Forma Data Management subscription, or does Bid Board Pro + the app's entitlements + 3LO file permission suffice? (Jeremy's framing suggests entitlements+permission; confirm — it's the adoption-cost question.)
3. **Bid-package endpoint:** does it surface the doc references directly (skip steps 1-2 of the download flow)? Jeremy hinted yes.
4. **Exact scopes/entitlements:** is `data:read` enough? What exactly do the Forma DM + Forma Build entitlements gate?
5. **App Gallery requirements:** consent-screen scopes, security review, marketing assets, timeline.

(Escalation to BC product managers available via Jeremy if support can't answer.)

## Acceptance criteria (v1)
- A sub connects via 3LO, clicks "Import from Autodesk" on a bid, and BidIntell pulls the actual drawings/specs and returns a document-based BidIndex + contract flags — no manual upload, no separate login.
- Works in the sandbox first; then for a real Bid Board Pro customer.
- Listed in the Autodesk App Gallery as a connectable tile.
