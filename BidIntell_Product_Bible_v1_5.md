# 🎯 BidIntell Product Bible v1.5

**Version:** 1.5  
**Date:** February 3, 2026  
**Status:** LOCKED - This is the definitive product roadmap  

**Changes from v1.4:**

### Naming Updates
- Product name: **BidIntell** (replaces BidIQ)
- Score name: **BidIndex Score** (replaces Bid Worthiness Score)

### New Phase 1 Features
- Custom GC risk tags (user-created, admin-promoted to master list)
- Master GC database with admin dashboard (founder-curated, auto-populates for users)
- Building type extraction (hospital, office, multifamily, retail, etc.)
- Location importance slider (0-100% replaces Yes/No toggle)
- AI-powered contract risk detection (automatic, no keyword config required)
- Bid counter/ticker on dashboard and landing page
- Automated onboarding sequence for new users
- New decline reason: "Products I provide not specified/approved"

### Structural Improvements
- Keywords section separated from Preferences (clearer UI)
- User agreement field clarified (Manual Override / Confidence Feedback)
- Decision confidence field clarified (1-5 data quality scale)

---

## THE PRODUCT

BidIntell is an AI-powered bid intelligence platform that saves subcontractors 18+ hours per week by automating bid analysis, follow-up communications, and building a database of which general contractors are worth pursuing.

### The Three-Layer System

**Layer 1: AI Bid Analysis (The Hook)**
- Subcontractors upload bid documents (invite, specs, drawings)
- User selects which GCs are bidding on this project
- AI extracts project details and generates **personalized** 0-100 BidIndex Score
- Provides GO/NO-GO recommendation **tailored to each user's business and current capacity**
- Shows risk warnings for GCs with tagged issues
- **Automatically detects contract risk clauses** (no keyword setup required)
- Value: Save 15 hours/week analyzing bad opportunities

**Layer 2: Automated Follow-Up (The Stickiness)** *(Phase 2)*
- AI automatically sends follow-up sequence to GCs after bid submission
- **User-configurable timing** (not hardcoded) - large projects need longer review
- AI parses GC email responses and auto-updates outcomes
- Value: Save 3 hours/week writing follow-ups + capture feedback data

**Layer 3: GC Intelligence Database (The Moat)** *(Phase 3)*
- Personal intelligence: Your win rate, response rate, and history with each GC
- Crowdsourced intelligence: GC reputation scores, ghost rates from all users
- **Ghost timeline user-defined** (default 60 days) - what counts as "ghosted" varies
- Competitor tracking: Who beats you and on which projects
- Value: Stop wasting time on GCs who never award you work

---

## THE DATA MOAT STRATEGY

### Philosophy: Capture Decisions, Not Just Documents

**The insight:** Everyone else is optimizing tasks. BidIntell captures decisions.

**What we uniquely own:**
1. **Decision intent** - Why users bid or don't bid
2. **Behavioral patterns** - How users respond to recommendations
3. **Competitive outcomes** - Who wins and loses against whom
4. **GC reputational data** - User-tagged risk factors and responsiveness

**Why this matters:**
- Creates switching costs (your data is trapped here)
- Enables learning effects (recommendations improve over time)
- Builds network effects (crowdsourced intelligence in Phase 3)
- Establishes long-term defensibility (no one else is capturing this)

### Data Points That Compound Over Time

| Data Point | When Captured | Phase 3 Use |
|------------|---------------|-------------|
| Decline reasons | User passes on bid | "70% of subs pass on McCarthy due to contract terms" |
| GC responsiveness | User records outcome | Ghost likelihood prediction |
| Competitor presence | User records loss | "You lose to XYZ Electric 80% on hospital projects" |
| GC risk tags | User adds/edits GC | Crowdsourced GC reputation scores |
| Decision confidence | Every outcome | Scoring algorithm refinement |
| User agreement (Manual Override) | Every analysis | False positive/negative detection - tracks when users disagree with AI recommendation |

---

## THE SCORING ALGORITHM

### Philosophy: Measure Only What's Black and White

Every score component must be:
1. **Extractable** from documents OR provided by user
2. **Verifiable** - user can see exactly why they got that score
3. **Personalized** - same bid, different score for different contractors

### The 4-Component System

| Component | Default Weight | What It Measures |
|-----------|---------------|------------------|
| **Location Fit** | 25% (adjustable 0-100%) | Distance from user's office to project |
| **Keywords & Contract Terms** | 30% | Good/bad terms found + AI-detected contract risks |
| **GC Relationship & Competition** | 25% | Win rate with selected GCs + competition penalty |
| **Trade Match** | 20% | CSI divisions found vs user's trades |

All weights are user-adjustable and must sum to 100%.

---

### Component 1: Location Fit (Default 25%)

