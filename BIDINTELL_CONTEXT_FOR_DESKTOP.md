# BidIntell — Project Context & Instructions
**For upload to Claude Desktop project knowledge. Current as of June 12, 2026.**

> This is a portable snapshot of who we are, what's built, where we are, and how to work on this project. If you're the coding assistant in the repo, the authoritative live docs are `CLAUDE.md`, `BidIntell_Product_Bible_v2_1.md`, and `BidIntell_BUILD_ROADMAP.md` — defer to those when they conflict with this summary.

---

## 1. What BidIntell is

BidIntell is **bid-scoring software for commercial construction subcontractors, distributors/suppliers, and manufacturers' reps.** A user uploads (or forwards, or syncs) a bid invitation; BidIntell scores it 0–100 — the **BidIndex** — and recommends **GO / REVIEW / PASS**, with a transparent breakdown so the estimator can trust and override it.

The differentiator vs. competitors (e.g. SubSparq): the score is **personalized to *you*** (your trades, service area, client history, keywords) and **learns from your logged outcomes** over time. It's not a generic signal — it quantifies the bid/no-bid judgment that currently lives in an experienced estimator's head.

- **Domain:** bidintell.ai
- **Founder:** Ryan Elder — solo, 23 years in the construction trade. Working inbox: **ryan@bidintell.ai** (Google Workspace). NOT ryan@fsikc.com (M365 silently spam-filters BidIntell mail).
- **Phase:** Post-beta paid launch. **0 paying users.** Goal: first 10 paying users.

### Brand rules (non-negotiable)
- **Product AND company name is "BidIntell."** "BidIQ" is ONLY the repo/folder name (`bidiq-mvp`) and legacy docs — **never** customer-facing.
- The 0–100 score is the **BidIndex** (this name IS customer-facing and correct).
- **Accent color:** orange `#F26522` (NOT teal/cyan). Landing/marketing ink `#0B0F14`. App primary indigo `#4F46E5`.
- Tone: plain, direct, no hype. No emojis in UI. No fabricated stats/testimonials/win-rate claims.
- **ICP:** subcontractors · distributors & suppliers · manufacturers' reps (all three).

---

## 2. Stack & infrastructure

- **Hosting/frontend:** Netlify (auto-deploys from `main`). Serverless functions in `netlify/functions/`.
- **DB/auth/storage:** Supabase (Postgres + RLS + Edge Functions). Project ref `szifhqmrddmdkgschkkw`. Auth is **magic-link** (passwordless email).
- **Email:** Postmark (transactional, approved/live) + Resend (inbound reply). All system email → ryan@bidintell.ai.
- **Inbound bid email:** SendGrid Inbound Parse → Supabase edge function `inbound-email` (MX: `bids.bidintell.ai → mx.sendgrid.net`). The old Netlify `inbound-email-background.js` is decommissioned.
- **Billing:** Stripe. Solo $49/mo ($470/yr) · Team $99/mo up to 3 seats ($950/yr) · Company $179/mo up to 8 seats ($1,720/yr). 7-day trial. Founding coupon **FOUNDING30** (30% off for life of subscription). `@fsikc.com` emails bypass the subscription gate (admin).
- **AI:** Claude API for extraction/scoring (default to the latest Claude models).
- **Analytics:** GA4 `G-XGYJLV0E6G` + Microsoft Clarity `vtnhbrqro2` (live on all user-facing pages except auth.html/legal.html).
- **App architecture:** mostly a few large single-file HTML apps — `app.html` (~21K lines, the product), `index.html` (landing), `admin.html` (founder dashboard), `roi-calculator.html`, `demo.html`.

---

## 3. What's built (working product)

- AI bid scoring with 5 components: **Location Fit · Keywords & Contract · Client Relationship · Trade/Product Match · Competitive Pressure** (the 5th activates automatically after 3+ logged outcomes against a client — never call it "coming soon").
- Section-level CSI MasterFormat matching (6-digit codes, scope-vs-sheet term split to kill trade false positives).
- Bid report with score breakdown, extracted data, contract-risk flags, estimator override (GO/REVIEW/PASS + reason).
- Dashboard, onboarding wizard, Settings (CSI picker, keywords, client list, service area, score weights).
- Outcome tracking + instant feedback loop + analytics (win rate by trade/building type, risk-reward scatter).
- Inbound email scoring (forward a bid invite → get a scored reply email).
- Team plan (org/seats/invites). Admin dashboard (metrics, ROI leads, users, FOUNDING30 sender, comp toggle).
- `/takeoff` content blog (markdown-driven build pipeline) + SEO/GEO pass + `/llms.txt`.
- **BuildingConnected (BC) integration** — OAuth + sync of bid invitations into projects with Phase-1 scoring. *Not advertised publicly yet.* See §5.
- Follow-up automation (Weeks 1-9 built, admin-gated, OAuth setup pending) — deferred until 10+ users.

---

## 4. GTM reality (the honest state)

- **0 paying users.** 14 accounts, most are founder/test. ~6 real companies:
  - **FDC Contract** & **Summit Sealants** — onboarded (referral relationships). Summit is activated.
  - **Regents Flooring, WH Stovall, Schutte Lumber, PEI KC, Sorella, jamarshall** — signed up and **stalled at onboarding.**
