# BidIntell Moat-First Product Strategy
**Version:** 1.0 | **Date:** April 8, 2026 | **Author:** Ryan Elder + Claude

---

## Executive Summary

The moat is **not** the AI scoring. Any LLM can score a bid. The moat is:

1. **The outcome corpus** — win rates, margins, decline reasons, bidder counts, per-GC behavioral history. Nobody else has this data.
2. **Personalized BidIndex** — scoring weights tuned to each sub's business (already architected; needs full 5-dimension extension).
3. **The GC dossier** — years of behavioral signals per contractor, irreplaceable after 12 months.
4. **The override loop** — labeled training data from real estimators disagreeing with AI.
5. **The benchmark network** — anonymized cross-user intelligence that improves with scale.

Everything else is either substrate (must work) or parity (keep small).

---

## 1. Feature Moat Scoring

Scores 1–5 across five dimensions:
- **Data Moat** — proprietary data that compounds over time
- **Workflow Lock-in** — makes BidIntell the daily GO/NO-GO decision tool
- **Network Effect** — more users → better product for all users
- **Domain Depth** — construction-native, hard for generic AI to replicate
- **Revenue/Retention** — drives paid retention and plan upgrades

| Feature | Data Moat | Workflow Lock-in | Network Effect | Domain Depth | Rev/Retention | **Composite** | Tag |
|---|---|---|---|---|---|---|---|
| GC/client behavior profiles | 5 | 5 | 3 | 5 | 5 | **4.6** | **Moat** |
| Outcome capture (win/loss/no-bid) | 5 | 4 | 4 | 4 | 5 | **4.4** | **Moat** |
| Competitive Pressure Score | 5 | 4 | 4 | 5 | 4 | **4.4** | **Moat** |
| Personalized BidIndex weights | 4 | 5 | 1 | 5 | 5 | **4.0** | **Moat** |
| AI learning / outcome-trained recs | 5 | 4 | 3 | 5 | 5 | **4.4** | **Moat** |
| No-bid / declined reason capture | 5 | 3 | 4 | 5 | 4 | **4.2** | **Moat** |
| Estimator override loop | 5 | 4 | 3 | 5 | 4 | **4.2** | **Moat** |
| Project twin finder | 5 | 4 | 3 | 5 | 4 | **4.2** | **Moat** |
| Cross-user win-rate benchmarks | 4 | 3 | 5 | 4 | 4 | **4.0** | **Moat** |
| Win/Loss analytics dashboard | 5 | 4 | 3 | 4 | 5 | **4.2** | **Moat** |
| Capacity vs. pursuit portfolio view | 3 | 5 | 1 | 4 | 5 | **3.6** | **Moat** |
| GC relationship score | 4 | 4 | 2 | 4 | 4 | **3.6** | **Moat** |
| Inbound email forwarding | 2 | 5 | 1 | 3 | 5 | **3.2** | **Moat** |
| CSI section picker / trade match | 3 | 4 | 1 | 5 | 3 | **3.2** | **Moat** |
| AI bid scoring (GO/REVIEW/PASS) | 2 | 4 | 1 | 4 | 4 | **3.0** | Parity |
| Contract risk detection | 3 | 3 | 1 | 4 | 3 | **2.8** | Parity |
| Bid Risk flag | 3 | 3 | 1 | 4 | 3 | **2.8** | Parity |
| Team tab / multi-user | 1 | 4 | 1 | 2 | 5 | **2.6** | Parity |
| Keyword / good-bad terms | 2 | 4 | 1 | 3 | 3 | **2.6** | Parity |
| Bid economics dashboard | 2 | 4 | 2 | 3 | 4 | **3.0** | Parity |
| Bid report (display) | 1 | 3 | 1 | 3 | 3 | **2.2** | Parity |
| Onboarding wizard | 1 | 3 | 1 | 2 | 3 | **2.0** | Parity |
| BuildingConnected sync | 2 | 3 | 1 | 3 | 3 | **2.4** | Parity |
| Works-with SEO pages | 1 | 1 | 1 | 1 | 2 | **1.2** | Commodity |
| Demo form / Pipedrive | 1 | 1 | 1 | 1 | 2 | **1.2** | Commodity |

