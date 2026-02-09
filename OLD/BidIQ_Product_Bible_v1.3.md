# 🎯 BidIQ Product Bible v1.3

**Version:** 1.3  
**Date:** January 26, 2026  
**Status:** LOCKED - This is the definitive product roadmap  

**Changes from v1.2:**
- Multi-GC bidding support (1-10+ GCs per project)
- Competition penalty scoring (more GCs = more price pressure)
- GC scoring weighted by actual win rate data
- Capacity-aware recommendations (not just display)
- Location scoring now optional (toggle: "Location matters to me")
- Contract risk only scored if contract found in documents
- Configurable ghost timeline (default 60 days)
- Removed "hours spent on bid" field
- Added won fields: contract amount, margin %, alternates
- Follow-up timing user-configurable
- View Report button on projects list
- Plain-English reasoning in score reports

---

## THE PRODUCT

BidIQ is an AI-powered bid intelligence platform that saves subcontractors 18+ hours per week by automating bid analysis, follow-up communications, and building a database of which general contractors are worth pursuing.

### The Three-Layer System

**Layer 1: AI Bid Analysis (The Hook)**
- Subcontractors upload bid documents (invite, specs, drawings)
- User selects which GCs are bidding on this project
- AI extracts project details and generates **personalized** 0-100 Bid Worthiness Score
- Provides GO/NO-GO recommendation **tailored to each user's business and current capacity**
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

**NEW: Optional Component**

Some contractors WIN more work farther away where there's less competition. Location doesn't matter to everyone.

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

**Plain-English Output:**
> "📍 Location: 87/100 - Project is 32 miles from your office, within your 50-mile service area."

---

### Component 2: Keywords & Contract Terms (Default 30%)

**NEW: Contract Risk Only If Contract Present**

Bid documents (drawings, specs, invites) often DON'T include the actual contract. Contracts come after award. Don't penalize for missing contract.

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
  If contract terms found in documents:
    Apply keyword penalties for risky clauses
  If NO contract found:
    Score = 50 (neutral)
    Note: "Contract not included in bid documents. Review terms if awarded."

Final Score = Clamped to 0-100
```

**Plain-English Output (contract found):**
> "🔑 Keywords: 62/100 - Found 'design-assist' (+8), but also found 'liquidated damages' (-10) and 'pay-if-paid' (-10). Contract terms present in documents."

**Plain-English Output (no contract):**
> "🔑 Keywords: 58/100 - Found 2 preferred terms. Contract not included in bid documents - review terms carefully if awarded."

---

### Component 3: GC Relationship & Competition (Default 25%)

**NEW: Multi-GC Support + Competition Penalty + Win Rate Weighting**

#### Step 1: User Selects GCs Bidding

Before analysis, user selects which GCs are bidding on this project (1-10+).
- Auto-complete from database
- If new GC, prompt for star rating and save

#### Step 2: Calculate Base GC Score

**If win rate data exists (user has bid history with GC):**
```
GC Score = Weighted average by number of bids

Example: 3 GCs selected
- Turner: 40% win rate (5 bids) → 40 × 5 = 200
- McCarthy: 25% win rate (8 bids) → 25 × 8 = 200
- New GC: No history → Use star rating × 20

Weighted Score = (200 + 200) / (5 + 8) = 31
New GC factored by star rating if no bid history
```

**If no win rate data (new user or all new GCs):**
```
GC Score = Average of star ratings × 20

Example: 3 GCs selected
- Turner: 4 stars → 80
- McCarthy: 3 stars → 60
- Unknown: User's default (3 stars) → 60

Average = (80 + 60 + 60) / 3 = 67
```

#### Step 3: Apply Competition Penalty

More GCs bidding = more price pressure = relationship matters less

| GCs Bidding | Penalty | Reasoning |
|-------------|---------|-----------|
| 1-2 GCs | 0 | Negotiated/invited, relationship matters |
| 3-5 GCs | -5 | Moderate competition |
| 6-10 GCs | -10 | High competition, price pressure |
| 10+ GCs | -15 | Commodity bid, lowest price usually wins |

```
Final GC Score = Base GC Score - Competition Penalty
```

**Plain-English Output:**
> "🏢 GC & Competition: 58/100 - 6 GCs bidding (high competition, -10). Your best relationship is Turner (40% win rate over 5 bids). Price likely matters more than fit on this one."

---

### Component 4: Trade Match (Default 20%)

**Unchanged from v1.2**

Measures whether your CSI divisions appear in the project specs.

**Scoring Logic:**
```
User's divisions: [26, 27, 28] (Electrical, Low Voltage, Security)
Found in specs: [26, 27]

