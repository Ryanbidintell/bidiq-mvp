# 🎯 BidIntell Product Bible v1.6

**Version:** 1.6  
**Date:** February 5, 2026  
**Status:** LOCKED - This is the definitive product roadmap  

**Changes from v1.5:**

### Core Logic Improvements (from Gemini review)
- **Duplicate Project Detection:** If 5 GCs invite 1 sub to the same project, system creates one Project Entity with separate BidIndex Scores per GC (prevents redundant AI processing)
- **AI Trade Matching - Material Evidence Fallback:** When CSI division headers are missing, AI scans for trade-specific material evidence (e.g., "conduit", "piping", "ductwork") to trigger matches
- **Multi-Signal Trade Detection:** Drawing sheet prefixes (M-, E-, P-), material keywords, and drawing title blocks all confirm trade scope — system never penalizes users just because architects formatted docs differently
- **Contract Risk Confidence Weighting:** AI-detected risks now carry confidence scores — high confidence (≥0.80) applies full penalties, medium (0.50-0.79) flags for "Manual Review" without penalizing score, low (<0.50) hidden
- **GC Alias System:** When admin merges duplicates, original input string saved as alias for future auto-matching
- **Passive Ghost Trigger:** Projects in "Submitted" status for 60+ days (user-configurable) auto-default to "Ghosted" status
- **Score Data Lineage:** Users can see the exact text/page in the PDF that triggered each score penalty or bonus

### New Phase 1 Features
- **Company Type Selection:** Subcontractor / Distributor / Manufacturer Rep — adjusts scoring logic, onboarding questions, and report language per user type
- **Product Match Scoring (for Distributors):** Replaces Trade Match — scans for user's brands/product lines in specs with Specified/Approved/Not Listed detection
- **Beta Feedback Widget:** In-app feedback form for beta users to submit bugs, feature requests, and comments — emails founder and tracked in Founder Dashboard
- **BidIntell as "Secret Weapon" positioning:** GCs don't know it exists — sub runs GC documents through intelligence filter privately

### Schema Updates
- `company_type` field on user_preferences ('subcontractor', 'distributor', 'manufacturer_rep')
- `provides_installation` field on user_preferences (boolean)
- `product_lines` array on user_preferences (for distributors/mfg reps)
- `project_gc_scores` join table for multi-GC per project scoring
- `project_fingerprint` field for duplicate project detection
- `gc_aliases` array on gc_master table
- `beta_feedback` table for in-app user feedback tracking

---

**Changes from v1.4 (carried forward from v1.5):**

### Naming Updates
- Product name: **BidIntell** (replaces BidIQ)
- Score name: **BidIndex Score** (replaces Bid Worthiness Score)

### New Phase 1 Features (from v1.5)
- Custom GC risk tags (user-created, admin-promoted to master list)
- Master GC database with admin dashboard (founder-curated, auto-populates for users)
- Building type extraction (hospital, office, multifamily, retail, etc.)
- Location importance slider (0-100% replaces Yes/No toggle)
- AI-powered contract risk detection (automatic, no keyword config required)
- Bid counter/ticker on dashboard and landing page
- Automated onboarding sequence for new users
- New decline reason: "Products I provide not specified/approved"

### Structural Improvements (from v1.5)
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
- **0%** â†’ Location has no impact on score, weight redistributed to other components
- **50%** â†’ Moderate impact (default behavior)
- **100%** â†’ Location is critical to your business

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
- Report note: "âš ï¸ Contract not included in bid documents. Review terms carefully if awarded."

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
GC Score = Average of star ratings Ã— 20
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
BidIndex Score = (Location Ã— L_weight) + (Keywords Ã— K_weight) + (GC Ã— G_weight) + (Trade Ã— T_weight)
```

### Recommendation Thresholds + Capacity Context

| Score | Base Recommendation | If Hungry | If Maxed |
|-------|--------------------| ----------|----------|
| 80-100 | **GO** - Strong fit | GO - Strong fit | GO - But you're at capacity, be selective |
| 60-79 | **REVIEW** - Mixed signals | REVIEW - But you need work, consider pursuing | REVIEW - You're busy, probably pass |
| 0-59 | **PASS** - Poor fit | PASS - Even hungry, this isn't worth it | PASS - Definitely skip |

---

## DUPLICATE PROJECT DETECTION (NEW v1.6)

### The Problem
A sub gets invited to the same project by 5 different GCs. Without detection, the system processes 5 separate AI extractions for the same physical project — wasting API credits and creating fragmented data.

### The Solution: Project Fingerprinting

**How it works:**
1. When a bid is uploaded, AI extracts project name + location
2. System generates a `project_fingerprint` hash from normalized project name + city + state
3. Before creating a new project, check for matching fingerprints belonging to same user
4. If match found → Link to existing project, create new `project_gc_scores` entry only
5. If no match → Create new project entity

**Database structure:**
```
projects (one row per unique physical project per user)
├── project_fingerprint (text) -- normalized hash for dedup
└── ... (all other project fields)