**Adjustable Component** - Some contractors WIN more work farther away where there's less competition.

**User Setting:** "Location Importance" slider (0-100%)
- **0%** → Location has no impact on score, weight redistributed to other components
- **50%** → Moderate impact (default behavior)
- **100%** → Location is critical to your business

The slider adjusts how much the Location Fit component contributes to the final BidIndex Score.

**Scoring Logic:**

| Distance | Score |
|----------|-------|
| 0-25 miles | 100 |
| 25-50 miles | 85 |
| 50-100 miles | 70 |
| 100-150 miles | 50 |
| 150+ miles | 30 |

If project is outside user's stated service radius: additional -20 penalty

---

### Component 2: Keywords & Contract Terms (Default 30%)

**Two Systems Working Together:**

#### System 1: AI-Detected Contract Risks (Automatic)

BidIntell automatically scans for and flags these risky contract clauses - **no user configuration required:**

| Risk Clause | What It Means | Score Impact |
|-------------|---------------|--------------|
| Pay-if-paid provisions | You don't get paid until GC gets paid | -10 to -20 (based on risk tolerance) |
| Liquidated damages | Daily penalties for late completion | -10 to -20 |
| Broad indemnification | You're liable for others' negligence | -10 to -20 |
| No damage for delay | Can't recover costs if GC delays you | -5 to -15 |
| Waiver of consequential damages | Limited recovery for major losses | -5 to -10 |
| Retainage over 10% | More cash tied up longer | -5 to -10 |

**If NO contract language detected in documents:**
- Contract risk score = 50 (neutral)
- Report note: "⚠️ Contract not included in bid documents. Review terms carefully if awarded."

#### System 2: User Keywords (Custom)

Users can add additional keywords to scan for:

| Keyword Type | Example | Score Impact |
|--------------|---------|--------------|
| "I WANT" (green) | "LEED", "prevailing wage", "union" | +8 points each |
| "I DON'T WANT" (red) | "design-build", "fast-track" | -5 to -15 (based on risk tolerance) |
| "MUST HAVE" | "mechanical", "HVAC" | -25 if missing |

**Scoring Logic:**
```
Base Score = 50 (neutral)

AI Contract Risk Detection:
  For each risky clause found:
    - Low risk tolerance: -15 to -20 points
    - Medium risk tolerance: -10 to -15 points  
    - High risk tolerance: -5 to -10 points

User Keywords:
  For each "I WANT" keyword found: +8 points
  For each "I DON'T WANT" keyword found: penalty based on risk tolerance
  For each "MUST HAVE" keyword missing: -25 points

Final Score = Clamped to 0-100
```

---

### Component 3: GC Relationship & Competition (Default 25%)

**Multi-GC Support + Competition Penalty + Win Rate Weighting**

#### Step 1: User Selects GCs Bidding (1-10+)
- Auto-complete from **Master GC Database** (admin-curated)
- If new GC, prompt for star rating and optional risk tags
- New GCs added by users go to admin review queue

#### Step 2: Calculate Base GC Score

**If win rate data exists:**
```
GC Score = Weighted average by number of bids
Example: Turner 40% (5 bids) + McCarthy 25% (8 bids) = weighted score
```

**If no win rate data:**
```
GC Score = Average of star ratings × 20
Example: 4 stars = 80/100
```

#### Step 3: Apply Competition Penalty

| GCs Bidding | Penalty | Reasoning |
|-------------|---------|-----------|
| 1-2 GCs | 0 | Negotiated/invited, relationship matters |
| 3-5 GCs | -5 | Moderate competition |
| 6-10 GCs | -10 | High competition, price pressure |
| 10+ GCs | -15 | Commodity bid, lowest price usually wins |

---

### Component 4: Trade Match (Default 20%)

Measures whether your CSI divisions appear in the project specs.

```
User's divisions: [26, 27, 28] (Electrical, Low Voltage, Security)
Found in specs: [26, 27]
Trade Score = 2/3 = 67%
```

---

### Final Score Calculation

```
BidIndex Score = (Location × L_weight) + (Keywords × K_weight) + (GC × G_weight) + (Trade × T_weight)
```

### Recommendation Thresholds + Capacity Context

| Score | Base Recommendation | If Hungry | If Maxed |
|-------|--------------------| ----------|----------|
| 80-100 | **GO** - Strong fit | GO - Strong fit | GO - But you're at capacity, be selective |
| 60-79 | **REVIEW** - Mixed signals | REVIEW - But you need work, consider pursuing | REVIEW - You're busy, probably pass |
| 0-59 | **PASS** - Poor fit | PASS - Even hungry, this isn't worth it | PASS - Definitely skip |

---

## DATA CAPTURED PER BID

### Auto-Extracted by AI

