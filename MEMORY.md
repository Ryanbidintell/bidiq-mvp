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

## Current Status (Feb 27, 2026)
- **Phase:** 1.5 (Beta Testing)
- **Location:** C:\Users\RyanElder\bidiq-mvp
- **Status:** 🎉 LIVE at bidintell.ai — billing live, GA4 live, 30 users in last 28 days
- **Priority:** Get 5-10 beta users actively using it, monitor funnel events
- **Paid Launch:** April 1, 2026

## Latest Session (Feb 27, 2026)
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