project_gc_scores (one row per GC per project)
├── project_id (foreign key)
├── gc_id (foreign key)
├── gc_score (0-100) -- GC relationship component
├── competition_penalty (integer) -- based on total GCs on this project
├── final_bidindex_score (0-100) -- complete score for this GC
├── recommendation (GO/REVIEW/PASS)
└── created_at
```

**User experience:**
- Sub uploads bid from Turner for "Wilson Office Building"
- Later uploads same project from McCarthy
- System says: "This looks like Wilson Office Building you already analyzed. Adding McCarthy as another GC on this project."
- Dashboard shows: "Wilson Office Building — 2 GCs bidding (Turner: 78, McCarthy: 63)"

**Why this matters:**
- Saves AI processing costs (extract once, score per GC)
- Shows competition density accurately
- Prevents fragmented project data
- Enables "which GC should I bid this through?" analysis

---

## AI TRADE MATCHING - MULTI-SIGNAL DETECTION (NEW v1.6)

### The Problem
Bid packages are messy and inconsistent. Architects don't format documents the same way every time. Sometimes there are no CSI division headers anywhere — but there are 12 mechanical drawing sheets with ductwork and chillers on every page. The system must be flexible enough to confirm trade scope from whatever context is available and never penalize a user just because the bid package isn't perfectly organized.

### The Solution: 4-Signal Trade Detection

The system uses multiple signals in priority order. If ANY signal confirms the trade, the user gets credit.

#### Signal 1: CSI Division Headers (Strongest — Existing)
Spec sections explicitly labeled by division number.
- Found: "Division 26 - Electrical" → **100% trade match**
- This is the cleanest signal but often missing in incomplete bid packages

#### Signal 2: Drawing Sheet Prefixes (Very Strong — NEW)
Sheet numbering conventions are nearly universal across architecture firms:

| Prefix | Trade | Confidence |
|--------|-------|-----------|
| M- or M1, M2... | Mechanical/HVAC | 95% |
| E- or E1, E2... | Electrical | 95% |
| P- or P1, P2... | Plumbing | 95% |
| FP- | Fire Protection | 95% |
| T- or TC- | Telecom/Low Voltage | 90% |
| FA- | Fire Alarm | 90% |
| S- | Structural | 95% |
| A- | Architectural | 95% |

If the system detects "M-1" through "M-12" in page headers or drawing index, that's mechanical scope — period. An HVAC contractor seeing 12 M-sheets should get the same confidence as finding a Division 23 header.

#### Signal 3: Material Evidence Keywords (Strong — NEW)
Trade-specific equipment and materials found in any document:

| Trade | Material Evidence Keywords |
|-------|--------------------------|
| **HVAC/Mechanical** | ductwork, air handler, chiller, VAV, RTU, boiler, AHU, diffuser, damper, refrigerant piping, split system, exhaust fan, cooling tower, heat pump, FCU, fan coil |
| **Electrical** | panelboard, switchgear, conduit, receptacle, circuit breaker, transformer, bus duct, motor control center, lighting fixture, disconnect, wire, raceway |
| **Plumbing** | domestic water, sanitary, storm drain, water heater, backflow preventer, fixture schedule, roof drain, sewer, lavatory, water closet |
| **Fire Protection** | sprinkler, standpipe, fire pump, wet system, dry system, NFPA 13, sprinkler head, fire department connection |
| **Low Voltage** | data cable, fiber optic, access control, CCTV, fire alarm panel, pull station, card reader, intercom, PA system |
| **Finishes** | carpet, LVT, paint, drywall, ACT ceiling, flooring, tile, wallcovering, epoxy, rubber base |

**Threshold:** 3+ material evidence keywords from same trade → **80% trade match**

#### Signal 4: Drawing Title Blocks (Supporting — NEW)
Full drawing titles that confirm trade scope:

Examples: "HVAC PLAN - LEVEL 1", "ELECTRICAL POWER PLAN", "PLUMBING RISER DIAGRAM", "FIRE ALARM FLOOR PLAN"

**Match:** Drawing title contains trade reference → **85% trade match**

### Scoring Logic

```
Highest signal wins (no stacking):