| Field | Purpose |
|-------|---------|
| Project name | Identification |
| Project location + coordinates | Location scoring |
| Project city/state | Display |
| **Building type** | Analytics (hospital, office, multifamily, retail, industrial, education, etc.) |
| Bid deadline | Timeline tracking |
| Project SF (if stated) | Future analytics |
| Spec divisions found | Trade match scoring |
| Keywords found (good/bad) | Keyword scoring |
| Contract present (yes/no) | Determines if contract risk applies |
| **Contract risk clauses detected** | Automatic risk scoring (pay-if-paid, indemnification, etc.) |

### User Input Before Analysis

| Field | Purpose | Required |
|-------|---------|----------|
| GCs bidding (multi-select from Master List) | GC scoring + competition penalty | Yes |
| New GC star rating | If unknown GC selected | Yes (for new GCs) |
| New GC risk tags | If adding new GC | Optional |

### User Input After Analysis (Manual Override / Confidence Feedback)

| Field | Purpose | Required |
|-------|---------|----------|
| Agreement with score | Tracks when AI gets it wrong - Options: "Yes, agree" / "Score too high" / "Score too low" | Yes (defaults to "agree") |
| Override note | Why they disagree - helps improve algorithm | Optional |

**Why this matters:** This is the "User Agreement" data point. When users consistently mark certain GCs or project types as "score too high" or "score too low," we learn where the algorithm needs adjustment.

### User Input at Outcome

**If Won:**
| Field | Purpose |
|-------|---------|
| Final contract amount ($) | Actual vs bid tracking |
| Final margin (%) | Profitability tracking |
| GC acknowledged receipt? | Responsiveness tracking |
| GC answered questions? | Responsiveness tracking |
| Decision confidence (1-5) | Algorithm calibration |

**If Lost:**
| Field | Purpose |
|-------|---------|
| How high were you? | Price competitiveness |
| Winner name | Competitor tracking |
| Other frequent competitors | Competitive pattern analysis |
| GC acknowledged receipt? | Responsiveness tracking |
| GC answered questions? | Responsiveness tracking |
| Decision confidence (1-5) | Algorithm calibration |

**If Ghosted:**
| Field | Purpose |
|-------|---------|
| Days since submission | Ghost timeline tracking |
| GC acknowledged receipt? | Responsiveness tracking |
| GC answered questions? | Responsiveness tracking |

**If Didn't Bid / Declined:**
| Field | Purpose |
|-------|---------|
| Reasons (multi-select, REQUIRED) | Decision intent capture |
| Additional notes | Context |
| Decision confidence (1-5) | Algorithm calibration |

**Decline Reason Options:**
- Too many GCs bidding
- GC relationship weak
- Bad contract terms
- Out of territory
- Capacity constraints
- Pricing unlikely to win
- Scope unclear
- **Products I provide not specified/approved** *(NEW)*
- Other

### Decision Confidence Scale (1-5)

This field captures how certain the user is about their outcome data:

| Rating | Meaning | Example |
|--------|---------|---------|
| 5 | Certain | "GC told me directly I won/lost" |
| 4 | Very confident | "Got official award letter" or "Saw competitor on site" |
| 3 | Confident | "Reasonable assumption based on timing" |
| 2 | Uncertain | "Haven't heard back, assuming ghosted" |
| 1 | Guessing | "No idea what happened" |

**Why this matters:** Higher confidence outcomes are weighted more heavily when training the scoring algorithm. Low confidence data is still captured but flagged for verification.

---

## GC DATABASE

### Master GC List (Admin-Curated)

**Philosophy:** The founder maintains a clean, normalized GC database. Users benefit from consistent data.

**Admin Dashboard Features:**
- View all GCs added by any user
- Merge duplicates ("Turner Construction" + "Turner" + "Turner Construction Co" = one record)
- Add/edit GC contact info (address, phone, email, website)
- Promote custom risk tags to master list
- Flag GCs for review
- See aggregate stats across all users

**User Experience:**
- GC dropdown auto-completes from Master List
- Always pulls latest, clean data
- If GC not found, user can add (goes to admin review queue)
- User's ratings and history are personal; GC identity is shared

### GC Record Fields

| Field | Source | Purpose |
|-------|--------|---------|
| GC name (normalized) | Admin-curated | Identification |
| Location (city, state) | Admin-curated | Geographic context |
| Contact info | Admin-curated | Future integrations |
| Star rating (1-5) | User rating (personal) | Relationship quality |
| **Risk tags** | User tags + admin-promoted | Persistent warnings |
| Total bids | Calculated (personal) | Volume tracking |
| Total wins | Calculated (personal) | Success tracking |
| Win rate | Calculated (personal) | Relationship strength |
| Ghost count | Calculated (personal) | Reliability tracking |