Coverage = 2/3 = 67%
Trade Score = 67
```

**Plain-English Output:**
> "🔧 Trade Match: 67/100 - Found Divisions 26 and 27 in specs. Division 28 (Security) not found - verify scope includes your work."

---

### Final Score Calculation

```
Final Score = (Location × L_weight) + (Keywords × K_weight) + (GC × G_weight) + (Trade × T_weight)

Where weights sum to 100% (or redistribute if Location disabled)
```

### Recommendation Thresholds + Capacity Context

**NEW: Capacity affects the recommendation message, not the score**

| Score | Base Recommendation | If Hungry | If Maxed |
|-------|--------------------| ----------|----------|
| 80-100 | **GO** - Strong fit | GO - Strong fit | GO - But you're at capacity, be selective |
| 60-79 | **REVIEW** - Mixed signals | REVIEW - But you need work, consider pursuing | REVIEW - You're busy, probably pass |
| 0-59 | **PASS** - Poor fit | PASS - Even hungry, this isn't worth it | PASS - Definitely skip |

**Plain-English Output:**
> "**SCORE: 72/100 - REVIEW**
> 
> This bid has mixed signals. Location and trade match are good, but 6 GCs are bidding which means heavy price competition. Your best GC relationship here is Turner (40% win rate).
> 
> **Your capacity is 'Hungry'** - You need work right now. This might be worth pursuing despite the competition. Consider if you can be price-competitive."

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

### User Input at Submission

| Field | Purpose | Required |
|-------|---------|----------|
| My bid amount ($) | Price tracking, win/loss analysis | Yes |
| Internal estimator | Performance tracking | Optional |
| Notes | Context | Optional |

**REMOVED: Hours spent on bid** - We don't speed up estimating, just decisions.

### User Input at Outcome

**If Won:**
| Field | Purpose |
|-------|---------|
| Final contract amount ($) | Actual vs bid tracking |
| Final margin (%) | Profitability tracking |
| Alternates included | Scope tracking |
| Notes | Learnings |

**If Lost:**
| Field | Purpose |
|-------|---------|
| How high were you? | Price competitiveness |
| Winner name | Competitor tracking |
| GC feedback | Learning |

**If Ghosted:**
| Field | Purpose |
|-------|---------|
| (Auto-calculated) | Based on user's ghost timeline setting |

**If Didn't Bid:**
| Field | Purpose |
|-------|---------|
| Reasons (multi-select) | Pattern analysis |
| Notes | Context |

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
| **Ghost timeline** | Days | 60 | When to count as ghosted |

### Score Weights

| Component | Default | Range |
|-----------|---------|-------|
| Location Fit | 25% | 0-60% |
| Keywords & Contract | 30% | 0-60% |
| GC & Competition | 25% | 0-60% |
| Trade Match | 20% | 0-60% |

**If Location disabled:** Weights auto-redistribute proportionally.

### Follow-Up Settings (Phase 2)

| Setting | Default | Purpose |
|---------|---------|---------|
| Follow-up days | 7, 14, 30, 45 | When to send follow-ups |
| Enable auto follow-up | Yes/No | User control |

---

## GC DATABASE STRUCTURE

### GC Naming Convention

To handle multi-office GCs and ensure data integrity:

```
Turner Construction Company - Kansas City
Turner Construction Company - Omaha
McCarthy Building Companies - Kansas City
JE Dunn Construction - Denver
```

Format: `{Company Name} - {City}`

### GC Record Fields

| Field | Source |
|-------|--------|
| GC name (with location) | User input, normalized |
| Star rating | User rating (1-5) |
| Total bids | Calculated |
| Total wins | Calculated |
| Win rate | Calculated |
| Ghost count | Calculated |
| Ghost rate | Calculated |
| Avg days to response | Calculated |
| Last bid date | Calculated |

### Phase 2+: GC Name Normalization

Build agent to:
1. Detect duplicate GC entries (fuzzy match)
2. Prompt user: "Is 'Turner Construction' the same as 'Turner Construction Company - KC'?"
3. Merge if confirmed
4. Maintain aliases for auto-complete

---

## UI REQUIREMENTS

### Dashboard

| Element | Requirement |
|---------|-------------|
| Total bids analyzed | Count |
| Win rate | Won / (Won + Lost) - exclude pending, ghost, didn't bid |
| Pending outcomes | Count needing update |
| Hours saved | Bids × avg decision time (user setting) |
| **Hours saved tooltip** | Explain calculation on hover |
| Recent activity | Last 5 bids with scores |
| **Top GCs - clickable** | Show underlying bid data when clicked |

### Projects List

| Element | Requirement |
|---------|-------------|
| Project name | Display |
| GCs bidding | Show count + names |
| Score + recommendation | Color-coded badge |
| Deadline | Date |
| Outcome | Status badge |
| **View Report button** | Opens full analysis report |
| Submit button | Record bid submission |
| Outcome button | Record outcome |
| Delete button | Remove project |
| Export CSV | Download all data |

### Analysis Report

**Must include plain-English reasoning for every score:**

```
═══════════════════════════════════════════════════════════
BIDIQ SCORE: 72/100 - REVIEW
═══════════════════════════════════════════════════════════