CSI Division header found         → 100% trade match
Drawing sheet prefix found (M-,E-) → 95% trade match  
Drawing title confirms trade       → 85% trade match
3+ material keywords found         → 80% trade match
Multiple signals combine           → Use highest score

If NO signal found for user's trade → 0% match
```

**Report language for non-CSI matches:**
> "Trade scope confirmed via drawing sheets M-1 through M-12 and material evidence (ductwork, chiller, VAV boxes). CSI division headers not found in specs — verify detailed scope with GC if needed."

### Why This Matters
- Architects are inconsistent — the system must handle real-world messiness
- Incomplete bid packages are common (specs still being written, drawings ahead of specs)
- Never penalize a user when their scope is clearly on the drawings
- Builds trust: estimators see the system "gets it" even with imperfect documents

---

## COMPANY TYPE & USER SEGMENTS (NEW v1.6)

### The Insight
BidIntell isn't just for traditional subcontractors. Distributors and manufacturer reps also receive bid invites and need to evaluate whether a project is worth pursuing. Their evaluation criteria are different — they care about product specifications more than CSI divisions.

### Company Types

#### Subcontractor (Default)
**Definition:** Provides installation labor, may also supply materials/equipment.

**Examples:** HVAC contractor, electrical contractor, flooring installer, painting contractor

**How they evaluate bids:**
- Is my trade scope in the documents? (CSI divisions, drawing sheets, materials)
- Is the project in my service area?
- Do I have a relationship with this GC?
- Are the contract terms acceptable?

**Scoring:** Standard 4-component system (Location, Keywords/Contract, GC Relationship, Trade Match)

#### Distributor
**Definition:** Supplies materials, equipment, or products directly to GCs or subcontractors. May or may not provide installation labor.

**Examples:** Electrical distributor (Eaton, Square D), flooring distributor (Shaw, Mohawk), plumbing supply house, security equipment distributor

**How they evaluate bids:**
- Are MY brands/products specified or approved?
- Is this a product I carry or can I get it?
- Is "or approved equal" language present? (opportunity to substitute)
- Does the GC buy direct or through subs?

**Scoring:** Component 4 changes from "Trade Match" to **"Product Match"** (see below)

#### Manufacturer Rep
**Definition:** Represents specific manufacturer product lines. Typically supply-only, no installation.

**Examples:** Lighting rep agency, mechanical equipment rep, access control manufacturer rep

**How they evaluate bids:**
- Is my manufacturer specified?
- Is this an "or equal" opportunity?
- Who is the sub/contractor I'd work through?
- Is this project type a fit for my product line?

**Scoring:** Same as Distributor — Product Match replaces Trade Match

### Onboarding Flow by Company Type

**Step 0 (NEW — before all other steps):**
> "What type of company are you?"
> - Subcontractor (I install/build)
> - Distributor (I supply materials/equipment)  
> - Manufacturer Rep (I represent product lines)

**If Subcontractor → existing onboarding flow unchanged:**
1. Office location
2. Trades (CSI divisions)
3. Location importance
4. Risk tolerance
5. Add GCs
6. Upload first bid

**If Distributor or Manufacturer Rep → modified onboarding:**
1. Office location
2. **Product lines / Brands you carry** (replaces CSI divisions)
   - Free text + suggested common brands per category
   - Examples: "Eaton", "Square D", "Shaw Contract", "Lenel", "Lutron"
3. **Product categories** (multi-select)
   - Electrical equipment, Lighting, HVAC equipment, Plumbing fixtures, Flooring, Security/Access Control, Fire alarm, Controls/BAS, etc.
4. **Do you provide installation labor?** Yes / No / Sometimes
5. Location importance (may be lower — many distributors ship regionally/nationally)
6. Risk tolerance
7. Add GCs
8. Upload first bid

### Product Match Scoring (Distributors/Mfg Reps)

**Replaces Trade Match (Component 4) for non-subcontractor users.**

When AI extracts spec data, it looks for the user's product lines and returns a specification status:

| Status | Meaning | Score |
|--------|---------|-------|
| **Specified** | User's exact brand named in spec | 100 |
| **Approved Equal** | User's brand listed as approved alternate | 85 |
| **Or Equal** | Spec says "Brand X or approved equal" — opportunity to submit | 70 |
| **Competitor Specified** | A competing brand is specified, no alternates mentioned | 30 |
| **Not Mentioned** | No product specification found for this category yet | 50 (neutral) |

**Report language for distributors:**
```
📦 Product Match: 92/100