---

## 2. Moat-First Roadmap (Q2–Q4 2026)

### Phase 1 — Core Decision Substrate *(Q2: April–May)*
**Goal:** Every bid scored reliably. Every recommendation explainable. Users trust the score.

**Min feature set:**
- BidIndex stable across all trade types (no silent failures, no 0-score components)
- All 5 scoring dimensions firing correctly (see Section 3)
- Personalized weights UI fully functional and prominently placed in Settings
- Outcome modal always surfaced after bid closes (habit formation)
- Inbound email forwarding stable (PDF size limit resolved)

**Why it increases defensibility:**  
Nothing compounds if the substrate is unreliable. Users who don't trust the score won't log outcomes. Every unlogged outcome is a permanently lost data point.

**Success metrics:**
- ≥ 80% of uploaded bids produce a valid GO/REVIEW/PASS within 30s
- Zero silent failures on outcome saves
- ≥ 3 bids scored per active user per month

---

### Phase 2 — Proprietary Data Capture & Feedback Loops *(Q2–Q3: May–July)*
**Goal:** BidIntell learns from every decision you make.

**Min feature set:**
- **Outcome capture completeness:** Require win amount + margin on WON; "how high were you?" + winner name on LOST; structured decline reasons on PASSED; no-bid reason codes on NOT INVITED
- **Estimator override loop:** Capture override direction + reason when user changes AI recommendation
- **No-bid as first-class outcome:** Distinguish "chose not to bid" from "lost" (see PRD 1)
- **GC profile cards:** Win rate, avg margin, ghost rate, RFI responsiveness per GC
- **Hours-spent field:** Surface prominently; drive ROI dashboard card
- **Competitive Pressure activation:** Prompt for bidder count on every WON/LOST outcome; show activation progress

**Why it increases defensibility:**  
This is where the moat starts compounding. After 50 logged outcomes, BidIntell knows things about a sub's business that no competitor can reconstruct. Every override is a labeled training example. Every no-bid reason is a strategic filter no generic AI has.

**Success metrics:**
- ≥ 60% of PASS decisions have a logged decline reason within 60 days
- ≥ 50% of WON outcomes have margin captured
- ≥ 80% of active accounts have ≥ 5 outcomes logged after 90 days

---

### Phase 3 — Networked & Behavioral Intelligence *(Q3: July–September)*
**Goal:** GC behavior is a first-class data object. Cross-user signals begin.

**Min feature set:**
- **GC behavior cards:** Per-GC profile showing avg bidder count, ghosting rate, win rate, payment notes, scope clarity, RFI responsiveness
- **Project twin finder:** Surface 2–3 most similar past bids (by GC, building type, trade, location) + their outcomes and margins
- **Anonymous cross-user benchmarks:** "Subs in your trade typically see X bidders on this GC's jobs" — activates at ≥ 10 contributing users per bucket
- **Competitive Pressure explainer:** Visual showing avg bidder count trend per GC over time, with margin correlation
- **AI recalibration:** Use per-user outcome history to adjust recommendation thresholds (users with 80%+ win rate on 70-score bids get a lower GO threshold)

**Why it increases defensibility:**  
GC behavior cards make BidIntell the institutional memory for how specific GCs behave — not just "good" or "bad" but *predictively*. Project twins make the data tangible: "We won a job just like this at 22% margin." Cross-user benchmarks are the first true network effect.

**Success metrics:**
- ≥ 5 GC behavior cards populated per active account (requires ≥ 5 outcomes per GC)
- Twin finder surfaced on ≥ 30% of bid reports after ship
- At least 1 trade vertical with ≥ 10 users contributing to cross-user benchmarks

---

### Phase 4 — Portfolio & Management Layer *(Q4: October–December)*
**Goal:** BidIntell moves from "estimator tool" to "pursuit management system." Owner/principal retention.

**Min feature set:**
- **Capacity vs. pursuit view:** Open bids in flight, estimated hours, capacity headroom, overbidding flag
- **Pursuit pipeline:** Status board (scoring → submitted → awarded/lost) replacing the flat project list
- **Win-rate analytics:** Win rate by GC, building type, trade, geography — where do we actually win?
- **Team win/loss visibility:** Org-level outcome rollup for Company plan
- **Monthly summary email:** Auto-generated — bids scored, won, lost, total contract value, win rate trend

