# BidIntell Verification — 2026-06-29

**Session type:** Verification only. No code was changed, staged, or committed.
**Method:** Every claim below was checked against the actual source on disk, not against roadmaps, memory, or the build spec. File paths and line references are included so each finding can be re-checked.

---

# TASK A — Follow-Up Automation: does the AI read GC replies and assign them to the right project?

## Headline answer

**No.** The follow-up system is a well-built *outbound* drafting-and-sending pipeline with manual per-touch approval. There is **no inbound GC-reply ingestion, no AI interpretation of a GC's reply, and no project-assignment logic at all** — because nothing receives GC replies to follow-ups in the first place.

Critically: an inbound reply parser was **never in the build spec**. The spec (`BidIntell_FollowUp_Automation_Build_Spec_v1.md`) captures outcomes a different way — the *user* answers "Has the GC responded?" in the Approval Modal before each send (§2 step 6, §8). So the absence of reply-parsing is a design gap relative to the question asked, not a half-finished spec item.

---

## 1. Overall build status — which modules exist in code vs. only spec'd?

The Product Bible lists this as an unchecked 10-week build with OAuth pending. **In reality far more is built than "unchecked" implies** — the schema, OAuth scaffolding, drafting engine, send path, and full UI all exist on disk. Status per spec module:

| Spec module | File on disk | Status |
|---|---|---|
| §6 Schema (5 new tables + projects columns + 4 seeded templates) | `supabase/migrations/20260520_followup_automation.sql` | **Built** (idempotent, RLS + WITH CHECK, seeds Standard GC / Public Bid / Repeat Client / Aggressive). A second migration `20260520_followup_multi_gc.sql` extends it. |
| §7 `generate-followup-drafts.js` (daily draft cron) | `netlify/functions/generate-followup-drafts.js` | **Built** (has bugs — see §1 notes) |
| §7 `claude-draft-followup.js` (AI drafting + 7 Cialdini prompts) | `netlify/functions/oauth-shared/claude-draft-followup.js` | **Built** (real Claude call, model `claude-sonnet-4-6`, all 7 principle prompts + hard constraints present) |
| §7 `send-followup-email.js` (Gmail + M365 send) | `netlify/functions/send-followup-email.js` | **Built** (real Gmail/Graph API calls, 10/hr rate limit) |
| §7 `prompt-ghost-outcome.js` (daily ghost-nudge cron) | `netlify/functions/prompt-ghost-outcome.js` | **Built** (has a bug — see §1 notes) |
| §7 `cancel-followup-schedule.js` | *(no such file)* | **Built differently** — cancel logic lives inline in `app.html` as `cancelFollowupSchedule()` (line ~15847), not as a Netlify function |
| §7 Google + Microsoft OAuth callbacks | `google-oauth-start.js`, `google-oauth-callback.js`, `microsoft-oauth-start.js`, `microsoft-oauth-callback.js` | **Built** (present on disk; not deep-read this pass — see caveat) |
| §5 Token encryption / refresh helpers | `oauth-shared/token-crypto.js`, `oauth-shared/refresh-oauth-token.js` | **Built** (present; `getValidAccessToken` is imported and used by the send path) |
| §8 Full UI (Follow-Ups nav tab, Needs Review/Scheduled/History, Approval modal, template editor, onboarding modal, Email Integration settings) | `app.html` | **Built**, admin-gated (see §2) |
| Agent #3 outcome-triggered one-off follow-up | `netlify/functions/outcome-triggered-followup.js` | **Built** (this is the only "extra" beyond spec) |