YOUR PRODUCTS IN SPECS:
✅ Eaton panelboards — SPECIFIED (Section 26 24 16, Page 47)
✅ Eaton switchgear — SPECIFIED (Section 26 24 19, Page 52)  
⚠️ Lighting fixtures — "Lithonia or approved equal" (Section 26 51 00, Page 61)
   → Your brand (Eaton/Cooper) may qualify as alternate

RECOMMENDATION: Strong product fit. Your specified products 
make this a high-priority opportunity.
```

**Vs. a bad match:**
```
📦 Product Match: 28/100

YOUR PRODUCTS IN SPECS:
❌ Panelboards — Square D specified, no alternates (Page 47)
❌ Switchgear — Siemens specified, no alternates (Page 52)
⚠️ Lighting — Acuity Brands specified, "or equal" (Page 61)

RECOMMENDATION: Poor product fit. Your primary lines are not 
specified. Only pursue if you can offer competitive alternates 
and the GC is open to substitutions.
```

### How Company Type Affects Other Components

**Location Fit:**
- Subcontractors: Service radius matters a lot (they drive to job sites)
- Distributors: May ship regionally — location still matters but default radius is larger
- Mfg Reps: Often cover multi-state territories — location weight defaults lower

**Default score weights by company type:**

| Component | Subcontractor | Distributor | Mfg Rep |
|-----------|--------------|-------------|---------|
| Location Fit | 25% | 15% | 10% |
| Keywords & Contract | 30% | 30% | 25% |
| GC Relationship | 25% | 25% | 25% |
| Trade/Product Match | 20% | 30% | 40% |

*All weights still user-adjustable and must sum to 100%.*

### Database Changes

```
user_preferences (updated fields)
├── company_type (text) -- 'subcontractor', 'distributor', 'manufacturer_rep'
├── provides_installation (boolean, default true) -- false for supply-only
├── product_lines (text[]) -- brands/manufacturers carried (distributors/mfg reps)
├── product_categories (text[]) -- equipment categories (electrical, HVAC, etc.)
├── service_radius_miles -- default changes: sub=50, dist=150, mfg_rep=300
└── ... (all existing fields remain)
```

### Why This Matters
- **Expands TAM significantly** — distributors and mfg reps are a huge market that no competitor serves
- **Same core value prop** — "stop wasting time on opportunities that aren't a fit for your business"
- **Product match is even stickier** — distributor's brand portfolio doesn't change, so scoring stays relevant
- **Natural upsell** — distributors who love it recommend it to their sub customers (and vice versa)
- **Data enrichment** — product specification data feeds back into project intelligence

---

## CONTRACT RISK CONFIDENCE WEIGHTING (NEW v1.6)

### The Problem
AI sometimes detects contract risk clauses with varying certainty. A clear "pay-if-paid" clause in a contract is different from an ambiguous reference in meeting notes.

### The Solution: Confidence-Tiered Penalties

| AI Confidence | Action | Score Impact |
|--------------|--------|--------------|
| **High (≥0.80)** | Full penalty applied | -10 to -20 (per risk tolerance) |
| **Medium (0.50-0.79)** | "Manual Review" flag | 0 (no penalty yet) |
| **Low (<0.50)** | Hidden from report | 0 (not shown) |

**Report display:**
- High confidence: "⚠️ Pay-if-paid clause detected (Page 12, Section 4.3) — Score penalty: -15"
- Medium confidence: "🔍 Possible indemnification clause detected (Page 8) — Manual review recommended"
- Low confidence: Not shown

**Why this matters:**
- Prevents false penalties from ambiguous text
- Builds user trust (they see accuracy improve)
- Creates training data for improving detection

---

## SCORE DATA LINEAGE (NEW v1.6)

### The Problem
Users need to trust the score. "Why did I get a -15 for contract risk?" needs a verifiable answer.

### The Solution: PDF Source Linking

Every score penalty or bonus links back to the exact source:

**Report format:**
```
⚠️ Contract Risk: Pay-if-paid clause detected
   Score Impact: -15 points
   Source: Page 12, Lines 3-7
   Extracted Text: "Payment to Subcontractor shall be contingent upon..."
   Confidence: 0.92 (High)
