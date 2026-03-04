# BidIQ Project Memory

## 🚨 CRITICAL INCIDENT (Feb 7, 2026)
**DATA LOSS:** All projects deleted, most GCs lost
- **Cause:** Unknown
- **Recovery:** restore-test-data.sql (test data only)
- **Prevention:** Created DATA_SAFETY_PROTOCOL.md

## SAFEGUARDS NOW IN PLACE
1. ✅ Git commits before every change
2. ✅ DATA_SAFETY_PROTOCOL.md created
3. ⚠️ TODO: Enable Supabase PITR
4. ⚠️ TODO: Create backup scripts

---

## Current Status (Mar 3, 2026)
- **Phase:** 1.5 (Beta Testing)
- **Location:** C:\Users\RyanElder\OneDrive - Facility Systems\bidiq-mvp
- **Status:** 🎉 LIVE at bidintell.ai — billing live, GA4 live, Google + Microsoft OAuth live
- **Priority:** Get beta testers actively using it, monitor funnel events
- **Paid Launch:** April 1, 2026

## Latest Session (Mar 3, 2026) — Session 7
### Unified Auth Screen + LinkedIn OAuth

**New unified auth screen:**
- Removed Sign In / Sign Up tabs + all password fields
- Single screen: Google / Microsoft / LinkedIn buttons → divider → email input → "Continue →"
- Email sends magic link (works for new AND existing users)
- notify.js: try `type: 'magiclink'` first, fall back to `type: 'signup'` for new users
- "Check your inbox 📬" success state with 30s resend countdown + "Use different email" back button
- GA4 sign_up event fires on SIGNED_IN if account <60s old
- ToS as small-print at bottom (much less friction)

**LinkedIn OAuth — WORKING ✅**
- Provider: `linkedin_oidc` (OpenID Connect Standard Tier)
- LinkedIn App Client ID: 86rj2nnzcro7qa (secret in Supabase dashboard)
- Scopes: openid, profile, email
- Callback: https://szifhqmrddmdkgschkkw.supabase.co/auth/v1/callback
- Configured in Supabase → Auth → Providers → LinkedIn (OIDC)

**All 3 OAuth providers LIVE:** Google ✅ Microsoft ✅ LinkedIn ✅

---

## Previous Session (Mar 3, 2026) — Session 6
### Auth, Dashboard Fixes, OAuth

**Dashboard stat fixes:**
- AI Learning Progress — now shows count (e.g. "2") not percentage; subtitle shows "2 of 15 projects • Trains AI"
- Contract Risks Found — was reading `p.contract_risks` (snake_case) but projects map to `p.contractRisks` (camelCase) — fixed
- Analytics charts blank — charts rendered at page load while tab hidden (0px canvas); fixed by re-rendering on tab switch in `switchTab()`
- Admin Operations tab — auto-loads stats on switch, removed "Load Stats" button
- Founder Metrics tab — added Beta Users table at top showing per-user: Company, Email, Bids, Outcomes, Last Active, Plan, Setup status

**Magic link login fix:**
- Added "Email me a login link" to Sign In form for users without passwords (beta signups)
- `handleMagicLogin()` calls `/.netlify/functions/notify` with `emailType: 'magic_link'`

**Microsoft SafeLinks fix (corporate email):**
- Root cause: SafeLinks pre-clicks every link in email, burning one-time Supabase tokens
- Fix: Created `auth.html` intermediate page at `/auth` — email links to `bidintell.ai/auth?token=...` instead of Supabase directly
- SafeLinks scans our button page (no JS execution), token preserved until real user clicks
- Updated `notify.js` to extract token from `action_link` and build safe URL
- Added `/auth` route to `netlify.toml`