**Spec'd but NOT built / not found:**
- Inbound GC-reply handler (was never spec'd, and does not exist — see §3–§5).
- `bid_submitted_at` is referenced as "already exists from outcome work" in the migration; the migration `ADD COLUMN IF NOT EXISTS` covers it.

**Bugs found while verifying (worth flagging even in a read-only pass):**
- **`generate-followup-drafts.js` and `prompt-ghost-outcome.js` both query a `users` table** (`.from('users').select('first_name, last_name, ...')` / `.select('email, first_name, last_name')`). **`SCHEMA.md` documents no public `users` table** — user data lives in `user_settings` (`user_name`, `user_email`). If no `users` table/view exists in prod, the draft cron silently produces null `userName`/`userFirstName`, and the ghost-prompt cron sends to `user?.email = undefined` → no email. *Could not run SQL to confirm the table's existence (read-only session), so flagged as a discrepancy, not a confirmed runtime failure.*
- **`generate-followup-drafts.js` reads `projects.name, address, project_type, project_size_sf, bid_score`** — none of these are columns on `projects` per `SCHEMA.md` (real data is in `extracted_data` jsonb and `scores` jsonb). The draft context would be largely null on the scheduled path. (By contrast `outcome-triggered-followup.js` reads `extracted_data` correctly.)

> Net: the scheduled/cadence path (`generate-followup-drafts` → `prompt-ghost-outcome`) has table/column mismatches that would degrade it; the **outcome-triggered path** (`outcome-triggered-followup.js`) reads the schema correctly and is the one actually wired into the UI today.

---

## 2. Outbound send — OAuth path working or stubbed? Where are emails sent? Admin-gated?

**Built, not stubbed.** `send-followup-email.js`:
- Authenticates the caller's JWT, enforces a 10-sends/hour in-memory rate limit, loads the `follow_up_touches` row (must be `awaiting_approval`), loads the active `user_email_integrations` row, and gets a fresh token via `getValidAccessToken()`.
- **Gmail:** builds an RFC-2822 message, base64url-encodes it, POSTs to `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` (real API).
- **Microsoft 365:** POSTs to `https://graph.microsoft.com/v1.0/me/sendMail` with `saveToSentItems: true` (real API).
- On success marks the touch `sent`, stamps `sent_at`, increments `total_sends`. On failure marks `failed` and stores a scrubbed `send_error`.

**Admin-gated?** The *UI to reach it* is admin-only:
- Follow-Ups nav item is `style="display:none"` and only revealed when `isAdmin()` (app.html ~21359-21367).
- `isAdmin()` = email in `['ryan@fsikc.com','ryan@bidintell.ai']` (app.html line 3346).
- Email Integration + Follow-Up Sequences settings cards are labeled **ADMIN PREVIEW** and hidden unless `isAdmin()` (app.html ~18351, 2371, 2380).
- **The `send-followup-email.js` endpoint itself is NOT admin-gated server-side** — any authenticated user with a valid `awaiting_approval` touch could call it. Today only admins can create touches through the UI, so it's effectively gated, but the gate is UI-only.

**Production-readiness caveat (cannot confirm from code):** the send code is complete, but live sending requires (a) a Google app that has passed restricted-scope (`gmail.send`) verification and/or a verified Microsoft publisher, and (b) a user who has actually completed the OAuth connect flow with rows in `user_email_integrations`. Neither can be confirmed by reading code. The spec flags Google verification as a 4–6 week critical-path item. **So: code path = built; "working in production" = unverifiable here.**

---

## 3. Inbound reply capture — what receives a GC reply?

**Nothing — for follow-up replies.** There is no live inbound handler that ingests a GC's reply to a follow-up email. The two inbound paths that *do* exist are for other purposes:

1. **`supabase/functions/inbound-email/index.ts`** — the live inbound handler (SendGrid Inbound Parse → `{slug}@bids.bidintell.ai`). It processes **bid invitations**: scores the bid and emails back a BidIndex score. Grep for `reply` in this file returns only its *own outbound* reply (the score email it sends via Resend, lines ~919-984). It does **not** match `In-Reply-To` / `References` / `Message-ID`, and does **not** interpret won/lost. Distinct from follow-up replies.

2. **`netlify/functions/prospect-reply.js`** — a **Postmark inbound webhook for cold-outreach marketing prospects**, not GCs. It matches the sender against `prospects.owner_email`, and if found sets `prospects.status = 'replied'` to stop the Apollo outreach sequence. No AI, no won/lost, no project assignment. Unrelated to bid follow-ups.

There is no MX/webhook route, no `From:`-of-the-user reply alias, and no function anywhere that listens for "the GC replied to my follow-up." **Inbound follow-up reply capture: not built.**

---

## 4. AI reply parsing — code that uses Claude to interpret a GC reply

**Absent.** No code uses Claude (or any model) to classify a GC reply as won / lost / still-deciding / declined / RFI.

- The only Claude call in the follow-up system is **outbound drafting** (`oauth-shared/claude-draft-followup.js` → `generateDraft()`), which *writes* emails. Its prompt (quoted below in spirit) instructs the model to ghostwrite a follow-up applying a Cialdini principle and return `{subject, body, reasoning}` JSON. It never receives or interprets an inbound message.
- Grepping all Netlify functions for reply-interpretation patterns (`In-Reply-To|References|Message-ID|parseReply|interpret reply|won|lost|RFI`) surfaces only: the outbound draft prompts, `prospect-reply.js` (marketing, no AI), and incidental matches. **No GC-reply parser exists.**

---

## 5. Project assignment (most important) — how does a reply get matched to a project?

**Not built — there is no reply to assign.** Because nothing ingests GC follow-up replies (§3) and nothing parses them (§4), there is no matching logic, no confidence threshold, and no no-match fallback.

Specifically:
- **No `Message-ID` / `In-Reply-To` / `References` header matching** anywhere in the codebase (reliable threading). The outbound send functions don't even *store* the provider's returned message ID, so no thread key is persisted that a future reply could be matched against.
- **No fuzzy subject/sender matching** for follow-up replies either.
- The only "reply→record" matching that exists is `prospect-reply.js` matching `FromFull.Email` against `prospects.owner_email` (case-insensitive, `maybeSingle()`) — and that's the marketing-prospect system, which assigns to a *prospect*, never to a *project*.

**State this directly: reply-to-project assignment logic is entirely missing.**

---

## 6. Outcome write-back — does it update `projects` outcome fields, and respect the no-overwrite rule?

There is **no reply-driven write-back** (consistent with §3–§5). Outcomes are written only by the **user**, through the existing `saveOutcome()` / submission-outcome flow in `app.html` — the same path documented in CLAUDE.md/SCHEMA.md (`outcome`, `outcome_data`, `outcome_confidence`, constraints `check_outcome_*`).

What the follow-up system *does* do at outcome time is **cancel remaining touches**, not write outcomes:
- `cancelFollowupSchedule(projectId, reason, gcName)` (app.html ~15847): finds `active` schedules for the project (optionally filtered to one GC), sets pending/awaiting touches to `cancelled`, and marks the schedule `status='completed'`, `cancelled_reason='outcome_logged'`. Errors are caught and non-fatal.
- Invoked from the outcome-save flow per submission (app.html ~16615-16620).
- Agent #3 (`outcome-triggered-followup.js`) then optionally drafts a one-off thank-you/re-engagement email — **admin-gated** and wrapped so it "can NEVER affect the outcome save" (app.html ~16625-16637).

**No-overwrite rule:** not directly exercised, because the only writer is the user via the guarded `saveOutcome()` path. There is no automated agent that could clobber a user-confirmed outcome — so the rule is respected by absence of any competing writer, not by an explicit guard in the follow-up code.

---

## 7. Failure modes

Because inbound parsing/assignment doesn't exist, the reply-side failure modes are **all unhandled by definition** (there's no code to handle them):