```

**Implementation:**
- AI extraction returns page numbers and text snippets for each finding
- Score component details stored in `score_components` JSONB with source references
- Report UI includes "View Source" links that highlight relevant text

**Why this matters:**
- Estimators can verify every score decision
- Builds trust faster than any other feature
- Positions BidIntell as transparent, not a black box

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
| `slow_pay` | ðŸ’° Slow pay | Payment delays common |
| `pay_if_paid` | ðŸ“‹ Pay-if-paid | Uses pay-if-paid clauses |
| `change_order_hostile` | âš ï¸ CO hostile | Difficult on change orders |
| `bid_shopping` | ðŸ›’ Bid shopping | Shares pricing with competitors |
| `low_feedback` | ðŸ“‡ Low feedback | Rarely provides bid feedback |
| `scope_creep` | ðŸ“ˆ Scope creep | Scope often expands without payment |

#### Custom Tags (User-Created)

- Users can type any custom tag when adding/editing a GC
- Custom tags are visible only to that user initially
- Admin dashboard shows all custom tags with frequency count
- Admin can promote popular/useful custom tags to master list

**Example flow:**
1. User adds custom tag: "requires_bonding"
2. Admin sees: "requires_bonding" used by 12 users
3. Admin promotes to master list with display: "ðŸ¦ Requires bonding"
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
â†“
Dropdown shows:
  â€¢ Turner Construction (Atlanta, GA) - 12 bids
  â€¢ Turner Brothers (Denver, CO) - 3 bids
  â€¢ [+ Add new GC]
```

**On New GC Submission:**
```
User types: "Turner Const Co"
â†“
AI analyzes: "This looks like Turner Construction (Atlanta, GA)"
â†“
Shows user: "Did you mean Turner Construction?" [Yes] [No, add new]
â†“
If "No" â†’ Goes to admin review queue with AI recommendation
```

### Admin Review Queue

When users add new GCs, they enter a review queue with AI recommendations:

| Submission | AI Recommendation | Confidence | Actions |
|------------|-------------------|------------|---------|
| "Turner Const Co" | Merge with "Turner Construction" | 94% | [Approve Merge] [Add New] [Delete] |
| "Acme Builders LLC" | Add as new | 97% | [Approve] [Link to Existing] [Delete] |

**Admin workflow:**
1. Review pending submissions (usually 1-click approval of AI recommendation)
2. Merge duplicates â†’ Original input becomes an alias
3. Approve new â†’ GC becomes available to all users
4. Delete â†’ Invalid submission removed

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
4. **Builds the alias database** - "Turner Const" â†’ "Turner Construction" mapping improves over time

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
> ðŸ”’ **Automatic Contract Risk Detection**
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
- Options: âœ“ Yes, agree | â†‘ Score too high | â†“ Score too low
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
- Low location score â†’ "Consider if travel costs are worth it for this project"
- High competition â†’ "Focus on negotiated or invited bids where relationships matter"
- Bad GC history â†’ "Build the relationship before bidding more with this GC"
- Missing trades â†’ "Verify your scope is actually included in this bid package"
- Contract risks detected â†’ "Review these clauses carefully before committing"

