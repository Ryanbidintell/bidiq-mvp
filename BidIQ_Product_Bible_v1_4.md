# 🎯 BidIQ Product Bible v1.4

**Version:** 1.4  
**Date:** January 29, 2026  
**Status:** LOCKED - This is the definitive product roadmap  

**Changes from v1.3:**

### MVP Trust Features (User Retention)
- Manual override / confidence feedback on every analysis
- "How to Improve Your Chances" contextual tips
- Similar past bid memory prompts
- Bid volume guardrail warnings
- Print report functionality

### Data Moat Features (Competitive Defensibility)
- Structured "Why I Bid / Why I Passed" reasons (multi-select, mandatory)
- GC responsiveness signals (acknowledged receipt, answered questions)
- Competitor presence capture (who else was bidding, frequent competitors)
- GC risk tagging (slow pay, pay-if-paid, bid shopping, etc.)
- Decision confidence scoring (1-5 scale on every outcome)

---

## THE PRODUCT

BidIQ is an AI-powered bid intelligence platform that saves subcontractors 18+ hours per week by automating bid analysis, follow-up communications, and building a database of which general contractors are worth pursuing.

### The Three-Layer System

**Layer 1: AI Bid Analysis (The Hook)**
- Subcontractors upload bid documents (invite, specs, drawings)
- User selects which GCs are bidding on this project
- AI extracts project details and generates **personalized** 0-100 Bid Worthiness Score
- Provides GO/NO-GO recommendation **tailored to each user's business and current capacity**
- Shows risk warnings for GCs with tagged issues
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

**The insight:** Everyone else is optimizing tasks. BidIQ captures decisions.

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
| User agreement | Every analysis | False positive/negative detection |

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
| **Location Fit** | 25% (or 0% if disabled) | Distance from user's office to project |
| **Keywords & Contract Terms** | 30% | Good/bad terms found, contract risks (only if contract present) |
| **GC Relationship & Competition** | 25% | Win rate with selected GCs + competition penalty |
| **Trade Match** | 20% | CSI divisions found vs user's trades |

All weights are user-adjustable and must sum to 100%.

---

### Component 1: Location Fit (Default 25%)

**Optional Component** - Some contractors WIN more work farther away where there's less competition.

**User Setting:** "Does location matter to your business?"
- **Yes** → Score normally, weight applies
- **No** → Component disabled, weight redistributed to other components

**If Enabled - Scoring Logic:**

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

**Contract Risk Only If Contract Present** - Bid documents often DON'T include the actual contract.

**Scoring Logic:**
```
Base Score = 50 (neutral)

For each "I WANT" keyword found: +8 points
For each "I DON'T WANT" keyword found:
  - Low risk tolerance: -15 points
  - Medium risk tolerance: -10 points  
  - High risk tolerance: -5 points
For each "MUST HAVE" keyword missing: -25 points

CONTRACT RISK (only if contract language detected):
  If contract terms found in documents: Apply keyword penalties
  If NO contract found: Score = 50 (neutral) + note to review terms if awarded

Final Score = Clamped to 0-100
```

---

### Component 3: GC Relationship & Competition (Default 25%)

**Multi-GC Support + Competition Penalty + Win Rate Weighting**

#### Step 1: User Selects GCs Bidding (1-10+)
- Auto-complete from database
- If new GC, prompt for star rating and optional risk tags

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
Final Score = (Location × L_weight) + (Keywords × K_weight) + (GC × G_weight) + (Trade × T_weight)
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
| Bid deadline | Timeline tracking |
| Project SF (if stated) | Future analytics |
| Spec divisions found | Trade match scoring |
| Keywords found (good/bad) | Keyword scoring |
| Contract present (yes/no) | Determines if contract risk applies |
| Contract risk flags (if present) | Risk scoring |

### User Input Before Analysis

| Field | Purpose | Required |
|-------|---------|----------|
| GCs bidding (multi-select) | GC scoring + competition penalty | Yes |
| New GC star rating | If unknown GC selected | Yes (for new GCs) |
| New GC risk tags | If adding new GC | Optional |

