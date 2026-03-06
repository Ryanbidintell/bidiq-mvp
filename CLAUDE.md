# 🤖 Claude Code Instructions for BidIQ Project

**Last Updated:** March 6, 2026

This file contains mandatory rules Claude Code must follow when working on this project.

---

## 🚨 CRITICAL RULES - NEVER BREAK THESE

### 1. DATA SAFETY IS PARAMOUNT

**BEFORE making ANY changes:**
```bash
git add -A
git commit -m "Before [change description]"
```

**NEVER:**
- ❌ Make code changes without git commit first
- ❌ Delete data from database
- ❌ Run untested migrations on production
- ❌ Modify database schema without user approval
- ❌ Use `DELETE FROM` or `TRUNCATE` statements
- ❌ Assume data is backed up

**ALWAYS:**
- ✅ Use soft deletes (UPDATE with deleted_at timestamp)
- ✅ Test on development environment first
- ✅ Ask before running ANY database operations
- ✅ Verify user wants changes before applying them

---

### 2. GIT WORKFLOW

**Every coding session:**
1. Check git status first: `git status`
2. Commit before ANY changes: `git add -A && git commit -m "Clear message"`
3. Commit after fixes: `git add -A && git commit -m "Fixed: [what was fixed]"`

**Never:**
- ❌ Leave uncommitted changes
- ❌ Force push without user permission
- ❌ Delete branches without confirmation

---

### 3. DATABASE OPERATIONS

**ALWAYS ask user before:**
- Running migrations
- Modifying table schemas
- Deleting any data
- Changing RLS policies
- Creating/dropping tables

**When user asks to "fix database":**
1. First: Ask what specific issue they're seeing
2. Then: Read existing schema files
3. Then: Propose changes and get approval
4. Finally: Generate migration, don't run it automatically

---

### 4. TESTING BEFORE DEPLOYMENT

**Never deploy without:**
- ✅ Testing locally first
- ✅ User confirms it works
- ✅ Git commit saved
- ✅ No console errors

**If user says "it was working yesterday":**
- 🚨 STOP immediately
- 🚨 Check what we changed today
- 🚨 Offer to revert: `git revert HEAD`
- 🚨 Don't make more changes until root cause found

---

### 5. DEBUGGING PROTOCOL

**When user reports a bug:**

1. **Ask for specifics:**
   - What exactly is broken?
   - What error message? (exact text)
   - What were they doing when it broke?
   - Did it work before? When?

2. **Gather evidence:**
   - Check browser console (F12)
   - Check file structure
   - Check recent git commits
   - Read relevant code sections

3. **Fix ONE thing at a time:**
   - Identify root cause
   - Fix that specific issue
   - Test the fix
   - Commit
   - THEN move to next issue

**Don't:**
- ❌ Try to "fix everything" at once
- ❌ Make changes to unrelated code
- ❌ Refactor while debugging
- ❌ Assume what's broken without checking

---

## 📁 PROJECT STRUCTURE

### Important Files:
- `app.html` - Main application (~15K lines, handle with care)
- `auth.html` - Authentication / magic link flow (logo links back to bidintell.ai)
- `admin.html` - Founder dashboard (metrics, ROI leads, current users, phase gates, email tool)
- `demo.html` - Schedule a Demo intake form → Pipedrive Lead via pipedrive-lead.js
- `index.html` - Landing page (separate from app.html)
- `BidIntell_Product_Bible_v1_9.md` - Product roadmap and requirements (v1.9 is current)
- `DATA_SAFETY_PROTOCOL.md` - Data handling rules
- `KNOWN_BUGS.md` - Active bug list
- `SCHEMA.md` - Database schema (10 tables, keep current)
- `contract_risk_detection_guide.md` - Contract risk clause patterns and prompts
- `restore-test-data.sql` - Test data restore script
- Memory is at `C:\Users\RyanElder\.claude\projects\C--Users-RyanElder\memory\MEMORY.md` (auto-loads)