**Why it matters:**
- Converts "PASS" into learning
- Prevents discouragement
- Positions BidIntell as a coach, not a gatekeeper

**Sales pitch:** "BidIntell doesn't just tell you what to bid. It tells you how to win more."

---

### 3. Similar Past Bid Memory Prompt

**What it does:** When analyzing a bid similar to one you've passed/lost before:
> "âš ï¸ You've worked with Turner Construction before. You lost 'Wilson Office Building' 3 months ago (BidIndex: 58). They ghosted you."

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
> "âš ï¸ You've analyzed 7 bids this week with an average BidIndex of 52. Historically, you win less than 5% of bids under 60. Consider being more selective."

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
> "ðŸ“Š 47 bids analyzed this week | 1,247 total bids analyzed"

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
1. First login detected â†’ Trigger onboarding modal
2. **Step 1: "Where's your office?"** (sets location for scoring)
3. **Step 2: "What trades do you perform?"** (CSI divisions)
4. **Step 3: "How important is location to your business?"** (location slider)
5. **Step 4: "What's your risk tolerance?"** (Low/Medium/High)
6. **Step 5: "Add 2-3 GCs you work with regularly"** (seeds the database)
7. **Step 6: "Upload your first bid"** â†’ Walk through analysis with tooltips
8. Mark onboarding complete in user profile

**Skip option:** Users can skip and set up later, but dashboard shows "Complete your setup" prompt until done.

**Why it matters:**
- Critical for user activation
- Ensures scoring works correctly from first bid
- Reduces "this doesn't work for me" abandonment

---

### 8. Beta Feedback Widget (NEW v1.6)

**What it does:** In-app feedback form allowing beta users to submit bugs, feature requests, comments, and praise directly from within the application.

