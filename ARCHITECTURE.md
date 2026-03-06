# BidIQ Architecture Documentation

**Last Updated:** March 5, 2026
**Version:** 2.0 (full audit — line numbers removed, function names used)

---

## 🏗️ Overview

BidIQ is a **single-page application (SPA)** built with vanilla JavaScript, HTML, and CSS. No build tools. No frameworks. Hosted on Netlify with Supabase for the database and Netlify Functions for serverless backend.

**Live:** bidintell.ai
**Phase:** 1.5 Beta — Paid launch April 1, 2026

---

## 📂 File Structure

```
bidiq-mvp/
├── app.html                          # Main application (~15K lines)
├── auth.html                         # Magic link authentication flow
├── admin.html                        # Admin dashboard (metrics, costs, feedback)
├── index.html                        # Public landing page
├── contact.html                      # Contact page
├── legal.html                        # Terms / privacy
│
├── netlify/functions/
│   ├── analyze.js                    # AI API proxy (Claude/OpenAI)
│   ├── notify.js                     # Email notifications (Postmark)
│   ├── stripe-webhook.js             # Stripe event handler → user_revenue
│   ├── stripe-create-checkout.js     # Create Stripe checkout session
│   ├── stripe-create-portal.js       # Open Stripe billing portal
│   └── daily-snapshot.js            # Scheduled daily metrics → admin_metrics_snapshots
│
├── netlify.toml                      # Netlify config + scheduled function settings
├── .env                              # API keys (NOT in git)
│
├── CLAUDE.md                         # Rules for AI assistant
├── ARCHITECTURE.md                   # This file
├── SCHEMA.md                         # Database schema (10 tables, v2.0)
├── KNOWN_BUGS.md                     # Active bug list
├── DATA_SAFETY_PROTOCOL.md           # Database safety rules
├── contract_risk_detection_guide.md  # Contract risk clause patterns + prompts
├── BidIntell_Product_Bible_v1_9.md   # Product requirements (v1.9 is current)
│
├── supabase_schema_complete.sql      # Original schema (Jan 29, 2026 — baseline)
├── migrations/                       # SQL migration files (alter tables, etc.)
└── restore-test-data.sql            # Test data restore script
```

---

## 🎨 Frontend Architecture (app.html)

Single-page application with tab-based navigation. All UI, logic, and CSS live in one file.

### Tabs

| Tab | ID | Purpose |
|-----|----|---------|
| Dashboard | `tab-dashboard` | Stats, recent bids, setup banner, AI pulse |
| Analyze | `tab-analyze` | PDF upload, analysis flow, results |
| Projects | `tab-projects` | Bid history table, filtering, outcome tracking |
| Report | `tab-report` | Full-screen report view (not a nav tab — shown programmatically) |
| GC Manager | `tab-gcs` | Client database (all 7 client types) |
| Settings | `tab-settings` | Profile, CSI picker, scoring weights |
| Feedback | `tab-feedback` | Beta feedback form |

> **Tab detection:** Always use `classList.contains('active')` — NOT `style.display`. Tabs are shown/hidden via CSS class, not inline styles.

### Major JS Sections (by function, not line number)

**Initialization**
- Supabase client setup, `onAuthStateChange`, Google Maps Places loader
- `DEFAULT_SETTINGS` constant — fallback values for all settings

**Data / CRUD Layer**
- `getSettings()` / `saveSettingsStorage()` — user_settings table
- `getKeywords()` / `saveKeywordsStorage()` — user_keywords table (single-row arrays)
- `getClients(clientType)` / `saveClient(client)` — clients table
- `getProjects()` / `saveProject(data)` / `updateProject()` — projects table
- `trackAPIUsage()` — api_usage table (fire-and-forget)
- `dataCache` object — in-memory cache for all tables; invalidated on writes

**AI Extraction Layer**
- `analyzeBid()` — top-level orchestrator, called on file upload
- `extractTextFromPDF(file)` — PDF.js text extraction
- `callAI(action, text, prompt)` — POST to `/api/analyze` Netlify function
- `extractWithClaude(text)` — full project detail extraction
- `extractBuildingType(text)` — building type classification
- `detectContractRisks(text)` — two-layer risk detection (see contract_risk_detection_guide.md)
- `autoAddExtractedGCs(gcNames)` — auto-adds GCs found in bid to clients table