**Why it increases defensibility:**  
The management layer creates organizational lock-in. When the owner uses BidIntell for the weekly pipeline meeting, it's embedded in the business process — not just an individual estimator's tool. This justifies Company pricing and makes churn very hard.

**Success metrics:**
- ≥ 50% of Company accounts use capacity view in first 30 days
- Monthly email open rate ≥ 40%
- Company-plan churn ≤ 5% quarterly

---

### Phase 5 — Adoption Parity Features *(Q4+, only if blocking growth)*
- Mobile-responsive polish (unblock iPhone/iPad estimators)
- BuildingConnected auto-import (only if ISV partnership advances)
- Bulk CSV bid history import
- SSO/SAML (Enterprise only, on-demand)

---

## 3. Upgraded BidIndex Scoring Model

### 3a. Current Model (as-is)

```
BidIndex = Σ (component_score × weight / 100)

Components + default weights (user-adjustable today):
  location     25%  — distance from service area
  keywords     30%  — good/bad keyword hits + contract risk penalty
  gc           25%  — star rating × bid history weight + ghost penalty
  trade        20%  — CSI section match (presence-floor model)
  competitive   +0  — bonus when gc_competition_density has ≥3 records
```

**What exists today:** `user_settings.weights` JSONB field stores per-user weights. Settings tab has sliders for all 4 components. Onboarding sets defaults based on company type.

---

### 3b. The Core Principle: Weights Must Be Personalized

This is the single most important architectural decision in BidIntell.

A flooring sub in a dense metro market weights **location** differently than a specialty mechanical contractor who works nationally. A company with deep GC relationships weights **GC score** higher than a startup chasing any open bid. A high-volume estimator in government work weights **contract risk** much higher than a repeat-customer commercial sub.

**No fixed weight set is right for all users.** The power of BidIntell is that the score means something specific to *this company's* risk tolerance and business model — not an industry average.

**Today:** 4 weights, sliders in Settings. ✅ Already correct architecture.  
**Tomorrow:** Expand to 5 dimensions, each with user-adjustable weight AND sub-weights within each dimension.

---

### 3c. Proposed 5-Dimension Framework

```
BidIndex = (Strategic Fit    × W1)
         + (Execution Risk   × W2)
         + (Commercial Risk  × W3)
         + (Win Likelihood   × W4)
         + (Margin Posture   × W5)

Where W1 + W2 + W3 + W4 + W5 = 100% (enforced by UI)
Default: W1=30, W2=25, W3=20, W4=15, W5=10
```

Each dimension also has internal sub-weights (also user-adjustable at advanced settings level):

---

#### Dimension 1: Strategic Fit (default 30%)
*"Is this the type of work we want and can win?"*

| Signal | Source | Today? | User can weight? |
|---|---|---|---|
| Trade / CSI section match | CSI section config | ✅ | Via top-level trade weight |
| Building type preference | `user_settings.preferred_building_types[]` | ❌ | ❌ |
| Location match | Geocoded distance | ✅ | Via top-level location weight |
| Project size vs. sweet spot | `user_settings.min_project_size / max_project_size` | ❌ | ❌ |
| Historical win rate in this building type | Derived from outcomes | ❌ | — auto |

**New user_settings fields:**
```json
{
  "preferred_building_types": ["Office", "Healthcare", "Industrial"],
  "min_project_size": 50000,
  "max_project_size": 5000000
}
```

**User weight control:** Single slider for "Strategic Fit" weight (W1). Advanced mode: separate sliders for trade vs. location vs. building type sub-weights.

---

#### Dimension 2: Execution Risk (default 25%)
*"Can we deliver this without getting burned?"*
*(Inverted: lower risk = higher score)*