### User Input After Analysis

| Field | Purpose | Required |
|-------|---------|----------|
| Agreement with score | False positive/negative detection | Yes (defaults to "agree") |
| Override note | Why they disagree | Optional |

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
- Other

---

## GC DATABASE

### GC Record Fields

| Field | Source | Purpose |
|-------|--------|---------|
| GC name (with location) | User input | Identification |
| Star rating (1-5) | User rating | Relationship quality |
| **Risk tags** | User tags | Persistent warnings |
| Total bids | Calculated | Volume tracking |
| Total wins | Calculated | Success tracking |
| Win rate | Calculated | Relationship strength |
| Ghost count | Calculated | Reliability tracking |

### GC Risk Tags (NEW)

Tags persist across projects and show as warnings during analysis:

| Tag | Display | Meaning |
|-----|---------|---------|
| `slow_pay` | 💰 Slow pay | Payment delays common |
| `pay_if_paid` | 📋 Pay-if-paid | Uses pay-if-paid clauses |
| `change_order_hostile` | ⚠️ CO hostile | Difficult on change orders |
| `bid_shopping` | 🛒 Bid shopping | Shares pricing with competitors |
| `low_feedback` | 🔇 Low feedback | Rarely provides bid feedback |
| `scope_creep` | 📈 Scope creep | Scope often expands without payment |

**Why This Matters for Phase 3:**
- These become crowdsourced GC reputation scores
- "73% of subs tag McCarthy as slow pay"
- Strongest foundation for the GC intelligence database

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

**Sales pitch:** "BidIQ learns from your feedback. Tell us when we get it wrong, and we get smarter."

---

### 2. "How to Improve Your Chances" Section

**What it does:** Contextual tips based on weak scores:
- Low location score → "Consider if travel costs are worth it"
- High competition → "Focus on negotiated or invited bids"
- Bad GC history → "Build the relationship before bidding more"
- Missing trades → "Verify your scope is included"

**Why it matters:**
- Converts "PASS" into learning
- Prevents discouragement
- Positions BidIQ as a coach, not a gatekeeper

**Sales pitch:** "BidIQ doesn't just tell you what to bid. It tells you how to win more."

---

### 3. Similar Past Bid Memory Prompt

**What it does:** When analyzing a bid similar to one you've passed/lost before:
> "⚠️ You've worked with Turner Construction before. You lost 'Wilson Office Building' 3 months ago (score: 58). They ghosted you."

**Matching logic:**
- Same GC, OR
- Same city + same trade + similar scope

**Why it matters:**
- Subs constantly re-evaluate the same bad GCs
- Reinforces learning and saves time
- Makes BidIQ feel "smart" without extra AI cost

**Sales pitch:** "BidIQ remembers so you don't have to. Stop wasting time on GCs who never award you work."

---

### 4. Bid Volume Guardrail

**What it does:** Warning when analyzing many low-score bids:
> "⚠️ You've analyzed 7 bids this week with an average score of 52. Historically, you win less than 5% of bids under 60. Consider being more selective."

**Trigger:** 5+ bids in 7 days with average score under 55

**Why it matters:**
- Speaks directly to estimator pain (burnout)
- Reinforces value narrative ("we save you from bad bids")
- Makes the product feel like an advisor

**Sales pitch:** "BidIQ protects your estimating team from burnout. Quality over quantity."

---

### 5. Print Report

**What it does:** One-click export of the analysis as a printable PDF/summary

**Why it matters:**
- In real companies: Owner decides, estimator executes
- BidIQ becomes the decision artifact
- Improves internal adoption and virality inside firms

**Sales pitch:** "Share your analysis with your team. BidIQ makes bid/no-bid decisions transparent and documented."

---

## USER PREFERENCES

### Business Settings