**Scoring Engine**
- `calculateScores(extracted, settings, goodFound, badFound, tradesFound, contractRisks, tradeDetection, gcNames, foundSections)` — main entry point
- Returns `{ final, recommendation, components: { location, keywords, gc, trade } }`
- Weights are user-configurable (stored as `weights` jsonb in user_settings)
- Default weights: Location 25% / Keywords 30% / GC 25% / Trade 20%

**Intelligence Engine (Layer 0)**
- `runIntelligenceEngine(extracted)` — validates completeness, adds intelligence tags
- `buildAIAdvisorPrompt(...)` — constructs context-aware AI advisor prompt
- `renderAIInsights(analysis)` — renders the AI advisor panel

**UI Rendering**
- `loadDashboard()` — loads stats, renders setup banner
- `renderSetupBanner(settings)` — amber banner if profile incomplete
- `renderProjectsTable(projects)` — project list with sort/filter
- `renderResult(analysis)` — post-analysis result card
- `showFullReport(projectId)` — full report view
- `renderCSIPicker(containerId, selectedSections, onChange)` — reusable CSI section picker
- `renderGCSelector()` — GC autocomplete with client type filtering

**Outcome Tracking**
- `saveOutcome(id, type, outcomeData, bidderCount, updatedDate)` — saves win/loss/ghost
- Saves `outcome_data` jsonb + `bid_divisions_submitted` + `gc_competition_density` record

**Admin (admin.html)**
- Separate file — admin-only metrics dashboard
- Reads `user_settings`, `projects`, `admin_events`, `admin_metrics_snapshots`, `api_usage`, `user_revenue`

---

## 🔄 Data Flow

### Bid Analysis Flow

```
User drops PDF in upload zone
    ↓
extractTextFromPDF(file)         — PDF.js, worker thread
    ↓
callAI('extract_project_details') — POST /api/analyze → Claude API
    ↓
extractBuildingType(text)        — parallel classification
detectContractRisks(text)        — two-layer: keyword patterns + Claude
    ↓
Received: extracted_data object
    ↓
calculateScores(...)             — location + keywords + gc + trade
    ↓
runIntelligenceEngine(extracted) — validation + intelligence tags
    ↓
autoAddExtractedGCs(gcNames)     — add found GCs to clients table
    ↓
saveProject(analysis)            — write to projects table
    ↓
renderResult(analysis)           — show result card
    ↓ (800ms delay)
Post-analysis nudge: "Chat with AI Advisor →" (if not yet clicked)
```

### Score Calculation Flow

```
calculateScores(extracted, settings, ...)
    ↓
1. Location Score
   geocodeAddress(projectAddress) → lat/lng
   calculateDistance(userLat, userLng, projLat, projLng)  — Haversine
   dist ≤ search_radius → 100pts; scales down beyond radius
   location_matters === false → score = 100 (ignored)

2. Keywords Score
   scan bid text for good_keywords[] → good_score
   scan bid text for bad_keywords[] → bad_penalty
   contract risk penalty applied separately

3. GC Score
   avg star rating of selected GCs
   competition density penalty (Module 4) if gc_competition_density data exists
   unknown GC → default_stars (user-configurable)

4. Trade/Section Score
   IF preferred_csi_sections configured:
     scan bid text for each section code (e.g. /09\s*65\s*00/i)
     score = foundSections.length / totalSections * 100
     scoring_mode = 'section'
   ELSE:
     scan for CSI division codes in bid text
     score = foundDivisions / userDivisions * 100
     scoring_mode = 'division'

5. Contract Risk Penalty
   risk_score_penalty (0-30) from detectContractRisks()
   scaled by user's risk_tolerance: low=1.0x, medium=0.6x, high=0.3x

6. Final = weighted sum - risk penalty
   GO ≥ 80 / REVIEW 60-79 / PASS < 60
```

---

## 🔌 Backend Functions (Netlify)

### `analyze.js` → `/api/analyze`

Proxy for AI API calls. Keeps keys server-side.

**Actions:**
- `extract_project_details` — Full project extraction (Claude, long text)
- `extract_building_type` — Building type classification
- `detect_contract_risks` — Contract risk analysis (see contract_risk_detection_guide.md)