| Signal | Source | Today? | User can weight? |
|---|---|---|---|
| Vague scope flags | `extracted.vague_scope` | ✅ (in Bid Risk only) | ❌ |
| Contract risk clause density | `contractRisks.risks[]` | ✅ (as penalty) | Via risk_tolerance |
| Rushed timeline | `bid_deadline` < 10 days | ✅ (in Bid Risk only) | ❌ |
| Spec completeness | `extracted.has_complete_specs` (new) | ❌ | ❌ |
| User's risk tolerance setting | `user_settings.riskTolerance` | ✅ | ✅ |

**Key point:** `riskTolerance` already controls the keyword penalty multiplier (5/10/15). Extend this to all execution risk signals, not just keywords.

**New extraction fields (in analyze.js):**
```json
{
  "has_complete_specs": true/false,
  "addenda_count": 0,
  "scope_sections_count": 12
}
```

**User weight control:** W2 slider. Plus existing risk_tolerance radio (low/medium/high) which scales all execution risk penalties proportionally.

---

#### Dimension 3: Commercial Risk (default 20%)
*"Are the business terms worth bidding?"*
*(Inverted: lower risk = higher score)*

| Signal | Source | Today? | User can weight? |
|---|---|---|---|
| Bad keywords (unfavorable payment/liability terms) | User bad keywords list | ✅ | ✅ (via keywords weight) |
| Contract language presence | `extracted.has_contract_language` | ✅ | ✅ (via risk_tolerance) |
| Retainage % | `extracted.retainage_pct` (new) | ❌ | ❌ |
| Liquidated damages | `extracted.liquidated_damages` (new) | ❌ | ❌ |
| Bid shopping language | `extracted.bid_shopping_language` | ✅ (in Bid Risk) | ❌ |
| User retainage threshold | `user_settings.max_retainage_pct` (new) | ❌ | ❌ |

**New user_settings field:**
```json
{
  "max_retainage_pct": 10,
  "flag_liquidated_damages": true
}
```

**New extraction fields:**
```json
{
  "retainage_pct": 10,
  "liquidated_damages_per_day": 500,
  "liquidated_damages_present": true
}
```

**User weight control:** W3 slider. Plus per-term threshold settings ("flag if retainage > X%").

---

#### Dimension 4: Win Likelihood (default 15%)
*"Given this GC, this market — what are our real odds?"*

| Signal | Source | Today? | User can weight? |
|---|---|---|---|
| GC relationship score | Star rating + bids/wins ratio | ✅ | Via gc weight |
| Win rate with this specific GC | Derived from outcomes | ❌ | — auto |
| Competitive pressure / avg bidder count | `gc_competition_density` | ✅ (partial) | ❌ |
| GC ghosting history | `gc_tags` includes ghost_risk | ✅ | ❌ |
| First-time GC (no history) | `gc.bids === 0` | ✅ (in Bid Risk) | ❌ |
| Cross-user GC win rate benchmark | `benchmark_cache` (future) | ❌ | — auto |

**New view (no new table, derived from existing data):**
```sql
CREATE VIEW gc_win_rate_summary AS
SELECT
  user_id,
  b->>'gc_name' AS gc_name,
  COUNT(*) FILTER (WHERE b->>'outcome' = 'won') AS wins,
  COUNT(*) FILTER (WHERE b->>'outcome' IN ('won','lost')) AS bids,
  ROUND(
    COUNT(*) FILTER (WHERE b->>'outcome' = 'won')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE b->>'outcome' IN ('won','lost')), 0) * 100, 1
  ) AS win_rate_pct
FROM projects p, jsonb_array_elements(p.gc_bids) b
GROUP BY user_id, b->>'gc_name';
```

**User weight control:** W4 slider. Advanced mode: separate sub-weight for "GC relationship" vs. "competitive pressure" within this dimension.

---

#### Dimension 5: Margin Posture (default 10%)
*"Based on similar past wins — what margin should we expect here?"*

This dimension **does not exist today** and has the highest long-term moat value. It requires outcome data to activate.

| Signal | Source | Today? | User can weight? |
|---|---|---|---|
| Avg margin on won bids — same GC | `outcome_data.margin` (won outcomes) | Captured, not used | — auto |
| Avg margin on won bids — same building type | Derived from outcomes | ❌ | — auto |
| User's target margin threshold | `user_settings.target_margin` | ✅ (field exists) | ✅ |
| Competitive pressure vs. margin correlation | `gc_competition_density + outcomes` | ❌ | — auto |
| Hours-per-dollar ratio on similar wins | `outcome_data.hours_spent / amount` | Captured, not used | — auto |