- **Inbound is dead** — forms produce ~0 leads. The 6-company list is the whole game right now.
- **Diagnosis from June 10 calls:** low activation = "BidIntell isn't in my bid workflow." Subs live in BuildingConnected; manual upload = they bounce. **BuildingConnected is the activation lever.**
  - Regents: conditional yes, gated on BC integration.
  - FDC: "didn't work for them" — get the specific why.
- **Direct competitor:** SubSparq (near-identical upload→signal workflow). Differentiate on **personalization + learns-from-outcomes**, not the GO/REVIEW/PASS framework itself.

### Operating model until 10 paying users
**Outreach > marketing > strategy > building.** Building is the procrastination trap; the product is good enough to sell. The single metric that counts: **buyer conversations per week.** Source of truth board: `NORTH-STAR.html` at repo root.

---

## 5. BuildingConnected sync — current behavior (updated June 12, 2026)

`netlify/functions/bc-sync.js` imports BC bid invitations into the projects table with Phase-1 (metadata-only) scoring.

- **Live-bids-only gate (default):** skips resolved bids (won/lost/declined/etc.) and past-due bids; undated bids gated to a 45-day recency window. Stops the "250 old bids dumped on first connect" overwhelm that was killing activation.
- **User-controlled date floor (NEW):** before syncing, the user is prompted *"Import bids received on or after [date]"* (default 30 days, with Last 7/30/90 quick-picks). Sends `?since=YYYY-MM-DD` to the function. Lets them manage first-sync volume.
- `?mode=all` override imports full history (resolved + past-due) when explicitly needed.
- Gate logic is unit-tested: `node scripts/test-bc-gate.js` (16 assertions).
- **Status:** code works and is tested; a real OAuth connection is currently revoked. A true live end-to-end import needs a connected Autodesk/BC account (Regents' or Ryan's).

---

## 6. Lead/signup tracking — fixed June 12, 2026

Background: the founder dashboard was blind — `admin_events` had **zero** `signup` or `roi_lead` rows despite 14 accounts.

Two root causes, both fixed:
1. **ROI leads never logged:** `notify.js` read `SUPABASE_SERVICE_ROLE_KEY`, but Netlify only has `SUPABASE_SERVICE_KEY` (every other function uses that name). The key was `undefined`, so the insert was silently skipped. Fixed to accept either name. Verified: insert now returns HTTP 201.
2. **Signup logged at the wrong moment:** the `signup` event fired only at **onboarding completion** — but most real companies stall *before* finishing onboarding, so it never fired. Moved signup logging to **account creation** (the auth `SIGNED_IN` hook), and reclassified the onboarding-completion event as `onboarding_completed`. Clean funnel: **signup → onboarding_completed → first_bid.**

Still open: a one-time **backfill** of `signup` events for the 14 existing users (so historical funnel isn't empty), and a live browser end-to-end of the new-signup path after deploy.

---

## 7. How to work on this project (rules)

- **Data safety is paramount.** Never delete data, run migrations, or change schema/RLS without explicit approval. Use soft deletes. Real user data lives here.
- **Migrations:** apply via Supabase MCP `apply_migration` or SQL Editor — **never** `supabase db push` (the migration tracking table is intentionally incomplete; the CLI would replay conflicting historical migrations). Apply DDL before shipping code that references new columns.
- **Git:** commit before and after changes. **Never `git add -A` in this repo** — `BidIntell.ai/` lives in the same OneDrive folder with large business PDFs that exceed GitHub's 100MB limit (it's gitignored). Always stage specific file paths. Always commit + push after confirming changes.
- **Supabase mutations always return `{ error }` — they never throw.** Destructure and check it, or failures are silent.
- **UI state:** check `classList.contains('active')`, not `style.display`, for tab/visibility state (recurring bug).
- **Don't ship dead-end UI to paying users** — gate unfinished multi-week features to admins until they work end-to-end.
- **Verify before claiming done.** Run the syntax check (`node scripts/check-app-syntax.js`) and relevant tests; state failures honestly.
- **Skill routing (in-repo):** bugs → `investigate`; ship/deploy → `ship`; QA → `qa`; design → `design-review`; strategy → `office-hours`.

### Key files
- `app.html` — the product (~21K lines; handle with care)
- `index.html` · `roi-calculator.html` · `demo.html` — landing / lead-gen
- `admin.html` — founder dashboard
- `netlify/functions/` — `notify.js` (email + roi_lead logging), `bc-sync.js` (BuildingConnected), `analyze.js` (AI), `stripe-*.js`, `alert.js` (silent-failure alerts)
- `supabase/functions/inbound-email/index.ts` — live inbound bid handler
- `CLAUDE.md` · `BidIntell_Product_Bible_v2_1.md` · `BidIntell_BUILD_ROADMAP.md` — authoritative docs
- `NORTH-STAR.html` — the founder's single daily priorities board

---
*Maintained alongside the founder's persistent memory. Regenerate when GTM state, infra, or priorities materially change.*