WHY THIS SCORE:
This bid has mixed signals for your business. Here's the breakdown:

📍 LOCATION: 87/100 - GOOD
   32 miles from your office, within your 50-mile service area.
   
🔑 KEYWORDS: 58/100 - CAUTION  
   Found 'design-assist' (+8) which you prefer.
   Found 'liquidated damages' (-10) - a risk term.
   Contract not included in bid documents.
   → Review contract terms carefully if you're awarded.

🏢 GC & COMPETITION: 52/100 - CONCERNING
   6 GCs are bidding - that's high competition (-10 penalty).
   Your best relationship: Turner Construction (40% win rate, 5 bids).
   → Price will likely matter more than relationships here.

🔧 TRADE MATCH: 83/100 - GOOD
   Found Divisions 26 and 27 in specs (2 of your 3 trades).
   Division 28 (Security) not mentioned - verify scope.

YOUR SITUATION:
You marked yourself as 'Hungry' for work. Even though this is a 
competitive bid, it might be worth pursuing if you can be price-competitive.

RECOMMENDATION: Consider bidding, but sharpen your pencil on price.
═══════════════════════════════════════════════════════════
```

---

## PHASE 1 SCOPE (MVP)

### Build:
- User authentication (Supabase)
- User preferences with all new settings
- Multi-GC selection before analysis
- PDF upload and AI extraction
- 4-component personalized scoring with new logic
- Plain-English report generation
- Dashboard with stats
- Projects list with View Report button
- Outcome tracking (Won with new fields / Lost / Ghost / Didn't Bid)
- GC database with star ratings
- Data stored in Supabase from day 1

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
- Crowdsourced GC intelligence
- BuildingConnected API integration
- Togal.AI partnership exploration
- Goal: Prove network effects create value

### Phase 4: Scale (Months 7-12) - $15-20K
- Additional integrations (Dodge, Procore, etc.)
- Team features
- GC premium accounts
- Goal: Path to $50M exit

---

## VERSION HISTORY

- **v1.0** - January 13, 2026 - Initial roadmap
- **v1.1** - January 22, 2026 - Added personalized scoring
- **v1.2** - January 26, 2026 - 4-component fact-based scoring
- **v1.3** - January 26, 2026 - Real-world feedback incorporated:
  - Multi-GC bidding with competition penalty
  - Win rate weighted GC scoring
  - Optional location scoring
  - Contract risk only if contract present
  - Capacity-aware recommendations
  - 60-day ghost default
  - Removed hours spent field
  - Added won fields (amount, margin, alternates)
  - View Report button
  - Plain-English reasoning

---

**This is the Bible. Built from 10 years of real experience. Let's build it.**
