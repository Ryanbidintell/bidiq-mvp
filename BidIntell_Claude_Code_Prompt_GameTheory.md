# BidIntell — Claude Code Build Prompt
## Game Theory Intelligence Modules (Phase 1.5 Addition)

---

## CONTEXT

You are building new features for BidIntell, an AI-powered bid intelligence platform for construction subcontractors. The app is a single-file HTML application using vanilla JavaScript and Supabase as the backend. The Claude API (claude-sonnet-4) is used for document analysis.

The core feature is the BidIndex Score (0-100) — a personalized bid worthiness score with 4 existing components: Location Fit, Trade Match, GC Relationship, and Keyword/Scope Match.

We are adding 3 new modules based on game theory principles. All three should feel native to the existing UI — same card style, same plain-English framing, no jargon.

**Read the existing codebase before writing any code.** Understand the current BidIndex scoring logic, Supabase schema, and Claude extraction prompt before making changes.

---

## MODULE 1: WINNER'S CURSE RISK FLAG

### What It Is
A risk detection module that alerts subs when a bid has characteristics that correlate with underpriced wins. In construction, the winner of a competitive bid is often whoever missed something — not whoever was most efficient. This flag helps subs price with appropriate contingency.

### Risk Indicators (Score 1 point each, max 5)
1. **Scope vagueness** — AI detects phrases like "TBD", "as required", "per architect's direction", "refer to specs not included", or missing drawing sections
2. **Aggressive timeline** — Bid duration is shorter than typical for this project type/size (use AI judgment based on project details)
3. **High competition** — Competitive Pressure Score is HIGH or EXTREME (see Module 2)
4. **New GC relationship** — User has no prior bid or project history with this GC in BidIntell
5. **Contract clause density** — More than 3 risk clauses detected (pay-if-paid, broad indemnity, liquidated damages, etc.)

### Risk Levels
- 0-1 indicators: **Low**
- 2 indicators: **Moderate**
- 3 indicators: **Elevated**
- 4-5 indicators: **High**

### Implementation Steps

**Step 1: Supabase schema addition**
```sql
ALTER TABLE bids ADD COLUMN IF NOT EXISTS winners_curse_risk TEXT 
  CHECK (winners_curse_risk IN ('low', 'moderate', 'elevated', 'high'));

ALTER TABLE bids ADD COLUMN IF NOT EXISTS winners_curse_factors JSONB;
-- Example: {"scope_vague": true, "aggressive_timeline": false, "high_competition": true, 
--            "new_gc": true, "high_clause_density": false, "score": 3}
```

**Step 2: Claude extraction prompt addition**
Add to the existing AI extraction prompt:

```
WINNER'S CURSE RISK ANALYSIS:
Analyze the bid documents for the following risk indicators and return a JSON object:

{
  "scope_vague": boolean,  // true if you find TBD, missing specs, vague scope language
  "scope_vague_evidence": "quoted text or 'none'",
  "aggressive_timeline": boolean,  // true if timeline seems short for project size/type
  "timeline_note": "your assessment",
  "high_clause_density": boolean,  // true if 3+ risk clauses present
  "clause_count": number
}

Be conservative — only flag true when there is clear evidence in the documents.
```

**Step 3: Risk calculation function**
```javascript
function calculateWinnersCurseRisk(extractedData, bid) {
  const factors = {
    scope_vague: extractedData.winners_curse?.scope_vague || false,
    aggressive_timeline: extractedData.winners_curse?.aggressive_timeline || false,
    high_competition: ['high', 'extreme'].includes(bid.competitive_pressure_level),
    new_gc: !bid.gc_has_history,  // derived from user's GC history in Supabase
    high_clause_density: extractedData.winners_curse?.high_clause_density || false
  };
  
  const score = Object.values(factors).filter(Boolean).length;
  
  let risk_level;
  if (score <= 1) risk_level = 'low';
  else if (score === 2) risk_level = 'moderate';
  else if (score === 3) risk_level = 'elevated';
  else risk_level = 'high';
  
  return { risk_level, factors, score };
}
```

**Step 4: UI display**
Add to the bid report card, below the BidIndex Score section:

```html
<!-- Only show for moderate/elevated/high -->
<div class="winners-curse-card" id="winnersCurseCard">
  <div class="wc-header">
    <span class="wc-icon">⚠️</span>
    <span class="wc-title">Winner's Curse Risk: <strong id="wcRiskLevel">ELEVATED</strong></span>
  </div>
  <div class="wc-factors" id="wcFactors">
    <!-- Populated dynamically -->
  </div>
  <p class="wc-recommendation" id="wcRecommendation"></p>
</div>
```

Recommendations by level:
- Moderate: "Consider adding 8-10% contingency to scope assumptions."
- Elevated: "Add 12-15% contingency, or ensure scope is well-defined before bidding."
- High: "High risk of underpricing. Clarify scope and timeline before submitting, or pass."

---

## MODULE 2: COMPETITIVE PRESSURE SCORE

### What It Is
A 5th BidIndex component (10% weight) that tells subs how many competitors they're likely facing for a given GC × trade combination, and adjusts bid strategy recommendations accordingly.

### Logic
- Pull competition density data from Supabase for this GC + user's primary trade
- Calculate pressure level: Low (<3 bidders), Medium (3-5), High (6-9), Extreme (10+)
- Add as 10% component of BidIndex Score
- Low competition = higher score, Extreme = lower score

### Implementation Steps

**Step 1: Supabase schema**
```sql
CREATE TABLE IF NOT EXISTS gc_competition_density (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gc_id UUID REFERENCES gcs(id),
  trade_category TEXT,  -- CSI division or trade name
  avg_bidder_count NUMERIC,
  sample_size INTEGER,
  pressure_level TEXT CHECK (pressure_level IN ('low', 'medium', 'high', 'extreme')),
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gc_id, trade_category)
);

-- Add to bids table
ALTER TABLE bids ADD COLUMN IF NOT EXISTS competitive_pressure_level TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS competitive_pressure_sample_size INTEGER;
```

**Step 2: Data capture (add to outcome tracking)**
When user records an outcome, optionally ask:
```html
<div class="outcome-field optional">
  <label>Roughly how many subs do you think bid this? (optional)</label>
  <select id="estimatedBidderCount">
    <option value="">Don't know</option>
    <option value="1-2">1-2 (very limited)</option>
    <option value="3-5">3-5 (typical)</option>
    <option value="6-9">6-9 (competitive)</option>
    <option value="10+">10+ (very competitive)</option>
  </select>
</div>
```

**Step 3: Aggregation function (run as Supabase Edge Function, daily)**
```javascript
// Supabase Edge Function: aggregate-competition-density
async function aggregateCompetitionDensity() {
  // Query all bids with bidder count data, group by gc_id + trade
  // Calculate avg_bidder_count and sample_size
  // Upsert into gc_competition_density
  // Only write if sample_size >= 5 (minimum data threshold)
}
```

**Step 4: Scoring logic**
```javascript
function getCompetitivePressureScore(pressureLevel, sampleSize) {
  if (!pressureLevel || sampleSize < 5) {
    return { score: 7.5, display: 'unknown', note: 'Insufficient data' }; // neutral 75% of max
  }
  
  const scoreMap = { low: 10, medium: 7, high: 4, extreme: 1 };
  return {
    score: scoreMap[pressureLevel],
    display: pressureLevel.toUpperCase(),
    note: getPressureNote(pressureLevel)
  };
}
// Max component score = 10 (10% of BidIndex)
```

**Step 5: UI display**
Add to BidIndex score breakdown:
```
Competitive Pressure:  HIGH   4/10
Based on 23 BidIntell users — 6-8 subs typically bid this GC's commercial electrical work
```

---

## MODULE 3: GC RELATIONSHIP CLASSIFICATION

### What It Is
Classifies each GC in a user's history as a "Repeat Partner" or "One-Shot Behavior" based on their award and communication patterns. Surfaces on bid reports and GC profiles.

### Classification Logic
- **Repeat Partner:** User has submitted 3+ bids AND won at least 1 AND GC responsiveness score is above 50%
- **One-Shot Behavior:** GC ghost rate > 50% AND user has never won a project with them after 5+ bids
- **Building Relationship:** 1-2 bids, insufficient data
- **Unknown:** No prior interaction

### Implementation Steps