### GC Risk Tags

#### Standard Tags (Admin-Curated Master List)

| Tag | Display | Meaning |
|-----|---------|---------|
| `slow_pay` | 💰 Slow pay | Payment delays common |
| `pay_if_paid` | 📋 Pay-if-paid | Uses pay-if-paid clauses |
| `change_order_hostile` | ⚠️ CO hostile | Difficult on change orders |
| `bid_shopping` | 🛒 Bid shopping | Shares pricing with competitors |
| `low_feedback` | 📇 Low feedback | Rarely provides bid feedback |
| `scope_creep` | 📈 Scope creep | Scope often expands without payment |

#### Custom Tags (User-Created)

- Users can type any custom tag when adding/editing a GC
- Custom tags are visible only to that user initially
- Admin dashboard shows all custom tags with frequency count
- Admin can promote popular/useful custom tags to master list

**Example flow:**
1. User adds custom tag: "requires_bonding"
2. Admin sees: "requires_bonding" used by 12 users
3. Admin promotes to master list with display: "🏦 Requires bonding"
4. All users now see this as a standard option

**Why This Matters for Phase 3:**
- Custom tags become crowdsourced GC reputation data
- "73% of subs tag McCarthy as slow pay"
- Strongest foundation for the GC intelligence database

---

## GC NAME NORMALIZATION AGENT

### The Problem
Users type GC names inconsistently:
- "Turner Construction" vs "Turner" vs "Turner Const Co"
- "McCarthy Building Companies" vs "McCarthy Building"
- Typos, abbreviations, regional office names

Without normalization, you get duplicate GC records and fragmented data.

### The Solution: AI-Powered Real-Time Matching

**As User Types (Real-Time):**
```
User types: "turn"
↓
Dropdown shows:
  • Turner Construction (Atlanta, GA) - 12 bids
  • Turner Brothers (Denver, CO) - 3 bids
  • [+ Add new GC]
```

**On New GC Submission:**
```
User types: "Turner Const Co"
↓
AI analyzes: "This looks like Turner Construction (Atlanta, GA)"
↓
Shows user: "Did you mean Turner Construction?" [Yes] [No, add new]
↓
If "No" → Goes to admin review queue with AI recommendation
```

### Admin Review Queue

When users add new GCs, they enter a review queue with AI recommendations:

| Submission | AI Recommendation | Confidence | Actions |
|------------|-------------------|------------|---------|
| "Turner Const Co" | Merge with "Turner Construction" | 94% | [Approve Merge] [Add New] [Delete] |
| "Acme Builders LLC" | Add as new | 97% | [Approve] [Link to Existing] [Delete] |

**Admin workflow:**
1. Review pending submissions (usually 1-click approval of AI recommendation)
2. Merge duplicates → Original input becomes an alias
3. Approve new → GC becomes available to all users
4. Delete → Invalid submission removed

### Technical Components

| Component | Purpose |
|-----------|---------|
| `gc-search` edge function | Real-time autocomplete with AI fuzzy matching |
| `gc-submit-new` edge function | Handles new GC submissions, AI duplicate detection |
| `gc_review_queue` table | Stores pending submissions with AI recommendations |
| `GCReviewQueue` component | Admin dashboard for approvals |
| `GCAutocomplete` component | User-facing input with smart suggestions |

### Why This Matters

1. **Clean data from day one** - No duplicate GCs fragmenting your intelligence
2. **Reduced admin burden** - AI does 90% of the work, you just approve
3. **Better user experience** - Autocomplete saves time, catches typos
4. **Builds the alias database** - "Turner Const" → "Turner Construction" mapping improves over time

---

## USER SETTINGS STRUCTURE

### Preferences (Business Settings)

| Setting | Options | Default | Purpose |
|---------|---------|---------|---------|
| Office location | City, State | Required | Distance calculation |
| Service radius | 25/50/100/150+ miles | 50 | Location scoring baseline |
| **Location importance** | Slider 0-100% | 50% | How much location affects score |
| My trades | CSI divisions | Required | Trade match scoring |
| Risk tolerance | Low/Medium/High | Medium | Contract risk penalty severity |
| Unknown GC default | 1-5 stars | 3 | Score for new GCs |
| Current capacity | Hungry/Steady/Maxed | Steady | Recommendation context |

### Score Weights

| Component | Default | Range |
|-----------|---------|-------|
| Location Fit | 25% | 0-60% |
| Keywords & Contract | 30% | 0-60% |
| GC & Competition | 25% | 0-60% |
| Trade Match | 20% | 0-60% |

**Note:** Weights must sum to 100%. If Location importance is set to 0%, location weight is redistributed proportionally.

### Keywords (Separate Section)

**Header text:** "BidIntell scans every document for these terms. Add keywords you want to see, terms that concern you, and must-have requirements."