**New table:**
```sql
CREATE TABLE margin_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_type TEXT,
  gc_name TEXT,
  csi_division TEXT,
  sample_count INTEGER NOT NULL,
  avg_margin_pct NUMERIC(5,2),
  p25_margin_pct NUMERIC(5,2),
  p75_margin_pct NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
*Populated by `saveOutcome()` whenever margin is captured on a WON outcome.*

**Score formula:**
```js
// marginPostureScore = 0–100
// If historical margin data exists for this GC + building type:
//   Compare extracted project signals to user's target_margin
//   High expected margin vs. target = score 80+
//   Margin risk (dense competition, complex scope) = score 40–
// If no data yet: score = 50, weight = 0 (activates when sample_count >= 3)
```

**User weight control:** W5 slider. Plus existing `target_margin` field in user_settings.

---

### 3d. Weight Storage and UI (Implementation Spec)

**Current schema (user_settings.weights):**
```json
{ "location": 25, "keywords": 30, "gc": 25, "trade": 20 }
```

**Proposed schema — backward compatible:**
```json
{
  "strategic_fit": 30,
  "execution_risk": 25,
  "commercial_risk": 20,
  "win_likelihood": 15,
  "margin_posture": 10,

  "_legacy": {
    "location": 25,
    "keywords": 30,
    "gc": 25,
    "trade": 20
  },

  "advanced": {
    "strategic_fit_location_pct": 50,
    "strategic_fit_trade_pct": 35,
    "strategic_fit_buildingtype_pct": 15,
    "win_likelihood_gc_relationship_pct": 60,
    "win_likelihood_competitive_pressure_pct": 40
  }
}
```

**Migration path:**
1. On first load after upgrade, auto-migrate legacy weights → new 5-dimension defaults
2. Show a one-time "We upgraded your scoring model — review your weights" banner
3. Keep `_legacy` for the first 60 days so we can roll back if needed

**Settings UI:**
- Primary: 5 sliders with live "must sum to 100%" enforcement (same pattern as current 4-slider UI)
- Advanced accordion (collapsed by default): sub-weight sliders within each dimension
- Preset buttons: "Relationship-focused" / "Margin-focused" / "Volume-focused" / "Risk-averse" — sets weights to opinionated presets the user can then fine-tune
- Show "Your scoring profile" summary: dominant weight gets a label ("You're a margin-first shop based on your weights")

**Enforcement in calculateScores():**
```js
// Normalize weights to 100% before any calculation
const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
const normalizedWeights = Object.fromEntries(
  Object.entries(weights).map(([k, v]) => [k, (v / totalWeight) * 100])
);
```

---

### 3e. Estimator Override Feedback Loop

When a user changes the AI recommendation, capture it:

**New column on projects:**
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS
  estimator_override JSONB;

-- Structure:
-- {
--   original_rec: 'PASS',
--   override_rec: 'GO',
--   reason_category: 'relationship' | 'capacity' | 'margin' | 'scope' | 'market' | 'other',
--   reason_text: 'Owner called me directly',
--   timestamp: '2026-04-08T...'
-- }
```

**Auto-calibration (Phase 3 feature):**
- Track override patterns per user
- If user overrides GO→PASS 5+ times on bids with high execution risk → auto-suggest: "Raise your Execution Risk weight"
- If user overrides PASS→GO on bids with good GC scores → auto-suggest: "Raise your Win Likelihood weight"
- Surface in Settings: "Based on your last 30 overrides, your scoring weights may not match how you actually decide"

---

## 4. Mini-PRDs for Top Moat Features

---

### PRD 1: No-Bid Capture (First-Class Outcome)

**Job to be done:**  
"I was invited to bid but chose not to. I need to track that decision so BidIntell learns what I systematically avoid."

**Gap today:**  
`declined` outcome exists but conflates "I submitted and lost the opportunity" with "I never bid in the first place." No-bid data is invisible.