| Setting | Options | Default | Purpose |
|---------|---------|---------|---------|
| Office location | City, State | Required | Distance calculation |
| Service radius | 25/50/100/150+ miles | 50 | Location scoring |
| **Location matters** | Yes/No | Yes | Enable/disable location scoring |
| My trades | CSI divisions | Required | Trade match scoring |
| Risk tolerance | Low/Medium/High | Medium | Keyword penalty severity |
| Unknown GC default | 1-5 stars | 3 | Score for new GCs |
| Current capacity | Hungry/Steady/Maxed | Steady | Recommendation context |

### Score Weights

| Component | Default | Range |
|-----------|---------|-------|
| Location Fit | 25% | 0-60% |
| Keywords & Contract | 30% | 0-60% |
| GC & Competition | 25% | 0-60% |
| Trade Match | 20% | 0-60% |

**If Location disabled:** Weights auto-redistribute proportionally.

---

## PHASE 1 SCOPE (MVP)

### Build:
- ✅ User authentication (Supabase)
- ✅ User preferences with all settings
- ✅ Multi-GC selection before analysis
- ✅ PDF upload and AI extraction (Claude API)
- ✅ 4-component personalized scoring
- ✅ Plain-English report generation
- ✅ Dashboard with stats
- ✅ Projects list with View Report button
- ✅ Manual override / confidence feedback
- ✅ "How to Improve" contextual tips
- ✅ Similar past bid memory prompts
- ✅ Bid volume guardrail
- ✅ Print report functionality
- ✅ Outcome tracking with structured reasons
- ✅ GC responsiveness capture
- ✅ Competitor presence capture
- ✅ GC risk tagging
- ✅ Decision confidence scoring
- ✅ GC database with risk tags
- ✅ Cloud persistence (Supabase)

### Don't Build:
- ❌ Automated follow-ups (Phase 2)
- ❌ Email parsing for auto-outcomes (Phase 2)
- ❌ GC name normalization agent (Phase 2)
- ❌ Crowdsourced GC intelligence (Phase 3)
- ❌ Plan room integrations (Phase 3)

### Success Metrics:
- 10 beta users from network
- 50+ bids analyzed
- Users say personalized scores match their intuition
- 7/10 would pay $99/month
- Data being captured in Supabase for intelligence building

---

## THE ROADMAP

### Phase 1: Core MVP (Weeks 1-8) - $4-6K
- Everything in Phase 1 Scope above
- Goal: Prove scoring logic matches real-world decisions

### Phase 2: Automation Engine (Weeks 9-16) - $6-8K
- User-configurable follow-up sequences
- Email parsing for auto-outcome updates
- GC name normalization agent
- Goal: Prove automation captures valuable data

### Phase 3: Intelligence Layer (Weeks 17-28) - $10-14K
- Crowdsourced GC intelligence (aggregate risk tags, responsiveness)
- BuildingConnected API integration
- Togal.AI partnership exploration
- Goal: Prove network effects create value

### Phase 4: Scale (Months 7-12) - $15-20K
- Additional integrations (Dodge, Procore, etc.)
- Team features
- GC premium accounts
- Goal: Path to $50M exit

---

## THE COMPETITIVE ADVANTAGE

### What We Uniquely Capture (That No One Else Does)

| Data Type | BidIQ | Document Crunch | Togal.AI | Procore |
|-----------|-------|-----------------|----------|---------|
| Decision intent (why bid/pass) | ✅ | ❌ | ❌ | ❌ |
| GC responsiveness signals | ✅ | ❌ | ❌ | ❌ |
| Competitive dynamics | ✅ | ❌ | ❌ | ❌ |
| GC risk tagging | ✅ | ❌ | ❌ | ❌ |
| User agreement with AI | ✅ | ❌ | ❌ | ❌ |
| Personalized scoring | ✅ | ❌ | ❌ | ❌ |

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
- **v1.4** - January 29, 2026 - MVP trust features + data moat strategy:
  - Manual override / confidence feedback
  - "How to Improve" tips
  - Similar past bid memory
  - Bid volume guardrail
  - Print report
  - Structured decline reasons
  - GC responsiveness signals
  - Competitor presence capture
  - GC risk tagging
  - Decision confidence scoring

---

**This is the Bible. Built from 10 years of real experience. Now with a data moat strategy. Let's build it.**