#### Auto-Detected Contract Risks (AI handles these)
> 🔒 **Automatic Contract Risk Detection**
> BidIntell automatically flags these risky contract clauses when found:
> - Pay-if-paid provisions
> - Liquidated damages
> - Broad indemnification
> - No damage for delay
> - Waiver of consequential damages
> - High retainage (over 10%)
> 
> *These are detected automatically based on your risk tolerance setting. No configuration needed.*

#### User Keywords
| Type | Color | Purpose |
|------|-------|---------|
| "I WANT" | Green | Terms that make a bid more attractive (+points) |
| "I DON'T WANT" | Red | Terms that concern you (-points based on risk tolerance) |
| "MUST HAVE" | Orange | Required terms (-25 if missing) |

---

## MVP TRUST FEATURES

### 1. Manual Override / Confidence Feedback

**What it does:** After every analysis, user answers:
- "Do you agree with this recommendation?"
- Options: ✓ Yes, agree | ↑ Score too high | ↓ Score too low
- Optional note explaining disagreement

**Why it matters:**
- Estimators need to feel in control
- Prevents "AI said no, so I ignored it" resentment
- Creates training data for scoring improvements
- Dramatically increases trust in early adoption

**Sales pitch:** "BidIntell learns from your feedback. Tell us when we get it wrong, and we get smarter."

---

### 2. "How to Improve Your Chances" Section

**Location:** Bottom of every analysis report

**What it does:** Contextual tips based on weak scores:
- Low location score → "Consider if travel costs are worth it for this project"
- High competition → "Focus on negotiated or invited bids where relationships matter"
- Bad GC history → "Build the relationship before bidding more with this GC"
- Missing trades → "Verify your scope is actually included in this bid package"
- Contract risks detected → "Review these clauses carefully before committing"

**Why it matters:**
- Converts "PASS" into learning
- Prevents discouragement
- Positions BidIntell as a coach, not a gatekeeper

**Sales pitch:** "BidIntell doesn't just tell you what to bid. It tells you how to win more."

---

### 3. Similar Past Bid Memory Prompt

**What it does:** When analyzing a bid similar to one you've passed/lost before:
> "⚠️ You've worked with Turner Construction before. You lost 'Wilson Office Building' 3 months ago (BidIndex: 58). They ghosted you."

**Matching logic:**
- Same GC, OR
- Same city + same trade + similar building type

**Why it matters:**
- Subs constantly re-evaluate the same bad GCs
- Reinforces learning and saves time
- Makes BidIntell feel "smart" without extra AI cost

**Sales pitch:** "BidIntell remembers so you don't have to. Stop wasting time on GCs who never award you work."

---

### 4. Bid Volume Guardrail

**What it does:** Warning when analyzing many low-score bids:
> "⚠️ You've analyzed 7 bids this week with an average BidIndex of 52. Historically, you win less than 5% of bids under 60. Consider being more selective."

**Trigger:** 5+ bids in 7 days with average score under 55

**Why it matters:**
- Speaks directly to estimator pain (burnout)
- Reinforces value narrative ("we save you from bad bids")
- Makes the product feel like an advisor

**Sales pitch:** "BidIntell protects your estimating team from burnout. Quality over quantity."

---

### 5. Print Report

**What it does:** One-click export of the analysis as a printable PDF/summary

**Why it matters:**
- In real companies: Owner decides, estimator executes
- BidIntell becomes the decision artifact
- Improves internal adoption and virality inside firms

**Sales pitch:** "Share your analysis with your team. BidIntell makes bid/no-bid decisions transparent and documented."

---

### 6. Bid Counter / Ticker (NEW)

**What it does:** Displays running count of bids analyzed system-wide

**Dashboard display:**
> "📊 47 bids analyzed this week | 1,247 total bids analyzed"

**Landing page display:**
> "Join 50+ subcontractors who've analyzed 1,500+ bids with BidIntell"

**Why it matters:**
- Shows momentum and social proof
- Makes the platform feel alive and active
- Reinforces that others trust the system

---

### 7. Automated Onboarding Sequence (NEW)

**What it does:** Guides new users through setup on first login

**Flow:**
1. First login detected → Trigger onboarding modal
2. **Step 1: "Where's your office?"** (sets location for scoring)
3. **Step 2: "What trades do you perform?"** (CSI divisions)
4. **Step 3: "How important is location to your business?"** (location slider)
5. **Step 4: "What's your risk tolerance?"** (Low/Medium/High)
6. **Step 5: "Add 2-3 GCs you work with regularly"** (seeds the database)
7. **Step 6: "Upload your first bid"** → Walk through analysis with tooltips
8. Mark onboarding complete in user profile