### Don't Touch:
- `OLD/` folder - Archive only, don't modify
- PDF files in `report printouts to review/` - Reference only
- `.git/` - Git internals

### Backend (netlify/functions/):
- `analyze.js` - AI API calls (Claude/OpenAI), tracks usage via api_usage table
- `notify.js` - Email notifications via Postmark; also logs `roi_lead` events to admin_events
- `stripe-webhook.js` - Stripe subscription webhooks (writes to user_revenue)
- `stripe-create-checkout.js` - Creates Stripe checkout session
- `stripe-create-portal.js` - Opens Stripe billing portal
- `daily-snapshot.js` - Scheduled daily metrics aggregation → admin_metrics_snapshots
- `pipedrive-lead.js` - Demo request form handler → creates Pipedrive Person + Lead + Note

### Documentation:
- `STRIPE_WEBHOOK_SETUP.md` - Complete Stripe webhook setup guide
- `FRONTEND_DESIGN.md` - Design system tokens and brand guidelines

---

## 🎯 PROJECT GOALS

### Current Phase: 1.5 (Beta Testing & Refinement)

**Priority Order:**
1. **Data safety** - Never lose data again
2. **Bug fixes** - Fix what's broken
3. **User validation** - Does it work for real users?
4. **Feature development** - Only after above are solid

**Not priorities right now:**
- ❌ Infrastructure optimization
- ❌ Perfect code architecture
- ❌ SEO/marketing features
- ❌ New features (unless critical)

---

## 🔧 COMMON TASKS

### User Says: "Fix the app"

**Response:**
1. Ask: "What specifically is broken?"
2. Get exact error message
3. Check console for errors
4. Fix that ONE thing
5. Test
6. Commit

### User Says: "Add a feature"

**Response:**
1. Check Product Bible - is it in the roadmap?
2. Check current phase - is it Phase 1.5 priority?
3. If yes: Plan approach, get approval, implement
4. If no: Note it for later phase

### User Says: "The database is broken"

**Response:**
1. **STOP** - Don't modify database
2. Ask: What's the symptom? (data not loading? error message?)
3. Check Supabase dashboard - does data exist?
4. Check RLS policies - are they blocking access?
5. Propose solution, get approval
6. Test on dev environment first

### User Says: "Deploy to production"

**Response:**
1. Check git status - any uncommitted changes?
2. Verify Netlify env vars are set
3. Check for console errors locally
4. Ask: "Ready to deploy?" (get confirmation)
5. Guide deployment, don't auto-deploy

---

## 🛡️ SAFETY CHECKS

### Before Editing Files:

**Check:**
- [ ] Is this file read recently? (use Read tool first)
- [ ] Do I understand what this code does?
- [ ] Is there a backup? (git status)
- [ ] Will this break existing functionality?

### Before Database Operations:

**Check:**
- [ ] Did user explicitly request this?
- [ ] Is there a backup?
- [ ] Am I on dev or production?
- [ ] Are RLS policies correct?
- [ ] Will this delete data? (if yes, STOP)

### Before Committing:

**Check:**
- [ ] Clear commit message
- [ ] Only committing intended changes
- [ ] No sensitive data in commit (API keys, passwords)

---

## 📖 CODING STANDARDS

### When Fixing Bugs:

**Do:**
- ✅ Read existing code first
- ✅ Understand the pattern
- ✅ Make minimal changes
- ✅ Test the fix
- ✅ Document what was fixed (in commit message)

**Don't:**
- ❌ Rewrite entire functions unnecessarily
- ❌ Change variable names for style
- ❌ Add features while fixing bugs
- ❌ Refactor unrelated code

### When Adding Features:

**Do:**
- ✅ Check Product Bible for requirements
- ✅ Follow existing patterns in codebase
- ✅ Keep it simple (KISS principle)
- ✅ Add to relevant section (don't scatter)

**Don't:**
- ❌ Over-engineer
- ❌ Add dependencies without asking
- ❌ Create abstractions prematurely
- ❌ Break existing features

---

## 🎓 RECENT PATTERNS & LESSONS LEARNED

### Tab Navigation Pattern (Feb 11, 2026)

**Problem:** Back button was always returning to dashboard instead of previous tab
**Root Cause:** Checking `style.display !== 'none'` when tabs use `classList.contains('active')`
**Solution:** Always check for CSS classes, not inline styles, when detecting active elements
**Code Location:** `viewReport()` function

```javascript
// ❌ WRONG - checks inline styles
if (tabElement && tabElement.style.display !== 'none') {

// ✅ CORRECT - checks CSS classes
if (tabElement && tabElement.classList.contains('active')) {
```

**Lesson:** When debugging UI state, verify what mechanism controls visibility (classes vs inline styles)

### Date Validation Pattern (Feb 9, 2026)

**Problem:** `new Date(invalidString)` doesn't throw errors, returns Invalid Date object
**Solution:** Use `isNaN(date.getTime())` to validate dates after construction
**Code Location:** `renderProjectsTable()` function

```javascript
// ❌ WRONG - try/catch doesn't work for invalid dates
try {
    const d = new Date(dateValue);
    return d.toLocaleDateString();
} catch (e) {
    return null; // Never executes!
}

// ✅ CORRECT - check for Invalid Date
const d = new Date(dateValue);
if (isNaN(d.getTime())) return null;
return d.toLocaleDateString();
```

**Lesson:** JavaScript Date constructor is permissive - always validate with isNaN(date.getTime())

### Multi-Client Type Architecture (Feb 11, 2026)

**Change:** Expanded from GC-only to 7 client types:
- General Contractors, Subcontractors, End Users, Building Owners, Municipalities, Distributors, Manufacturer Reps

**Database:** `clients` table with `client_type` column (migrated FROM `general_contractors` — old name is gone)
**UI:** Step 2 includes client type selector with visual filtering
**Key functions:** `getClients(clientType)`, `saveClient(client)`, `renderGCSelector()`

**Legacy Functions:** `getGCs()` wraps `getClients('general_contractor')` for backwards compatibility. `saveGC()` wraps `saveClient()`.

**Lesson:** When expanding scope, maintain backwards compatibility with wrapper functions

### Outcome Form Data Capture (Feb 11, 2026)

**Decision:** Prioritize qualitative feedback over structured dropdowns for AI learning
**Examples:**
- Added "Alternates ($)" field to capture alternate pricing
- Added free-text "Pricing Feedback" instead of dropdown selections
- Added "Which GC(s) ghosted?" for multi-GC ghost outcomes

**Reasoning:** Real feedback like "GC said we won because of better healthcare experience" is more valuable for AI training than checkbox data

**Code Location:** outcome form modals + `saveOutcome()` function

**Lesson:** For AI/ML features, qualitative text data often beats quantitative structured data

### Stripe Webhook Integration (Feb 9, 2026)

**Architecture:** Serverless webhook function at `netlify/functions/stripe-webhook.js`
**Security:** Signature verification using Stripe webhook secret
**Data Flow:** Stripe → Webhook → Supabase user_revenue table
**Documentation:** Complete setup guide in STRIPE_WEBHOOK_SETUP.md

**Events Handled:**
- customer.subscription.created → Create revenue record
- customer.subscription.updated → Update MRR and status
- customer.subscription.deleted → Mark as cancelled
- invoice.payment_succeeded → Update timestamp

**Lesson:** Webhooks require careful signature verification and idempotent handling

### Evening Session - User Experience Polish (Feb 11, 2026)

**Focus:** Landing page consistency, outcome tracking improvements, ROI calculator redesign

#### Multiple Alternates Tracking
**Problem:** Single alternates field couldn't track multiple alternate bids with different margins
**Solution:** Dynamic list with + Add Alternate button
**Implementation:**
- Each alternate tracks: description, bid amount ($), margin (%)
- JavaScript array with add/remove functions
- Grid layout: 2fr (description) 1fr (amount) 1fr (margin) auto (remove button)
- Saves as JSON array to database

**Key functions:** `renderAlternates()`, `addAlternateRow()`, `removeAlternateRow()`, `saveOutcome()`

**Lesson:** When users need to track multiple items, provide dynamic add/remove UI instead of single field

#### Landing Page Brand Consistency
**Problem:** Landing page used #3b82f6 (light blue), dashboard used #4F46E5 (indigo), plus emoji in header
**Solution:** Synchronized all brand colors and removed emoji for professional look
**Changes:** `--brand-primary` unified to `#4F46E5` (indigo) across index.html + app.html. Emoji removed from logo.

**Lesson:** Brand consistency across landing page and app builds trust - colors should match exactly

#### ROI Calculator Redesign
**Problem:** Conservative 3% win rate boost, unrealistic 40 hours per bid, no revenue impact shown
**Solution:** Complete redesign with realistic inputs and revenue calculations
**Changes:**
- Replaced "bids per month" with "bids per year" (annual thinking)
- Changed default "hours per bid" from 40 to 2 (realistic decision time)
- Added visual slider for current win rate (5-50% range)
- Added "Average project size" input for revenue calculations
- Win rate improvement: 12.5% relative (middle of 10-15% range)
- Calculate **Additional Revenue** from improved win rate: (new wins - old wins) × avg project size
- Results show: Time Saved Annually, Additional Revenue, New Win Rate

**Code Location:** `calculateROI()` in index.html

**Key Changes:**
```javascript
// Old: 25% improvement, capped at 20%
const winRateImprovement = Math.min(winRate * 0.25, 20);

// New: 12.5% relative improvement, show actual revenue impact
const winRateImprovementPercent = 0.125; // 12.5%
const newWinRate = Math.min(oldWinRate * (1 + winRateImprovementPercent), 0.50);
const additionalWins = (newWinRate - oldWinRate) * bidsPerYear;
const additionalRevenue = additionalWins * avgProjectSize;
```

**Lesson:** ROI calculators should show hard savings (time) AND revenue opportunity separately - more compelling than time alone

#### User-Facing Language
**Problem:** "Data Moat Health" is internal business terminology users don't understand or care about
**Solution:** Changed to "AI Learning Progress" with emphasis on training the AI
**Changes:** Dashboard stat card relabeled "AI Learning Progress" with subtitle "outcomes tracked • Trains AI"

**Lesson:** Internal metrics shown to users should describe the benefit to THEM, not the business value to YOU

#### Landing Page Copy Improvements
**Problem:** "40+ Hours Per Bid" wildly high, "Bad GC Relationships" doesn't match multi-client architecture
**Changes:**
- "40+ Hours Per Bid" → "Days Wasted on Bad Bids" (more accurate, less specific)
- "Bad GC Relationships" → "Bad Client Relationships" (matches 7 client types)

**Lesson:** Copy should match actual user experience - exaggerated claims hurt credibility

#### Google Analytics Integration
**Implementation:** Added GA4 tracking code to both index.html and app.html
**Code:** Standard gtag.js snippet in `<head>` with placeholder G-XXXXXXXXXX
**Next Step:** User needs to replace placeholder with actual Measurement ID from their GA4 property

**Lesson:** Analytics should be added early - track user behavior from day one of beta

### CSI MasterFormat Picker Pattern (Mar 2026)

**Problem:** Division-level trade scoring caused false positives (flooring sub scored GO on ceramic tile job because Division 09 matched)
**Solution:** Section-level scoring — when `preferred_csi_sections` is populated, scan for exact 6-digit section codes (e.g. "09 65 00") instead of 2-digit division codes
**Key functions:** `renderCSIPicker()`, `loadSettings()` (wires picker), `saveSettings()` (derives `trades[]` from sections), `calculateScores()` (branches on `hasSections`)
**Data:** `preferred_csi_sections TEXT[]` in user_settings. `trades[]` is derived for backward compat.
**CSS gotcha:** `#tradesCheckboxes` had class `checkbox-grid` (display:grid). `renderCSIPicker()` must call `container.classList.remove('checkbox-grid')` at the top or the picker renders as 140px grid cells.

**Lesson:** When a container that will be dynamically replaced has a layout class, remove it in the render function — don't rely on the HTML being clean.

### user_keywords Is Single-Row (Mar 2026)

**Pattern:** `user_keywords` table has ONE row per user with `good_keywords TEXT[]` and `bad_keywords TEXT[]` array columns. NOT multiple rows.
**Upsert:** `onConflict: 'user_id'` — always upsert, never insert blindly.
**Read:** Use `.single()` not `.maybeSingle()` (after initial creation is guaranteed).

**Lesson:** Check SCHEMA.md before writing any query — old docs said `keywords` (multi-row), actual table is `user_keywords` (single-row arrays).

### Demo Form + Pipedrive Integration (Mar 2026)

**Files:** `demo.html` (intake form) + `netlify/functions/pipedrive-lead.js` (API handler)
**Flow:** Form submits → pipedrive-lead.js: search person by email → create if new → create Lead → add Note
**Scheduler:** Calendly (replacing Pipedrive Scheduler — Pipedrive doesn't support URL pre-fill)
**Pending:** Calendly link not yet wired; success state shows "I'll reach out to schedule" until link is ready
**Env var required:** `PIPEDRIVE_API_TOKEN` in Netlify

### HTML Email Template Pattern (Mar 2026)

**Problem:** Dark-themed emails break in Outlook — text color `#F8FAFC` (near-white) on white background = invisible values
**Solution:** Always use table-based HTML with explicit `background-color` on every dark cell. Never rely on inherited backgrounds in email clients.
**Rule:** Test every email in Outlook before shipping. Dark backgrounds must be set on individual `<td>` elements, not parent `<div>` containers.
**File:** `netlify/functions/notify.js` — `roi_breakdown` email type

### BidIntell Brand Colors (Mar 2026)

**Landing page / demo.html:** DM Sans font, `--ink: #0B0F14` background, `--accent: #F26522` orange
**app.html:** Plus Jakarta Sans, indigo `#4F46E5` primary, same orange accent
**Do NOT use:** `#3b82f6` blue as primary (old/wrong), Tailwind, React, emojis in UI

### Admin Dashboard — ROI Leads + Users (Mar 2026)

**ROI leads** stored in `admin_events` with `event_type: 'roi_lead'`, `user_id: null`, data in `event_data` jsonb
**Written by:** `notify.js` fire-and-forget via Supabase REST API (no SDK — uses native fetch with service role key)
**Read by:** `admin.html` — already loads all `admin_events`; `renderROILeads(events)` filters by type
**Current users** rendered by `renderCurrentUsers(users, projects)` — joins project count per user
**Known issue:** admin.html uses anon key → RLS may limit user_settings to only admin's own row. If users list shows only 1 row, need to add admin-bypass RLS policy.

---

## 🚫 ABSOLUTE PROHIBITIONS

**NEVER do these without explicit user permission:**

1. **Delete data** - ANY delete operation on database
2. **Force operations** - `git push --force`, `rm -rf`, etc.
3. **Schema changes** - DROP, ALTER TABLE, etc.
4. **Dependency changes** - npm install/uninstall
5. **Environment changes** - Modify .env, Netlify settings
6. **Deployment** - Deploy to production
7. **External API calls** - Call external services (other than reading docs)
8. **Commit secrets** - NEVER commit API keys, webhook secrets, passwords, or tokens to git
   - Use `STRIPE_SECRET_KEY=Get from Dashboard` in documentation
   - All sensitive values MUST use environment variables (Netlify/Supabase)
   - Before every commit: Check for secrets in changed files

---

## ✅ GOOD PRACTICES

### Communication:

**Do:**
- ✅ Be clear about what you're changing
- ✅ Explain why (not just what)
- ✅ Ask before destructive operations
- ✅ Admit when you don't know
- ✅ Say "this needs testing" when uncertain

**Don't:**
- ❌ Claim things work without testing
- ❌ Over-promise
- ❌ Hide problems
- ❌ Assume user wants changes

### Code Changes:

**Do:**
- ✅ Read before writing
- ✅ Edit existing files (don't create new unless needed)
- ✅ Follow existing patterns
- ✅ Keep changes focused
- ✅ Test critical paths

**Don't:**
- ❌ Create files unnecessarily
- ❌ Duplicate code
- ❌ Mix concerns (bug fix + feature + refactor)
- ❌ Change working code "for improvement"

---

## 📚 KEY DOCUMENTS TO REFERENCE

**Before making decisions:**
1. Check `BidIntell_Product_Bible_v1_9.md` - Is this in scope?
2. Check `DATA_SAFETY_PROTOCOL.md` - Does this affect data?
3. Check `KNOWN_BUGS.md` - Is this already tracked?
4. Check memory file (auto-loads) - Any recent context?
5. Before ANY code change, read and follow BIDIQ_SKILL.md

**When user is frustrated:**
1. Check `MEMORY.md` - What happened recently?
2. Check git log - What changed today?
3. Offer to revert if needed
4. Focus on ONE issue at a time

---

## 🎯 SESSION GUIDELINES

### At Start of Session:

1. Read MEMORY.md (auto-loads)
2. Check git status
3. Ask: "What would you like to work on?"
4. Confirm understanding before starting

### During Session:

1. Commit before major changes
2. Fix one thing at a time
3. Test as you go
4. Keep user informed

### At End of Session:

1. Commit final state
2. Update KNOWN_BUGS.md if needed
3. Update MEMORY.md for next session
4. Summarize what was accomplished

---

## 🤔 DECISION FRAMEWORK

**When unsure, ask:**
1. "Does this affect data?" → YES = Extra caution
2. "Can this be reverted?" → NO = Get approval first
3. "Is this urgent?" → NO = Plan before coding
4. "Could this break something?" → MAYBE = Test first

**Default to:**
- ✅ Asking questions
- ✅ Reading existing code
- ✅ Making small changes
- ✅ Testing before committing

**Not:**
- ❌ Assuming what user wants
- ❌ Making big changes without approval
- ❌ "Fixing" things that aren't broken
- ❌ Working on multiple issues simultaneously

---

## 🔥 EMERGENCY PROCEDURES

### If Data Loss Detected:

1. **STOP ALL OPERATIONS**
2. Check Supabase dashboard - is data actually gone?
3. Check git history - can we revert?
4. Check for backups - restore-test-data.sql exists
5. Document what was lost in MEMORY.md
6. Help user restore from available backups

### If App is Broken:

1. Check what changed recently: `git log --oneline -5`
2. Check console for errors (ask user)
3. Offer to revert: `git revert HEAD`
4. If reverted, test works again
5. Then fix properly on separate branch

### If User is Frustrated:

1. Acknowledge their frustration
2. Take responsibility if deserved
3. Focus on fixing ONE specific thing
4. Don't try to "fix everything"
5. Offer to take a break if needed

---

## 💡 REMEMBER

**This project has:**
- Real user data (treat carefully)
- A paying user (respect their time)
- Production environment (test before deploy)
- Git safety net (use it)

**The goal is:**
- Help user build a successful product
- Move fast but don't break things
- Learn from mistakes (data loss on Feb 7)
- Build trust through reliability

**When in doubt:**
- Ask the user
- Check the Product Bible
- Read existing code
- Make small changes
- Test everything

---

**These rules exist because data was lost on Feb 7, 2026.**

**Never again.**