**Tracks:** Every call writes to `api_usage` table via Supabase service-role client.

### `notify.js` → `/api/notify`

Sends email via Postmark. Used for error alerts to ryan@fsikc.com.

**From:** hello@bidintell.ai
**DNS:** SPF ✅ DKIM ✅ DMARC ✅ (p=none monitoring)
**Corporate IT note:** Some recipients (Microsoft 365 tenants) quarantine magic links — IT must whitelist bidintell.ai.

### `stripe-webhook.js` → `/api/stripe-webhook`

Handles Stripe events → writes to `user_revenue` table.

**Events handled:** `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`
**Security:** Stripe signature verification (STRIPE_WEBHOOK_SECRET env var)

### `stripe-create-checkout.js` / `stripe-create-portal.js`

Create Stripe sessions for checkout and billing portal management.

### `daily-snapshot.js`

Scheduled (cron via netlify.toml). Aggregates daily metrics → `admin_metrics_snapshots`.

---

## 🗄️ Database (Supabase)

10 tables. See **SCHEMA.md** for full column details.

**User data tables (RLS enforced):**
- `user_settings` — profile, preferences, weights, CSI sections (1:1 per user)
- `user_keywords` — good/bad keyword arrays, single row per user
- `clients` — all client types (GCs, subs, owners, etc.) — formerly `general_contractors`
- `projects` — analyzed bids with scores, outcomes, AI output
- `gc_competition_density` — bidder count per GC per outcome (Module 4)

**System tables:**
- `user_revenue` — Stripe subscription data (written by webhook only)
- `api_usage` — per-call AI cost tracking
- `beta_feedback` — in-app feedback submissions
- `admin_events` — behavioral event log (fire-and-forget)
- `admin_metrics_snapshots` — daily aggregated metrics

> ⚠️ **Critical name corrections:** Table is `clients` (NOT `general_contractors`). Table is `user_keywords` (NOT `keywords`). `user_keywords` is single-row with array columns.

---

## 🔐 Authentication Flow

**Method:** Magic link only. No passwords. Supabase Auth sends email via Postmark.

```
User enters email on auth.html
    ↓
Supabase sends magic link → hello@bidintell.ai via Postmark
    ↓
User clicks link → redirected to app.html?token=...
    ↓
auth.html verifyOtp() exchanges token for session
    ↓
Redirect to app.html
    ↓
onAuthStateChange fires → currentUser set
    ↓
getSettings() — creates default row if first login
getKeywords() — creates default row if first login
    ↓
loadDashboard() → app ready
```

**Session:** Supabase manages tokens. Auto-refreshes. Persists across page refreshes.

---

## 🗂️ State Management

Global variables (no state library):

```javascript
let currentUser = null;              // Supabase auth user
let currentAnalysis = null;          // Most recent analysis result
let currentReportProject = null;     // Project shown in report view
let selectedGCs = [];                // GCs selected for current analysis
let uploadedFiles = [];              // Files in upload queue
let allProjectsCache = [];           // Projects cache (for filtering/sorting)
let settingsCSISections = [];        // CSI picker selections (Settings tab state)
const dataCache = {                  // Per-table cache
  settings: null,
  keywords: null,
  clients: null,
  gcs: null,  // legacy alias for clients
};
```

Cache is invalidated on every write. Tables are re-fetched on next access.

---

## 🎯 Scoring Weights

Weights are **user-configurable** per user, stored as `weights` jsonb in `user_settings`.

**Defaults:**
| Component | Default Weight |
|-----------|---------------|
| Location | 25% |
| Keywords | 30% |
| GC/Client | 25% |
| Trade/Section | 20% |

Weights must sum to 100. Users can adjust in Settings. Applied in `calculateScores()`.

---

## 🧩 Key Functions Reference

### Data Layer