**Step 1: Supabase schema**
```sql
CREATE TABLE IF NOT EXISTS gc_relationship_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  gc_id UUID REFERENCES gcs(id),
  bids_submitted INTEGER DEFAULT 0,
  bids_won INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  relationship_score INTEGER,  -- 0-100
  game_classification TEXT CHECK (game_classification IN 
    ('repeat_partner', 'one_shot', 'building', 'unknown')),
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gc_id)
);
```

**Step 2: Calculation function**
```javascript
function classifyGCRelationship(history) {
  const { bids_submitted, bids_won, ghost_count, responsiveness_score } = history;
  
  if (bids_submitted === 0) return 'unknown';
  if (bids_submitted < 3) return 'building';
  
  const ghostRate = ghost_count / bids_submitted;
  const winRate = bids_won / bids_submitted;
  
  if (winRate > 0.1 && responsiveness_score > 50) return 'repeat_partner';
  if (ghostRate > 0.5 && bids_won === 0 && bids_submitted >= 5) return 'one_shot';
  return 'building';
}
```

**Step 3: UI on bid report**
```
GC Relationship: ✅ Repeat Partner
You've submitted 7 bids and won 2 projects with Turner Construction.
Recommendation: Prioritize this bid — established relationship.
```

```
GC Relationship: ⚠️ One-Shot Behavior
You've submitted 6 bids with no awards and 4 ghosts. 
Recommendation: Price with margin for risk, or reallocate estimating time.
```

---

## CRITICAL DATA FIX: BID-LEVEL DIVISION TRACKING

### The Problem This Solves

**Do not skip this. Build it before the Competitive Pressure Score or the intelligence data will be wrong.**

Onboarding captures what divisions a company *can* perform. That is not the same as what they *actually bid* on a specific project. A mechanical/plumbing/electrical sub may only price electrical on a hospital job. If we use their onboarding profile to tag that bid, we poison the mechanical and plumbing competition data with a false data point.

The competitive intelligence layer is only as good as the data feeding it. Wrong division tagging = wrong competition density = wrong Competitive Pressure Score = subs making bad decisions based on bad data. Fix this first.

### The Root Cause

The current data model links bids to a user's company profile, which contains their onboarding divisions. There is no field capturing which specific division(s) they bid on *this project*. This means the Competitive Pressure Score aggregation has no reliable way to filter by actual bid scope.

### The Fix: One Question at Outcome Tracking

**Where:** The existing outcome tracking modal — the screen where users record Won/Lost/Ghost/Didn't Bid.

**When:** At the moment they record a bid outcome. This is the right moment because:
- Scope is sometimes different from the invitation (sub gets invited for mechanical, only prices electrical)
- The sub knows exactly what they submitted at this point
- They are already engaged in the outcome flow — one more step has low friction
- If they skip outcome tracking entirely, the bid is excluded from competitive intelligence anyway

**What to add:** A checkbox group pre-populated with their onboarding divisions. They confirm or narrow — they are NOT starting from scratch.

```html
<!-- Add to outcome tracking modal, BEFORE the outcome buttons -->
<div class="outcome-field required" id="bidDivisionsField">
  <label class="outcome-label">
    What scope did you bid on this project?
    <span class="field-note">Pre-filled from your profile — uncheck any you didn't price</span>
  </label>
  <div class="division-checkboxes" id="divisionCheckboxes">
    <!-- Dynamically populated from user's onboarding divisions -->
    <!-- Example output: -->
    <label class="division-check">
      <input type="checkbox" value="16000" checked> Electrical (Division 16)
    </label>
    <label class="division-check">
      <input type="checkbox" value="15000"> Mechanical (Division 15)
    </label>
    <label class="division-check">
      <input type="checkbox" value="15400"> Plumbing (Division 15400)
    </label>
  </div>
  <p class="division-note">Only checked divisions are used in competitive intelligence.</p>
</div>
```

**Population logic:** On modal open, fetch user's `preferred_divisions` from their profile. Render one checkbox per division, all checked by default. User unchecks anything they didn't bid. Require at least one box checked before allowing outcome save.

### Schema Change

```sql
-- Add to bids table
ALTER TABLE bids ADD COLUMN IF NOT EXISTS 
  bid_divisions_submitted TEXT[];
-- Stores CSI division codes actually bid, e.g. ['16000'] or ['15000', '15400']
-- NULL = outcome not yet tracked (exclude from competitive intelligence queries)
-- Populated ONLY at outcome tracking, never at upload

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_bids_divisions 
  ON bids USING GIN (bid_divisions_submitted);
```