**Skip option:** Users can skip and set up later, but dashboard shows "Complete your setup" prompt until done.

**Why it matters:**
- Critical for user activation
- Ensures scoring works correctly from first bid
- Reduces "this doesn't work for me" abandonment

---

## PHASE 1 SCOPE (MVP)

### Build:
- ✅ User authentication (Supabase)
- ✅ **Automated onboarding sequence** (NEW)
- ✅ User preferences with all settings including **location importance slider**
- ✅ **Keywords as separate section** with clear UI
- ✅ **AI-powered contract risk detection** (automatic)
- ✅ Multi-GC selection before analysis (from **Master GC List**)
- ✅ **Master GC database with admin dashboard**
- ✅ **GC name normalization agent** (AI-powered real-time matching + admin review queue)
- ✅ **Custom GC risk tags** (user-created, admin-promoted)
- ✅ PDF upload and AI extraction (Claude API)
- ✅ **Building type extraction** (hospital, office, multifamily, etc.)
- ✅ 4-component personalized scoring (BidIndex Score)
- ✅ Plain-English report generation
- ✅ **"How to Improve Your Chances" section on every report**
- ✅ Dashboard with stats
- ✅ **Bid counter/ticker** on dashboard
- ✅ Projects list with View Report button
- ✅ Manual override / confidence feedback
- ✅ Similar past bid memory prompts
- ✅ Bid volume guardrail
- ✅ Print report functionality
- ✅ Outcome tracking with structured reasons (including **"Products not specified"**)
- ✅ **Decision confidence scoring** (1-5 scale with clear descriptions)
- ✅ GC responsiveness capture
- ✅ Competitor presence capture
- ✅ GC risk tagging (standard + custom)
- ✅ GC database with risk tags
- ✅ Cloud persistence (Supabase)

### Don't Build:
- ❌ Automated follow-ups (Phase 2)
- ❌ Email parsing for auto-outcomes (Phase 2)
- ❌ Crowdsourced GC intelligence (Phase 3)
- ❌ Plan room integrations (Phase 3)

### Success Metrics:
- 10 beta users from network
- 50+ bids analyzed
- Users say personalized scores match their intuition
- 7/10 would pay $99/month
- Data being captured in Supabase for intelligence building
- **Users complete onboarding flow** (80%+ completion rate)
- **"How to Improve" tips rated helpful** by users

---

## INTELLIGENCE LAYER FRAMEWORK

### Core Principle

**BidIntell captures decisions, not documents.**

Every intelligence layer exists to compound decision-quality data into market-level truth.

All layers must be:
- **Explainable** - Users understand why they see what they see
- **Confidence-weighted** - Data quality is tracked and factored
- **Aggregatable** - Individual data rolls up to market insights
- **Trust-preserving** - Individual sub data never exposed

---

### Layer 0 — Operational Data Foundation (Phase 1)

**"The raw event stream"**

| What It Is | The normalized, confidence-weighted record of how subcontractors evaluate, decide, and experience outcomes |
|------------|-----------------------------------------------------------------------------------------------------------|

**Data Captured:**
- BidIndex Score (and all components)
- User agreement / manual override direction
- Decline reasons (required, structured)
- Outcome type (won/lost/ghosted/declined)
- Decision confidence (1–5)
- GC responsiveness signals
- Competitor presence
- Building type
- Trade(s)
- Geography (metro, region)
- Time (submission, award, ghost threshold)

**Why It Exists:**
This is the irreversible data moat. Without this clean foundation, no intelligence layer is trustworthy.

**Value to Market:** None directly (yet). This layer enables everything else.

**Design Mandate:** Every field must be time-stamped, normalized, and tagged to trade + market.

---

### Layer 1 — Personal Intelligence (Phase 1–2)

**"What works for YOU?"**

| What It Is | User-specific analytics explaining win patterns, loss patterns, and optimal conditions |
|------------|----------------------------------------------------------------------------------------|

**Examples:**
- Personal GC win rates
- Ghost likelihood by GC
- Competition sensitivity (how you perform vs competition level)
- BidIndex vs actual outcomes correlation
- Capacity vs decision mismatch alerts

**Why We're Doing It:**
- Creates habit and switching costs
- Builds trust before showing aggregated data
- Trains users to believe the system

**Value to Market:**
- Immediate ROI for subs
- Better bid selection
- Reduced estimator burnout

**How BidIntell Captures It:**
- Outcome tracking
- Manual override feedback
- Decision confidence weighting
- Bid volume guardrails

**Design Mandate:** Personal intelligence is always visible before market intelligence.

---

### Layer 2 — GC Reputation & Behavior Intelligence (Phase 3)

**"How do GCs actually behave?"**

| What It Is | Aggregated behavioral patterns about GCs — based on actions, not opinions |
|------------|--------------------------------------------------------------------------|