**Data to capture:**
```js
// No-bid reasons (structured checkboxes):
const NO_BID_REASONS = [
  'capacity',           // Too busy
  'wrong_trade',        // Not our scope
  'poor_gc_relationship',
  'bad_location',
  'bad_contract_terms',
  'too_many_bidders',
  'below_min_size',
  'insufficient_lead_time',
  'gc_never_pays',
  'owner_relationship'
];

// Free text: outcomeData.no_bid_notes
// Hours spent evaluating: outcomeData.hours_spent (even 20 min = data)
```

**No schema changes needed** — fits in existing `outcome_data` JSONB on `projects`.

**Moat impact:**  
No-bid data is the most under-leveraged signal in construction. It tells you *why good subs don't bid* — a dataset that has never existed. Cross-user: "Subs in your market are passing on [GC] at 3x normal rate — top reasons: bad contract terms, ghost risk."

**v1 scope:**  
- Add "No Bid" as fifth outcome type in `outcomeModal`
- Show structured reason checkboxes (same pattern as `declined`)
- Track in analytics as a distinct category
- Time: ~2 hours

---

### PRD 2: Estimator Override Loop

**Job to be done:**  
"The AI said PASS but I know this GC personally. I want to override it — and I want the app to learn that."

**Gap today:**  
Score is displayed, recommendation is shown, but there is no mechanism to record disagreement or learn from it.

**UI flow:**
1. User sees PASS recommendation on report
2. Small "Override Decision" link below the chip
3. Modal: "Change to: [GO] [REVIEW]" + reason dropdown + optional text
4. Saves to `projects.estimator_override` JSONB
5. Dashboard shows override badge: "You overrode AI on 3 bids this month"

**Data schema:**
```sql
-- projects table, new column:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS
  estimator_override JSONB;
-- { original_rec, override_rec, reason_category, reason_text, timestamp }
```

**Moat impact:**  
Every override is a labeled training example. After 50+ overrides, you can identify per-user calibration patterns and auto-adjust weights. The personalized model becomes impossible to recreate on a competitor's platform.

**v1 scope:** Capture only. No auto-calibration yet. ~3 hours.

---

### PRD 3: GC/Client Behavior Cards

**Job to be done:**  
"Before I spend time on this bid, I want to know: does this GC answer RFIs? Do they ghost? Have I won with them before? Do they have payment issues?"

**Current state:**  
Star rating + bid count + win count. No behavioral signals.

**New fields on clients table:**
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS
  rfi_responsiveness INTEGER CHECK (rfi_responsiveness BETWEEN 1 AND 5),
  scope_clarity_avg NUMERIC(3,1),
  payment_flag BOOLEAN DEFAULT false,
  payment_notes TEXT,
  relationship_notes TEXT,
  last_ghosted_date DATE,
  first_bid_date DATE,
  last_bid_date DATE;