**Google + Microsoft OAuth:**
- Added "Continue with Google" and "Continue with Microsoft" buttons to login screen
- `handleOAuthLogin(provider)` calls `supabaseClient.auth.signInWithOAuth()`
- Google: configured in Google Cloud Console + Supabase — WORKING ✅
- Microsoft (Azure): configured with "Any Entra ID Tenant + Personal" — WORKING ✅
- CSS: `.btn-oauth` white button style matching Google/Microsoft brand guidelines
- This bypasses SafeLinks entirely for corporate users

**Project moved:**
- Old path: `C:\Users\RyanElder\bidiq-mvp`
- New path: `C:\Users\RyanElder\OneDrive - Facility Systems\bidiq-mvp`
- Backed up to both OneDrive (FSI) and GitHub

**Beta tester issue (cstergos@fdccontract.com):**
- FDC is on Office 365 — SafeLinks was burning tokens
- SafeLinks fix deployed — tokens now preserved
- Recommended: use "Continue with Microsoft" for instant access, no email needed
- FDC may also have firewall blocking `supabase.co` — Tim at Accent (IT) needs to whitelist `*.supabase.co` and `bidintell.ai` if issue persists

## Latest Session (Mar 2, 2026) — Session 5
### Magic Link Signup Flow — FULLY WORKING ✅
**Problem chain resolved:**
1. Wrong Supabase URL in index.html (old project) → fixed
2. Supabase built-in email → unreliable for Gmail, abandoned
3. Postmark SMTP via Supabase → didn't work
4. Admin API generate_link + Postmark → correct approach but env var issues
   - `SUPABASE_SERVICE_KEY` had wrong value → user re-copied service_role key from Supabase → Project Settings → API
   - `POSTMARK_API_KEY` was FSI Marketing server token, not BidIntell server → updated to BidIntell server token
   - `hello@bidintell.ai` sender not verified in Postmark → added sender signature + verified DKIM/Return-Path

**Final working architecture:**
- `handleBetaSubmit` in index.html calls `/.netlify/functions/notify` with `emailType: 'magic_link'`
- notify.js generates magic link via Supabase admin API (`/auth/v1/admin/generate_link` with service_role key)
- Sends branded email via Postmark from `hello@bidintell.ai` with the action_link
- Beta signup recorded silently to `beta_signups` table (non-blocking)

**Env vars required in Netlify:**
- `SUPABASE_SERVICE_KEY` = service_role key from Supabase → Project Settings → API
- `POSTMARK_API_KEY` = BidIntell server token (NOT FSI Marketing server token)

**Also built this session:**
- ROI Calculator on landing page (5 sliders, live results panel, email capture → `roi_calculator_leads` table)
- `roi_calculator_leads` table — run `roi-calculator-migration.sql` in Supabase
- `emailType: 'roi_breakdown'` in notify.js — sends branded breakdown email via Postmark

---