**Data Sources:**
- GC responsiveness (acknowledgment, feedback given)
- Ghosting frequency (user-defined timeline)
- Contract risk frequency (how often risky clauses appear)
- Decline reason clustering (why subs pass on this GC)
- Competition density patterns

**What It Produces:**
- GC reputation signals (aggregated patterns, not star ratings)
- Risk pattern distributions
- Responsiveness benchmarks

**Why We're Doing It:**
- GCs are currently black boxes to subs
- Behavior-based intelligence is more accurate than subjective ratings
- Enables future platform integrations

**Value to Market:**
- Subs avoid time-wasting GCs
- Platforms gain behavioral insight
- Market transparency without exposing individuals

**How BidIntell Captures It:**
- Structured outcome fields
- Confidence weighting
- GC name normalization agent
- Risk tag aggregation

**Design Mandate:** Never expose individual sub opinions — only pattern-level signals.

---

### Layer 3 — Bid Market Index (Phase 3–4)

**"Will this project actually get bid?"**

| What It Is | A market-level index predicting bid participation pressure |
|------------|-----------------------------------------------------------|

**Inputs:**
- Bid invitation volume (how many invites going out)
- Competition density (GC count per bid)
- Decline rates (how often subs pass)
- Capacity constraints (from Layer 4)
- Contract friction indicators
- Geography + building type

**Outputs:**
- **Bid Participation Index (0–100)** - Likelihood project gets adequate coverage
- Trade × market × time participation trends
- Forecasted bid scarcity warnings

**Why We're Doing It:**
- Bidding failure is expensive and invisible
- Owners and GCs plan blindly
- This becomes strategic market infrastructure

**Value to Market:**
- GCs predict bid coverage risk before it's too late
- Owners adjust timelines/scope earlier
- Platforms improve preconstruction planning

**How BidIntell Captures It:**
- Passive collection from bid analysis events
- Decline reasons + competition count
- Time-series normalization
- Minimum sample thresholds enforced

**Design Mandate:** This layer is advisory, not punitive.

---

### Layer 4 — Capacity Pressure Index (Phase 4+)

**"Can the market actually build this?"**

| What It Is | Aggregated signal of subcontractor workload pressure by trade, market, and time |
|------------|--------------------------------------------------------------------------------|

**Data Inputs (monthly, opt-in):**
- Workload status (Hungry / Steady / Maxed)
- Trade(s)
- Geography
- Crew capacity range (optional)
- Upcoming workload indicators
- Confidence (1–5)

**Derived Signals:**
- Utilization distribution
- Capacity buffer remaining
- Lead-time pressure
- Overload risk alerts

**Outputs:**
- **Capacity Pressure Index (0–100)** - How stretched is this trade in this market?
- Trade bottleneck alerts
- Forward-looking availability trends

**Why We're Doing It:**
- Availability drives pricing and schedules
- No one has this data today
- Completes the market intelligence picture

**Value to Market:**
- GCs avoid under-resourced bids
- Owners reduce schedule risk
- Platforms gain predictive signals for planning

**How BidIntell Captures It:**
- Monthly micro-surveys (simple, fast)
- Confidence weighting
- Aggregation thresholds (minimum N before reporting)
- Time-lagged reporting (privacy)

**Design Mandate:** Never expose individual sub availability — only market pressure.

---

### Layer 5 — Market Intelligence Synthesis (Phase 4+)

**"What is actually happening in construction bidding?"**

| What It Is | The synthesis of all layers into market-level truth |
|------------|-----------------------------------------------------|

**What It Combines:**
- Decision intent (Layer 0)
- Personal patterns (Layer 1)
- GC behavior (Layer 2)
- Participation pressure (Layer 3)
- Capacity constraints (Layer 4)

**What It Enables:**
- Market truth reports (subscribable)
- API-level intelligence (for platforms)
- Strategic planning inputs (for owners, developers)
- Platform integrations (BuildingConnected, Procore, etc.)

**Why We're Doing It:**

> This is where BidIntell becomes **infrastructure, not software.**

**Value to Market:**
- Predictive power no one else has
- Non-replicable insight (data moat)
- Strategic leverage for partnerships and acquisition

**How BidIntell Gets Here:**
By designing every earlier layer for aggregation from Day 1.

**Design Mandate:** Intelligence must exist independently of UI. Data is the product.

---

### Intelligence Layer Build Sequence

| Phase | Layers Built | Key Milestone |
|-------|--------------|---------------|
| **Phase 1** | Layer 0 (foundation) + Layer 1 (personal) | Clean data capture, personal dashboards |
| **Phase 2** | Layer 1 (enhanced) | Outcome correlation, pattern detection |
| **Phase 3** | Layer 2 (GC behavior) + Layer 3 (market index) | Crowdsourced GC intel, participation forecasting |
| **Phase 4+** | Layer 4 (capacity) + Layer 5 (synthesis) | Market-level intelligence, API products |