```

**Capture flow:**
- On outcome form: add "Did this GC answer your RFIs?" (1–5) and "Scope clarity?" (1–5)
- On ghost outcome: auto-populate `last_ghosted_date`
- On GC edit modal: add "Payment notes" textarea + "Slow pay" toggle

**Card display (Clients tab):**
- Win rate with this GC (from outcomes)
- Avg margin on won bids (from outcomes)
- RFI responsiveness (from outcome ratings)
- Ghost count + last ghosted date
- Payment flag chip if set
- Relationship tenure (first bid to today)

**Moat impact:**  
This GC intelligence library is irreplaceable after 12 months of use. No competitor can reconstruct it without years of behavioral data. Switching cost = the entire dossier.

**v1 scope:** Add RFI responsiveness and payment flag. Display on GC card. ~4 hours.

---

### PRD 4: Project Twin Finder

**Job to be done:**  
"Show me the most similar jobs I've already bid so I can gut-check this recommendation."

**Logic:**
```js
function findProjectTwins(currentExtracted, currentGCs, allProjects, maxResults = 3) {
  return allProjects
    .filter(p => p.outcome && p.id !== currentProjectId)  // must have outcome
    .map(p => {
      let score = 0;
      // GC match = highest signal
      if (currentGCs.some(g => p.gcs?.some(pg => pg.name === g.name))) score += 4;
      // Building type match
      if (p.extracted?.building_type === currentExtracted.building_type) score += 3;
      // CSI division match (first 2 digits)
      if (sharesCSIDivision(p, currentExtracted)) score += 2;
      // Same metro (within 30 miles)
      if (sameMetro(p, currentExtracted)) score += 1;
      return { project: p, similarity: score };
    })
    .filter(t => t.similarity >= 3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}
```

**Display on report:**  
"Similar Past Projects" card below score breakdown. Each twin shows: project name, bid date, BidIndex score chip, outcome chip, margin if won.

**No new table or schema changes needed** — runs over `allProjectsCache`.

**Moat impact:**  
Every twin surfaced demonstrates the value of logged outcomes. Users who see twins log future outcomes at much higher rates. The feature is self-reinforcing.

**v1 scope:** Client-side query over cached projects, simple scoring function. ~3 hours.

---

### PRD 5: Competitive Pressure Explainer

**Job to be done:**  
"The competitive pressure score said 38 — what does that actually mean and what should I do about it?"

**Current state:**  
Score and weight display. "Need X more outcomes to activate." No explanation, no guidance.

**Additions:**
- Plain-language summary: "On your last 7 [GC] jobs, an average of 6.2 subs bid. At that density, someone is likely to miss scope — margin pressure is high."
- Data transparency: Show the specific past projects used to compute the score
- Guidance text: "With 5+ bidders, consider whether your margin has room to compress. At this density, a REVIEW may be more appropriate than GO unless your GC relationship is strong."
- Onboarding nudge: When score inactive (<3 records), show: "Log outcomes on 3 more bids with [GC] to activate this signal — it's one of BidIntell's most accurate."

**UI changes:**  
Expand the competitive card in `renderScoreBreakdown()` with explanation text and data point list. No schema changes.

**Moat impact:**  
Explains the value of outcome logging at the exact moment the user needs it. Drives the data flywheel.

**v1 scope:** ~2 hours.

---

### PRD 6: Win-Rate Analytics Dashboard

**Job to be done:**  
"Where do we actually win? I want to know by GC, by building type, by geography — not guess."

**Data source:**  
Existing `projects` table with `gc_bids[].outcome`. No new tables needed. Build the SQL view described in Section 3d.

**Display:**  
New "Analytics" card/tab. Three views:
1. **Win rate by GC** — sorted descending. "You win 41% with Hensel Phelps, 9% with Turner."
2. **Win rate by building type** — "Office: 38%, Healthcare: 12%, Government: 27%."
3. **Score vs. outcome correlation** — "GO-scored bids: 52% won. REVIEW: 28%. PASS: 4%." (validates the model)

**Moat impact:**  
The correlation chart is the single most powerful retention tool — it proves BidIntell works. When a principal uses the GC win-rate table to allocate estimating time, BidIntell is embedded in business strategy.

**v1 scope:** Simple table view (no charts yet). Aggregate from cached projects. ~4 hours.

---

### PRD 7: Cross-User Win-Rate Benchmarks *(Phase 3)*

**Job to be done:**  
"Am I winning at a normal rate with Mortenson, or are other subs outperforming me?"

**Architecture:**
- Anonymous aggregates only — never expose another user's data or company name
- Bucket by: `gc_name + metro + csi_division_2digit`
- Minimum 5 contributing users per bucket (privacy floor)
- Edge Function refreshes nightly, writes to `benchmark_cache`

**New table:**
```sql
CREATE TABLE benchmark_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_name TEXT NOT NULL,
  metro TEXT,
  csi_division TEXT,
  avg_win_rate_pct NUMERIC(5,2),
  p25_win_rate_pct NUMERIC(5,2),
  p75_win_rate_pct NUMERIC(5,2),
  sample_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- No RLS needed — this is aggregate/anonymous data
```

**Display:**  
On GC behavior card: "Your win rate with [GC]: 34%. Benchmark for flooring subs in KC: 22%. You're in the top quartile."

**Moat impact:**  
This is the true network effect. The product gets meaningfully better as users join — and users can see it getting better. Only possible with proprietary outcome data. Procore can't build this from project management data.

**v1 scope:** Build the schema and Edge Function now. Surface the UI card with "Not enough data yet — invite peers in your market" until the 5-user threshold is met. ~6 hours.

---

## 5. Anti-Roadmap

| Feature | Problem | Action |
|---|---|---|
| **BuildingConnected auto-sync** | High effort (Autodesk ISV approval unresolved, OSS bucket access unverified). BC data is available to any tool that integrates — no proprietary data advantage. | **Push to Q4 or cut.** Only pursue if ISV partnership advances independently. Do not block other moat work on it. |
| **Works-with SEO pages** | Pure marketing/SEO. Zero product moat. Generic AI can replicate the same positioning. | **Already built — do not expand.** No further investment. |
| **AI advisor personality / tone picker** | Users don't care after week 1. Adds onboarding friction, zero retention value, zero moat. | **Remove from onboarding.** Keep setting buried for power users only. |
| **Contract risk detection as standalone feature** | Generic LLMs do contract review. Competing with Harvey, Ironclad, ChatGPT. No proprietary data. | **Keep as a signal inside BidIndex only.** Do not market or build it as a standalone surface. |
| **Custom report printing / PDF export** | Nice-to-have polish. Every user asks, zero churn over it. | **Push to Q4.** Only build if an Enterprise deal requires it. |
| **SSO / SAML** | Only matters for 50+ seat Enterprise. Current plan is 1–8 seats. | **Do not build until a real Enterprise prospect demands it.** |
| **Bulk CSV import** | High surface area for data quality issues. Parity with any SaaS tool — no moat. | **Push to Q4.** Only build if 3+ paying prospects cite it as a blocker. |
| **Demo form / Calendly** | Sales tooling. Necessary but not product. | **Already built — freeze it. No further investment.** |

---

## 6. The Defensibility Flywheel

```
User scores a bid
        ↓
BidIndex gives personalized recommendation (weights they set)
        ↓
User logs outcome (won/lost/no-bid/override)
        ↓
GC behavior cards get smarter
Competitive Pressure activates (3+ outcomes per GC)
Project twin finder finds better matches
Margin Posture dimension activates
        ↓
Next bid recommendation is more accurate
        ↓
User trusts the score more → logs outcomes more
        ↓
Moat compounds.
```

After 12 months of active use, a BidIntell account contains:
- Hundreds of scored bids with outcomes
- GC behavioral dossiers for their entire client network
- Calibrated personal weights that reflect how *this company* actually decides
- Win-rate intelligence that exists nowhere else

That account cannot be reproduced on any competitor's platform — not in a week, not in a year.

---

---

## 7. Build Order

### Now (this week)
1. **Extend weights UI with presets + scoring profile label** — personalization foundation everything else builds on; 4 hours
2. **No-bid as first-class outcome type** — permanently expands data capture going forward; 2 hours

### Q2 (May–June)
3. Estimator override capture — starts building labeled training data; 3 hours
4. GC behavior card fields (RFI responsiveness, payment flag) on outcome form; 4 hours
5. Win-rate analytics dashboard — proves model works, retention anchor for principals; 4 hours
6. Outcome capture completeness nudges — require margin on WON, "how high" on LOST

### Q3 (July–August)
7. Project twin finder — needs outcome history to be useful (build after users have ≥20 outcomes)
8. Competitive pressure explainer — data is there, needs UI explanation; 2 hours
9. GC behavior cards full display (card view in Clients tab)
10. Margin Posture dimension activates — enough margin data by now to score

### Q4
11. Portfolio / capacity vs. pursuit view
12. Win-rate analytics Phase 2 (score vs. outcome correlation chart)
13. Cross-user benchmarks — needs ~10 active accounts; build schema now, activates later

### Hard dependency chain
```
Preset weights + outcome completeness
        ↓
3+ outcomes per GC → Competitive Pressure activates
20+ total outcomes → Twin finder is useful
50+ total outcomes → Override calibration is meaningful
10+ active accounts → Cross-user benchmarks activate
```

The biggest mistake would be building twin finder or cross-user benchmarks before enough outcome data exists. Lock in the data capture loop first — everything else is derived from it.

---

*End of document. Next review: Q2 retrospective, June 2026.*