### Updated Aggregation Logic

The nightly aggregation function for `gc_competition_density` MUST filter on `bid_divisions_submitted`, not on the user's company profile divisions:

```javascript
// CORRECT — uses actual bid scope
const query = supabase
  .from('bids')
  .select('gc_id, bid_divisions_submitted, estimated_bidder_count')
  .not('bid_divisions_submitted', 'is', null)  // only tracked outcomes
  .not('estimated_bidder_count', 'is', null);  // only where count was provided

// Then unnest bid_divisions_submitted and group by gc_id + division
// ONE bid can contribute to MULTIPLE division buckets if sub bid multiple scopes
```

### Edge Cases to Handle

**Multi-scope bids:** A sub who bid both mechanical and plumbing on the same project checks both boxes. That bid contributes one data point to the mechanical bucket AND one to the plumbing bucket. This is correct — they were a competitor in both markets on that project.

**Scope mismatch from invitation:** Sub was invited for electrical and mechanical but only priced electrical. They uncheck mechanical. Only electrical gets the data point. This is the entire reason this field exists.

**Skipped outcome tracking:** `bid_divisions_submitted` stays NULL. That bid is excluded from ALL competitive intelligence aggregation. Better to have less data than wrong data.

**Onboarding divisions change:** If a user later edits their company divisions, the checkbox pre-population updates going forward. Historical `bid_divisions_submitted` records are never retroactively changed — they captured truth at the time.

---

## IMPLEMENTATION ORDER

Build in this sequence. Do not skip steps.

1. **Bid Division Tracking** — Build first. All competitive intelligence depends on clean division-level data. Without this, the Competitive Pressure Score will be inaccurate from day one.
2. **Winner's Curse Risk Flag** — Fastest build, highest trust impact. Prompt addition + display only.
3. **GC Relationship Classification** — Uses data already in Supabase. Aggregation + display logic.
4. **Competitive Pressure Score** — Build infrastructure now, display activates once bid division data accumulates (minimum 5 data points per GC/division combination).

---

## TESTING CHECKLIST

Before considering these modules complete:

**Bid Division Tracking**
- [ ] Outcome modal shows checkboxes pre-populated from user's onboarding divisions
- [ ] All boxes checked by default, user can uncheck
- [ ] Cannot save outcome with zero divisions checked
- [ ] `bid_divisions_submitted` array saved correctly to Supabase
- [ ] Bids with NULL `bid_divisions_submitted` excluded from all competitive intelligence queries
- [ ] Multi-scope bid contributes data point to each checked division independently

**Winner's Curse Risk Flag**
- [ ] Flag shows correctly on a bid with vague scope
- [ ] Flag does NOT show on a well-defined bid (no false positives)
- [ ] Each risk factor explains itself in plain English on the report

**Competitive Pressure Score**
- [ ] Aggregation query uses `bid_divisions_submitted`, NOT user profile divisions
- [ ] Displays "Building data..." when below 5 data points
- [ ] Shows sample size alongside pressure level ("based on 23 BidIntell users")
- [ ] Updates BidIndex score correctly when data is present
- [ ] Low competition increases score, extreme competition decreases it

**GC Relationship Classification**
- [ ] Shows "Unknown" for GCs with no prior interaction
- [ ] Shows "Building" for 1-2 bid history
- [ ] Correctly identifies Repeat Partners after 3+ bids with wins
- [ ] Correctly flags One-Shot behavior after 5+ bids with no awards and high ghost rate

**General**
- [ ] All new data captured in Supabase with correct schema
- [ ] No new module breaks existing BidIndex Score display
- [ ] Plain-English explanations on all new UI components — no jargon
- [ ] Every recommendation is actionable: "Add contingency", "Prioritize this bid", "Pass"

---

## STYLE CONSTRAINTS

- Match existing card/component styling in the application
- Plain English only — no "Nash Equilibrium", "game theory", or academic language in UI
- Every recommendation should be actionable: "Add contingency", "Prioritize this bid", "Pass"
- Show sample sizes on any crowdsourced data ("based on 23 BidIntell users")
- Never show competitive data unless minimum threshold is met — display "Building data..." instead

---

*Reference: BidIntell Product Bible v1.9 | Game Theory Intelligence Framework*