| Failure mode | Handled? |
|---|---|
| Ambiguous reply→project match | N/A — no matcher exists |
| No-match reply | N/A — no inbound handler exists |
| Reply to a deleted project | N/A — but note `follow_up_schedules.project_id` is `ON DELETE CASCADE`, so a deleted project would drop its schedules/touches |
| Multiple projects, same GC | **This is exactly why reliable header-based threading would be required — and it's absent.** A sender-only match (the only matching style present anywhere) could not disambiguate. |
| Auto-replies / OOO | N/A — nothing reads inbound follow-up mail |

Outbound-side failure handling *is* present and reasonable: send failures mark the touch `failed` with a scrubbed error; token-refresh failures mark the integration for reconnect; the draft cron isolates per-touch failures so one bad draft doesn't abort the batch; the ghost-prompt cron skips schedules that already have an outcome or still have pending touches.

---

## Tests run

**No follow-up or reply tests exist in `scripts/`.** The directory contains: `test-alert.js`, `test-csi-scope.js`, `test-bc-gate.js`, `test-roi-lead-insert.js`, `signup-e2e.js`, plus build/utility scripts — none exercise the follow-up or reply pipeline. There was nothing to run for this feature. (No end-to-end or unit coverage of drafting, send, cancel, or any reply path.)

---

## Task A summary

**Confirmed working end-to-end (code-complete, modulo external OAuth verification + a connected account):**
- Outbound: schema → schedule/touch creation → AI drafting (7 Cialdini prompts, real Claude call) → admin Approval UI → send via the user's own Gmail/M365 → mark sent. Plus outcome→cancel-remaining-touches and a daily ghost-prompt nudge. All admin-gated in the UI.

**Partially built / degraded:**
- The **scheduled cadence draft path** (`generate-followup-drafts.js`) and **ghost-prompt cron** read a non-existent `users` table and non-existent `projects` columns (`name`, `address`, `bid_score`, etc.) per SCHEMA.md — they'd run but with mostly-null context / undefined recipient. The **outcome-triggered path** reads the schema correctly and is the one actually wired into the live UI.
- Send endpoint is UI-gated to admins but not server-gated.