---

### Architectural Requirements (Non-Negotiable)

To enable all layers, the MVP must be built with:

| Requirement | Why |
|-------------|-----|
| Every event tagged by: trade, market, time | Enables aggregation and trending |
| Confidence score on all user-reported data | Quality weighting for intelligence |
| Clear separation: personal data vs aggregated | Privacy and trust |
| Minimum sample thresholds at query time | Prevents false signals |
| Time-series friendly schemas | Enables forecasting |
| GC normalization from Day 1 | Clean aggregation across users |

---

### One-Line Summary

> **BidIntell starts as a decision tool for subs and evolves into the intelligence layer that explains how construction bids actually work — and whether they can succeed.**

---

## THE ROADMAP

### Phase 1: Core MVP (Weeks 1-8) - $4-6K
**Intelligence Layers:** Layer 0 (foundation) + Layer 1 (personal basics)
- Everything in Phase 1 Scope above
- Goal: Prove scoring logic matches real-world decisions
- **Data architecture:** All events tagged by trade, market, time from Day 1

### Phase 2: Automation Engine (Weeks 9-16) - $6-8K
**Intelligence Layers:** Layer 1 (enhanced personal intelligence)
- User-configurable follow-up sequences
- Email parsing for auto-outcome updates
- Personal analytics dashboard (win rates, patterns)
- Goal: Prove automation captures valuable data

### Phase 3: Intelligence Layer (Weeks 17-28) - $10-14K
**Intelligence Layers:** Layer 2 (GC behavior) + Layer 3 (market index)
- Crowdsourced GC intelligence (aggregate risk tags, responsiveness)
- GC reputation signals (behavior-based, not opinions)
- Bid Participation Index (market-level)
- BuildingConnected API integration
- Togal.AI partnership exploration
- Goal: Prove network effects create value

### Phase 4: Scale (Months 7-12) - $15-20K
**Intelligence Layers:** Layer 4 (capacity) + Layer 5 (synthesis)
- Capacity Pressure Index (trade availability by market)
- Market Intelligence synthesis
- Additional integrations (Dodge, Procore, etc.)
- Team features
- GC premium accounts
- API products for platforms
- Goal: Path to $50M exit as market infrastructure

---

## THE COMPETITIVE ADVANTAGE

### What We Uniquely Capture (That No One Else Does)

| Data Type | BidIntell | Document Crunch | Togal.AI | Procore |
|-----------|-----------|-----------------|----------|---------|
| Decision intent (why bid/pass) | ✅ | ❌ | ❌ | ❌ |
| GC responsiveness signals | ✅ | ❌ | ❌ | ❌ |
| Competitive dynamics | ✅ | ❌ | ❌ | ❌ |
| GC risk tagging | ✅ | ❌ | ❌ | ❌ |
| User agreement with AI | ✅ | ❌ | ❌ | ❌ |
| Personalized scoring | ✅ | ❌ | ❌ | ❌ |
| AI contract risk detection | ✅ | ❌ | ❌ | ❌ |
| Building type analytics | ✅ | ❌ | Partial | ❌ |

### The Moat Equation

```
Data captured (Phase 1) 
  + Time using platform 
  + Network effects (Phase 3) 
  = Switching costs + Defensibility
```

---

## VERSION HISTORY

- **v1.0** - January 13, 2026 - Initial roadmap
- **v1.1** - January 22, 2026 - Added personalized scoring
- **v1.2** - January 26, 2026 - 4-component fact-based scoring
- **v1.3** - January 26, 2026 - Real-world feedback (multi-GC, competition penalty)
- **v1.4** - January 29, 2026 - MVP trust features + data moat strategy
- **v1.5** - February 3, 2026 - Major update:
  - **Renamed to BidIntell** (product) and **BidIndex Score** (score)
  - **Intelligence Layer Framework** (Layers 0-5 strategic roadmap)
  - GC name normalization agent (moved from Phase 2 to Phase 1)
  - Custom GC risk tags with admin promotion workflow
  - Master GC database with admin dashboard
  - Building type extraction (AI)
  - Location importance slider (replaces Yes/No toggle)
  - AI-powered contract risk detection (automatic)
  - Bid counter/ticker on dashboard and landing page
  - Automated onboarding sequence for new users
  - New decline reason: "Products I provide not specified/approved"
  - Keywords separated from Preferences in UI
  - Clarified User Agreement and Decision Confidence fields
  - Roadmap updated with intelligence layer mapping per phase

---

**This is the Bible. Built from 10 years of real experience. BidIntell - Bid Smarter. Let's build it.**