| Function | Table | Notes |
|----------|-------|-------|
| `getSettings()` | user_settings | Cached; creates defaults for new users |
| `saveSettingsStorage(s)` | user_settings | Upsert on user_id |
| `getKeywords()` | user_keywords | Single row per user; creates defaults |
| `saveKeywordsStorage(k)` | user_keywords | Upsert on user_id |
| `getClients(clientType)` | clients | Optional type filter |
| `saveClient(client)` | clients | Upsert on id |
| `getGCs()` | clients | Legacy wrapper → getClients('general_contractor') |
| `getProjects()` | projects | Full list for current user |
| `saveProject(data)` | projects | Insert new; returns saved project with id |
| `updateProject(id, data)` | projects | Partial update |
| `saveOutcome(...)` | projects + gc_competition_density | Also saves bid_divisions_submitted |
| `trackAPIUsage(...)` | api_usage | Fire-and-forget, failures swallowed |

### Analysis

| Function | Purpose |
|----------|---------|
| `analyzeBid()` | Top-level orchestrator |
| `extractTextFromPDF(file)` | PDF.js extraction + OCR fallback check |
| `callAI(action, text, prompt)` | POST to /api/analyze |
| `extractWithClaude(text)` | Full project extraction |
| `detectContractRisks(text)` | Keyword pre-filter + Claude semantic analysis |
| `calculateScores(...)` | BidIndex scoring (9 params including foundSections) |
| `autoAddExtractedGCs(gcNames)` | Auto-add GC names to clients table |

### UI

| Function | Purpose |
|----------|---------|
| `loadDashboard()` | Renders dashboard + setup banner |
| `renderSetupBanner(settings)` | Amber "complete your profile" banner |
| `renderProjectsTable(projects)` | Projects list with sort/filter |
| `renderResult(analysis)` | Post-analysis result card |
| `showFullReport(projectId)` | Full report view |
| `renderCSIPicker(containerId, selected, onChange)` | CSI MasterFormat section picker |
| `renderGCSelector()` | GC autocomplete with client type tabs |
| `renderAIInsights(analysis)` | AI advisor panel (id="aiInsightsSection") |
| `toggleAIChat()` | Opens AI chat; clears pulse animation |

---

## 📦 Dependencies

### Frontend (CDN, no npm)
- **PDF.js** — PDF parsing (Mozilla CDN)
- **Supabase JS** — Database client
- **Google Maps Places API** — Address autocomplete

### Backend (npm, in netlify/functions/)
- **@anthropic-ai/sdk** — Claude API
- **openai** — OpenAI fallback
- **postmark** — Email
- **@supabase/supabase-js** — DB access from functions
- **stripe** — Stripe SDK

### Environment Variables
```
CLAUDE_API_KEY
OPENAI_API_KEY
POSTMARK_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   ← service role for webhook + admin reads
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GOOGLE_MAPS_API_KEY
```

---

## 🚀 Development Workflow

```bash
# Start local dev with Netlify functions
netlify dev
# App at http://localhost:8888
```

1. `git add -A && git commit -m "Before: [description]"` — always commit first
2. Make changes
3. Test locally
4. `git commit -m "Fixed/Added: [description]"`
5. Deploy via Netlify (auto-deploy on push, or manual in dashboard)

---

## 🐛 Error Handling Conventions

- **Data reads:** `maybeSingle()` for optional records, `single()` only after guaranteed creation
- **Fire-and-forget:** `admin_events`, `trackAPIUsage()` — failures are console.warn'd, never thrown
- **Critical path errors:** thrown and caught by `analyzeBid()`, shown to user
- **Date validation:** Always `isNaN(date.getTime())` — `new Date(invalid)` doesn't throw

---

## 📞 Getting Help

1. Check **SCHEMA.md** — table structure and column names
2. Check **CLAUDE.md** — rules, gotchas, and recent patterns
3. Check **KNOWN_BUGS.md** — active issues
4. Check **BidIntell_Product_Bible_v1_9.md** — product scope
5. Search app.html for function name (Ctrl+F) — no line numbers needed

**Common Q&A:**
- "Where's the scoring logic?" → `calculateScores()` function
- "Why isn't data saving?" → Check console → verify RLS policies → check `dataCache` invalidation
- "How do I add a table column?" → SCHEMA.md migration guide → run in Supabase SQL editor → update SCHEMA.md
- "Which table stores GCs?" → `clients` (NOT general_contractors)
- "How do keywords work?" → `user_keywords` table, single row, `good_keywords[]` / `bad_keywords[]` arrays

---

**Last Updated:** March 5, 2026 by Claude Code
**Version:** 2.0