## Previous Session (Mar 2, 2026) — Session 4
### Launch Readiness: Legal, Emails, Landing Page (commit ff03b63)
- **legal.html** — ToS + Privacy Policy created (both sections on one page, /legal)
- **app.html** — Fixed broken Terms/Privacy links (were calling nonexistent showPage() → now /legal#terms)
- **index.html** — Updated beta language to "Free through March 31" + "Founding member pricing"
- **notify.js** — Added emailType: 'beta_to_paid_warning' email template (branded, with billing date + plan)
- **admin.html** — Added "Beta-to-Paid Transition Emails" tool: Load Users + Send All with rate limiting
- Mobile CSS fixes: score report wraps on 480px

### Bid Economics Feature + Report Polish (commit 947238b)

**SQL Migration:** `bid-economics-migration.sql` — run in Supabase SQL Editor
- `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_margin INTEGER DEFAULT 15;`

**Features added:**
1. **Bid Economics Card** — appears on every report (new + saved) after BidIndex components
   - Auto-estimates hours to bid using: spec divisions (×0.35h), building type, contract risks, file count (cap 8h)
   - User enters scope value → calculates expected value = scope × margin × win rate
   - Shows $/hr return on estimating time
   - Win rate sourced from their real outcome history (needs 3+ outcomes)
2. **Target Margin setting** — new field in Settings tab, default 15%, saved to user_settings
3. **Outcome forms** — "Hours spent estimating" field added to won + lost forms (optional, saves to outcome_data.hours_spent)
4. **Analytics: Bid ROI by Building Type** — appears after 2+ bids with hours+amount tracked; shows $/hr by building type as bar chart

**Also fixed this session:**
- Winner's Curse → Bid Risk rename complete (app + index.html)
- GC selector placeholder overlapping dropdown — fixed with searchActive check
- rushedTimeline false positive on past reports — fixed with `daysUntil >= 0 && daysUntil < 10`
- Analytics: renamed to "Top/High Ghost Rate Clients", building type chart % + white legend + no click-to-hide
- Report redesign: premium dark gradient header, glow lines, rec-pill, meta-chips, score-component-inner with colored border, insight-quote
- Bid volume chart Invalid Date guard
- `updateBidEconomics` is window-level global (needed for oninput in template literals)

## Previous Session (Feb 27, 2026) — Session 2
### Game Theory Intelligence Modules (commit 2e49aa1)

**SQL Migration:** `game-theory-migration.sql` — run in Supabase SQL Editor BEFORE testing
- `ALTER TABLE projects ADD COLUMN bid_divisions_submitted TEXT[] DEFAULT '{}'`
- `CREATE TABLE gc_competition_density (...)` with RLS

**4 Modules Implemented:**
1. **Division Tracking** — Division checkboxes in outcome modal for all 4 types; saved to `projects.bid_divisions_submitted`; shown on report
2. **Bid Risk** (renamed from Winner's Curse) — AI extracts `multiple_bidders_expected` + `bid_shopping_language` + `vague_scope`; `calculateBidRisk()` flags 5 risk indicators; `renderBidRiskCard()` shown in report header. `lowValuePerSF` flag removed, replaced with `vagueScope`.
3. **GC Relationship Classification** — `classifyGCRelationship(gc)` → ⭐ Repeat Partner / ⚠️ One-Shot / 🔄 Building / ❓ No History; shown in GC cards and `renderComponent()` GC section
4. **Competitive Pressure** — 5th BidIndex component at 10% weight; activates after 3+ outcomes; reads from `gc_competition_density` table; shown in score report

**Key Changes:**
- `calculateScores()` now async with `gcNames` param — calls `getCompetitivePressureScore()`
- `updateOutcomeFields()` is now async (call site uses `(async()=>{await updateOutcomeFields()})()`)
- `getProjects()` now maps `bid_divisions_submitted` from DB
- Both extraction prompts (extractWithOpenAI + main) updated with new fields
- `components.gc.details.allGCs` added for full GC list in renderComponent

**⚠️ MUST RUN SQL MIGRATION BEFORE TESTING**

## Previous Session (Feb 27, 2026) — Session 1
### GA4 Event Tracking + GC Selector Fix (commit 19c6c9a)

**GA4 Measurement ID:** G-XGYJLV0E6G (already installed in both app.html + index.html)

**Events added to app.html:**
- `sign_up` — after successful account creation (line ~2724)
- `bid_uploaded` — when PDFs dropped/selected, includes `file_count` (line ~5934)
- `bid_analyzed` — after AI analysis, includes `score` + `recommendation` (line ~7408)
- `project_saved` — when user clicks Save to Projects, includes score + rec (line ~4185)
- `outcome_recorded` — when won/lost/ghost/declined saved, includes `outcome` (line ~11251)
- `report_viewed` — when opening a saved report, includes score + rec + outcome (line ~9541)
- `onboarding_completed` — when new user finishes setup wizard (line ~5767)
- `settings_updated` — when user saves settings (line ~11916)

**GC Selector Fix:**
- Root cause: `click` event fires AFTER `blur` on the search input, so dropdown closed before selection registered
- Fix: `mousedown` + `e.preventDefault()` on the list container (event delegation via `data-gc-index`)
- Tracks rendered list in `gcSelectorRenderedList` array for index lookup
- No more onclick attributes on list items — all handled by single delegated listener

**GA4 Analytics Snapshot (Jan 30 - Feb 26):**
- 30 active users, 36 sessions, 12 engaged
- 73% traffic = "(not set)" = direct/dark social
- 7 organic users at 85.71% engagement rate (high quality)
- 0 key events configured before today — now tracking full funnel
- Traffic peaks: Feb 13 and Feb 17-18

---

## Build Status Summary (Feb 27, 2026)

### ✅ DONE
- Stripe billing (Starter $49/mo, Pro $99/mo) — live
- Free beta until April 1, 2026
- GA4 tracking with 8 conversion events
- Contract risk detection (11 risk types with legal terminology)
- Admin metrics dashboard + daily snapshot function
- GC/client selector fix (mousedown event delegation)
- Google Maps → PlaceAutocompleteElement migration
- Onboarding re-trigger bug fixed
- 406 errors on user_revenue fixed (maybeSingle)

### ⚠️ STILL NEEDED (before April 1)
1. **Recruit 5-10 beta users** — highest priority
2. **End-to-end test:** upload → analyze → save → outcome
3. **Safari + mobile test** (iPhone critical for contractors)
4. **Automated database backups** (scripts exist at scripts/backup-database.ps1)
5. **ToS + Privacy Policy** — needed before public launch
6. **Beta-to-paid transition email** — warn users about April 1 pricing
7. **Stripe billing flow test** (use card 4242 4242 4242 4242)
8. **Landing page copy update** (remove "free beta" language near April 1)

### 🎯 Nice to Have
- Demo video (iPhone screen recording is fine)
- GA4 funnel visualization in GA4 dashboard (Explore → Funnel)
- Supabase PITR (requires paid plan)
- Error tracking (Sentry)

---

## Stripe Billing
- **Starter:** $49/month — price_1T0fdmD1qm9w587Oiv0RfU90
- **Professional:** $99/month — price_1T0ffMD1qm9w587OnLbJc3Tc
- Webhook: `netlify/functions/stripe-webhook.js`
- Webhook secret: in Netlify env var STRIPE_WEBHOOK_SECRET
- Customer Portal: `netlify/functions/stripe-create-portal.js`

## Important Files
- Main app: bidiq-mvp/app.html (~13,000 lines)
- Landing page: bidiq-mvp/index.html
- Admin panel: bidiq-mvp/admin.html
- Data protocol: DATA_SAFETY_PROTOCOL.md
- Restore script: restore-test-data.sql
- Product Bible: BidIntell_Product_Bible_v1_8.md
- Launch readiness: LAUNCH_READINESS_REPORT.md (Feb 16, 82% ready)
- 6-month playbook: BidIntell_6Month_Growth_Playbook.docx

## Key Technical Patterns

### GC Selector (fixed Feb 27)
- Use mousedown + e.preventDefault() for dropdown items to prevent blur race
- Track rendered items in array, use data-index attributes for event delegation
- Never use onclick in innerHTML for dynamic lists

### Tab Navigation
- Check classList.contains('active') NOT style.display !== 'none'

### Date Validation
- Always use isNaN(date.getTime()) — try/catch doesn't catch Invalid Date

### Billing Security
- NEVER commit secrets to git
- Use rk_live_* restricted keys (not sk_live_*)
- Always verify Stripe webhook signatures

## LESSONS LEARNED
- ❌ NEVER make changes without git commit
- ❌ AVOID JSON.stringify() in HTML attributes
- ✅ USE event delegation + data attributes for dynamic content
- ✅ CLEAR cache after save operations
- ✅ INCLUDE user profile in AI context
- ✅ USE maybeSingle() not single() for optional Supabase records
- 🔐 NEVER commit secrets — use env vars only