**User-facing form (inside app):**
- Feedback button visible on every page (floating or in footer)
- Click opens simple form:
  - **Type:** Bug / Feature Request / UX Issue / Praise / Confusion
  - **Message:** Free text (required)
  - **Page/Screen:** Auto-captured (which page they're on)
  - **Screenshot:** Optional upload
  - **Priority:** Low / Medium / High (optional, defaults to Medium)
- Submit → Success message: "Thanks! Ryan will review this personally."

**Backend flow:**
1. Feedback saved to `beta_feedback` table in Supabase
2. Email notification sent to hello@bidintell.ai with feedback details
3. Entry appears in Founder Dashboard under "Beta Feedback" section

**Founder Dashboard integration:**
- Filterable by type (bug, feature, UX, praise, confusion)
- Filterable by user
- Status tracking: New → Reviewed → In Progress → Resolved
- Notes field for founder response/action taken
- Export to CSV for tracking

**Database table:**
```
beta_feedback
├── id (uuid, primary key)
├── user_id (foreign key)
├── feedback_type (text) -- 'bug', 'feature', 'ux', 'praise', 'confusion'
├── message (text, required)
├── page_context (text) -- auto-captured current page/screen
├── screenshot_url (text, nullable)
├── priority (text, default 'medium') -- 'low', 'medium', 'high'
├── status (text, default 'new') -- 'new', 'reviewed', 'in_progress', 'resolved'
├── admin_notes (text, nullable)
├── created_at (timestamp)
└── resolved_at (timestamp, nullable)
```

**Why it matters:**
- Reduces friction for feedback (users don't need to email or remember)
- Captures context automatically (which page, which user)
- Creates structured feedback data for prioritization
- Makes beta users feel heard and valued
- Critical for Phase 0 validation metrics

---

### 9. Passive Ghost Trigger (NEW v1.6)

**What it does:** Automatically defaults projects to "Ghosted" status after a configurable timeout period.

**Logic:**
- If project status = "Submitted" AND days_since_submission >= user's ghost_threshold (default 60 days)
- Auto-update status to "Ghosted (Auto)"
- Send user notification: "Wilson Office Building has been open for 60 days with no response. Marking as ghosted. [Correct this]"
- User can override: "Actually I won this" / "Actually I lost" / "Still waiting"

**User Setting:**
- Ghost threshold: 30 / 45 / 60 / 90 days (default: 60)
- Located in Preferences

**Why it matters:**
- Maintains clean analytics (no stale "submitted" projects sitting forever)
- Captures ghost data passively (users forget to update outcomes)
- Feeds GC responsiveness intelligence (Layer 2)
- Reduces manual data entry burden

---

## PRODUCT POSITIONING (NEW v1.6)

### BidIntell is the Sub's "Secret Weapon"

**The key insight:** GCs don't need to know BidIntell exists.

The sub takes the documents the GC sent them, runs them through BidIntell's intelligence filter, and decides if that GC is worth their time. This is a private decision-support tool, not a two-sided marketplace (yet).

**Why this positioning matters:**
- No GC buy-in needed for Phase 1-2
- Subs feel empowered, not exposed
- GC intelligence is collected passively through sub behavior
- GC-facing features (Phase 3+) can be introduced once data proves value
- Removes adoption friction ("Will my GC find out?")

**Marketing language:**
- "Your secret weapon for smarter bidding"
- "The intelligence layer GCs don't see"
- "Know which GCs are worth your time — before you invest hours estimating"

---

## PHASE 1 SCOPE (MVP)

### Build:
- âœ… User authentication (Supabase)
- âœ… **Company type selection** — Subcontractor / Distributor / Manufacturer Rep **(NEW v1.6)**
- âœ… **Automated onboarding sequence** — adapts questions per company type (NEW v1.5)
- âœ… User preferences with all settings including **location importance slider**
- âœ… **Product lines / brands onboarding** for distributors and mfg reps **(NEW v1.6)**
- âœ… **Keywords as separate section** with clear UI
- âœ… **AI-powered contract risk detection** (automatic) **with confidence weighting (NEW v1.6)**
- âœ… Multi-GC selection before analysis (from **Master GC List**)
- âœ… **Duplicate project detection** — same project from multiple GCs creates one entity with per-GC scores **(NEW v1.6)**
- âœ… **Master GC database with admin dashboard**
- âœ… **GC name normalization agent** (AI-powered real-time matching + admin review queue) **with alias system (NEW v1.6)**
- âœ… **Custom GC risk tags** (user-created, admin-promoted)
- âœ… PDF upload and AI extraction (Claude API)
- âœ… **Multi-signal trade detection** — CSI headers, drawing sheet prefixes (M-, E-, P-), material keywords, drawing titles **(NEW v1.6)**
- âœ… **Product Match scoring** for distributors/mfg reps — Specified/Approved/Or Equal/Not Listed detection **(NEW v1.6)**
- âœ… **Building type extraction** (hospital, office, multifamily, etc.)
- âœ… 4-component personalized scoring (BidIndex Score) **with component adaptation per company type**
- âœ… Plain-English report generation **with score data lineage / source linking (NEW v1.6)**
- âœ… **Report language adapts per company type** (trade match vs product match) **(NEW v1.6)**
- âœ… **"How to Improve Your Chances" section on every report**
- âœ… Dashboard with stats
- âœ… **Bid counter/ticker** on dashboard
- âœ… **Beta feedback widget** — in-app form, emails founder, tracked in dashboard **(NEW v1.6)**
- âœ… Projects list with View Report button
- âœ… Manual override / confidence feedback
- âœ… Similar past bid memory prompts
- âœ… Bid volume guardrail
- âœ… Print report functionality
- âœ… Outcome tracking with structured reasons (including **"Products not specified"**)
- âœ… **Passive ghost trigger** — auto-marks stale projects as ghosted **(NEW v1.6)**
- âœ… **Decision confidence scoring** (1-5 scale with clear descriptions)
- âœ… GC responsiveness capture
- âœ… Competitor presence capture
- âœ… GC risk tagging (standard + custom)
- âœ… GC database with risk tags
- âœ… Cloud persistence (Supabase)

### Don't Build:
- âŒ Automated follow-ups (Phase 2)
- âŒ Email parsing for auto-outcomes (Phase 2)
- âŒ Crowdsourced GC intelligence (Phase 3)
- âŒ Plan room integrations (Phase 3)

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

### Layer 0 â€” Operational Data Foundation (Phase 1)

**"The raw event stream"**

| What It Is | The normalized, confidence-weighted record of how subcontractors evaluate, decide, and experience outcomes |
|------------|-----------------------------------------------------------------------------------------------------------|

**Data Captured:**
- BidIndex Score (and all components)
- User agreement / manual override direction
- Decline reasons (required, structured)
- Outcome type (won/lost/ghosted/declined)
- Decision confidence (1â€“5)
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

### Layer 1 â€” Personal Intelligence (Phase 1â€“2)

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

### Layer 2 â€” GC Reputation & Behavior Intelligence (Phase 3)

**"How do GCs actually behave?"**

| What It Is | Aggregated behavioral patterns about GCs â€” based on actions, not opinions |
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

**Design Mandate:** Never expose individual sub opinions â€” only pattern-level signals.

---

### Layer 3 â€” Bid Market Index (Phase 3â€“4)

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
- **Bid Participation Index (0â€“100)** - Likelihood project gets adequate coverage
- Trade Ã— market Ã— time participation trends
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

### Layer 4 â€” Capacity Pressure Index (Phase 4+)

**"Can the market actually build this?"**

| What It Is | Aggregated signal of subcontractor workload pressure by trade, market, and time |
|------------|--------------------------------------------------------------------------------|

**Data Inputs (monthly, opt-in):**
- Workload status (Hungry / Steady / Maxed)
- Trade(s)
- Geography
- Crew capacity range (optional)
- Upcoming workload indicators
- Confidence (1â€“5)

**Derived Signals:**
- Utilization distribution
- Capacity buffer remaining
- Lead-time pressure
- Overload risk alerts

**Outputs:**
- **Capacity Pressure Index (0â€“100)** - How stretched is this trade in this market?
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

**Design Mandate:** Never expose individual sub availability â€” only market pressure.

---

### Layer 5 â€” Market Intelligence Synthesis (Phase 4+)

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

> **BidIntell starts as a decision tool for subs and evolves into the intelligence layer that explains how construction bids actually work â€” and whether they can succeed.**

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
| Decision intent (why bid/pass) | âœ… | âŒ | âŒ | âŒ |
| GC responsiveness signals | âœ… | âŒ | âŒ | âŒ |
| Competitive dynamics | âœ… | âŒ | âŒ | âŒ |
| GC risk tagging | âœ… | âŒ | âŒ | âŒ |
| User agreement with AI | âœ… | âŒ | âŒ | âŒ |
| Personalized scoring | âœ… | âŒ | âŒ | âŒ |
| AI contract risk detection | âœ… | âŒ | âŒ | âŒ |
| Building type analytics | âœ… | âŒ | Partial | âŒ |

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
- **v1.6** - February 5, 2026 - Gemini review improvements + company types + beta feedback:
  - **Company Type selection** (Subcontractor / Distributor / Manufacturer Rep)
  - **Product Match scoring** for distributors/mfg reps (Specified/Approved/Or Equal detection)
  - **Multi-signal trade detection** (CSI headers + drawing sheet prefixes + material keywords + drawing titles)
  - **Duplicate project detection** (project fingerprinting, per-GC scoring)
  - **Contract risk confidence weighting** (high/medium/low tiers)
  - **GC alias system** (merges preserve original input for auto-matching)
  - **Passive ghost trigger** (auto-marks stale projects after 60 days)
  - **Score data lineage** (PDF page/line source linking for every penalty/bonus)
  - **Beta feedback widget** (in-app form, emails founder, tracked in dashboard)
  - **"Secret Weapon" positioning** (GCs don't need to know BidIntell exists)
  - **Onboarding adapts per company type** (different questions for subs vs distributors)
  - **Default score weights adjust per company type** (distributors weight product match higher)
  - Updated Phase 1 scope with all new features
  - Added `company_type`, `product_lines`, `provides_installation`, `project_gc_scores`, `beta_feedback` to schema

---

**This is the Bible. Built from 10 years of real experience. BidIntell - Bid Smarter. Let's build it.**