**Entirely missing:**
- Inbound GC-reply capture, AI reply interpretation (won/lost/deciding/declined/RFI), and reply→project assignment. No `Message-ID`/`In-Reply-To`/`References` threading is stored or matched anywhere. This was never in the spec — the spec captures outcomes via the user-answered "Has the GC responded?" prompt instead.

**Smallest next step to get a real GC reply correctly parsed and assigned:**
1. **Persist a thread key on send.** In `send-followup-email.js`, capture the provider's returned message id (Gmail `id`/`threadId`; Graph requires creating a draft then sending, or reading the sent message) and store it on the touch (new column, e.g. `sent_message_id` / `sent_thread_id`). Without this, reliable matching is impossible.
2. **Add an inbound route for replies** (a dedicated alias or SendGrid/Postmark inbound webhook the user's replies CC/route to), parsing the `In-Reply-To` / `References` headers.
3. **Match `In-Reply-To`/`References` against the stored `sent_message_id`** to resolve the exact touch → schedule → project (deterministic; solves the "multiple projects, same GC" problem that fuzzy matching can't).
4. **Then** classify the reply body with Claude (won/lost/deciding/declined/RFI) and either prompt the user or pre-fill the existing `saveOutcome()` flow — never auto-overwriting a user-confirmed outcome.

Step 1 is the true prerequisite and is a small, self-contained change; everything else depends on having a thread key to match on.

---

# TASK B — CSI Picker and Scope-Vagueness Scan: current state

## 1. The CSI picker (Settings)

**Location & behavior:** `renderCSIPicker(containerId, selectedSections, onChange)` (app.html line 18113). It is a reusable MasterFormat **section-level** picker (6-digit codes like `09 65 00`). It is wired into two places:
- **Settings tab:** `renderCSIPicker('tradesCheckboxes', settingsCSISections, ...)` (app.html ~18011), with `settingsCSISections` seeded from `s.preferred_csi_sections` (~18010).
- **Onboarding:** `renderCSIPicker('onboarding_csi_picker', onboardingData.preferred_csi_sections, ...)` (~6813).

**What it lets the user select:** specific CSI MasterFormat **sections** (not just 2-digit divisions). The user's selections become the array `settingsCSISections`.

**Where selections are stored (per SCHEMA.md):** `user_settings.preferred_csi_sections TEXT[]` (SCHEMA.md line 80). On save, `saveSettings()` writes `s.preferred_csi_sections = settingsCSISections` (app.html ~19674) and **derives** the legacy `s.trades` array from the 2-digit prefixes: `s.trades = [...new Set(settingsCSISections.map(sec => sec.substring(0, 2)))]` (~19676). This matches CLAUDE.md's documented pattern (`trades[]` derived for backward compat).

**Recent/uncommitted change to the picker:** **Not verified.** A `git status` / `git log` check was declined in this session, so I can't confirm whether the picker has uncommitted edits. From the source alone the picker matches the design documented in CLAUDE.md ("CSI MasterFormat Picker Pattern", Mar 2026 + Jun 2 2026 scope-vs-sheet update), with no obvious half-applied change in the function body.

## 2. The Bid Risk scope-vagueness scan — full document or filtered?

**What the scan is:** the scope-vagueness signal is the single boolean `extracted.vague_scope`, produced by the AI **extraction** prompt. The prompt text (app.html line 9275 and a second copy at 10215) reads:

> `"vague_scope": "Boolean. True if the document contains significant undefined scope: multiple instances of 'TBD', 'by others', 'NIC', 'not in contract', 'specifications to follow', 'drawings not yet issued', or 'scope to be determined'. Return true or false."`

It feeds two UI surfaces:
- **`renderBidRiskCard()`** — `vagueScope: 'Scope has undefined sections (TBD / "by others")'` flag (app.html ~9494, flag set ~9360).
- **`renderWinnersCurseRisk()` / `renderWinnersCurseCard()`** — first factor: *"Scope contains undefined sections (TBD, 'by others', specs TBD)…"* (~9444).

**Full document or filtered? — Filtered to trade-targeted pages, NOT the full document.** The extraction that produces `vague_scope` runs on `fullText`, and despite the variable name `fullText` is **only the targeted-pages text**:

```
app.html ~10503  const userCSISections = settings_pre.preferred_csi_sections || [];
app.html ~10506  const targetedPages = selectTargetPages(allPages, docMap, userCSISections);
app.html ~10512  let fullText = targetedPages.map(p => `[Page ${p.num} …]\n${p.text}`).join('\n\n');
app.html ~10518  const extracted = await extractWithAI(fullText);   // ← vague_scope produced here
```

So the documented "full-document scan that false-positives on irrelevant divisions" is **largely addressed** — extraction (and `vague_scope`) is scoped to the pages selected for the user's trade, not the entire set.

**Important contrast (do not conflate the two scans):** the **contract-risk** scan is deliberately the opposite — `detectContractRisks(buildContractText(allPages))` (app.html ~10561) runs over **ALL pages** by design (the comment at 10559-10560 says so), because pay-if-paid / indemnity clauses live in Div 00/01 pages that page-targeting skips. So: *scope-vagueness = trade-targeted; contract-risk = document-wide.* They are different scans with opposite scoping on purpose.

## 3. Trace: does the scan actually read the user's selected CSI sections at scoring time?

**Yes — the picker→scan link is live.** Full code path:

1. **Picker selection** → `settingsCSISections` → saved to `user_settings.preferred_csi_sections` (app.html ~19674).
2. **At analysis time** → `settings_pre.preferred_csi_sections` is read into `userCSISections` (~10503).
3. **Page targeting** → `selectTargetPages(allPages, docMap, userCSISections)` (~10506) narrows the page set using:
   - sheet-index title matching against `CSI_SECTION_KEYWORDS[section]` + `CSI_DIVISION_SHEETS[division]` (app.html ~8674-8694),
   - spec-book TOC matching by 6-digit section code, falling back to 2-digit division (~8713-8726),
   - always-included finish schedule/legend pages (~8700-8701).
4. **Extraction over targeted text** → `extractWithAI(targetedText)` produces `vague_scope` (~10518).

The link is not broken. The same `preferred_csi_sections` also drives the **Trade Match** score (`foundSections` in `calculateScores`, ~10611-10621, 11152-11231) via `sectionScopeTerms()` (~8632) — that's the separate, already-shipped section-vs-division scoring fix documented in CLAUDE.md.

**Caveats that limit the filtering (the residual limitation):**
- **`vague_scope` is a single coarse boolean over the targeted text** with no per-section attribution. A "by others" / "NIC" note that happens to sit on a targeted page (e.g. an adjacent division called out on a shared finish schedule) can still trip the flag. So false positives are *reduced, not eliminated*.
- **Targeting can fall back to a broad slice.** In `selectTargetPages`, if `targeted.size < 5` (nothing matched — e.g. the user has **no** `preferred_csi_sections`, or the doc map yields no sheet-index/TOC hits), it falls back to **the first 20 pages** (app.html ~8735-8737), capped at 50. In that fallback the scan is effectively broad again, so irrelevant-division vagueness can resurface. This is the main remaining false-positive vector.
- **Filtering quality depends on `docMap`** (sheet index / TOC / finish-schedule detection from Pass 1). Thin or unparseable docs degrade targeting toward the fallback.

## Task B summary

- **CSI picker:** built and live; section-level; stores to `user_settings.preferred_csi_sections TEXT[]` and derives `trades[]`. No uncommitted-change check performed (git was declined) — source shows no half-applied edit.
- **Scope-vagueness scan = filtered, not full-document.** Because extraction runs on trade-targeted pages (`selectTargetPages`), the `vague_scope` flag is scoped to the user's CSI sections. The documented full-document false-positive limitation is **largely fixed**, contingent on targeting actually narrowing.
- **Picker→scan connection: present and working** at scoring time via `preferred_csi_sections → selectTargetPages → extraction`.
- **Is the scope-filtering fix needed, partially done, or complete?** **Partially done / largely complete.** The page-targeting mechanism is the fix and it is in place. Residual gaps: (a) coarse boolean with no per-section attribution, and (b) the `targeted.size < 5` fallback to the first 20 pages when the user has no sections or the doc map yields no matches.

**Smallest change to tighten it further (described, not implemented):** In `selectTargetPages`, when the broad fallback fires (`targeted.size < 5`), set a flag on the returned page set (e.g. `targeting_confidence: 'low'`) and thread it into the extraction result. Then in `calculateWinnersCurseRisk()` / the Bid Risk flag, **suppress or downgrade the `vague_scope` factor when targeting confidence is low** (i.e., when the flag couldn't be attributed to trade-relevant pages). That converts the remaining false-positive vector into an explicit, conservative gate without touching the extraction prompt. A second, larger option would be to make `vague_scope` per-section (return which targeted pages/sections the undefined-scope phrases appeared on) so the flag only fires on the user's own scope — but that is a prompt + schema change, not the smallest step.

---

**End of verification. No files were changed, staged, or committed. The only file written this session is this report.**
