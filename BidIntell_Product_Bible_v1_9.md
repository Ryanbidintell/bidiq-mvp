# 🎯 BidIntell Product Bible v1.9

**Version:** 1.9  
**Date:** February 24, 2026  
**Status:** LOCKED - This is the definitive product roadmap  

**Major Changes from v1.8:**
- **Added Game Theory Intelligence Framework** - formal strategic decision science layer embedded throughout the product
- **Competitive Pressure Score** - new Phase 1.5 scoring component based on Nash Equilibrium bid shading logic
- **Winner's Curse Risk Flag** - new risk detection module for high-uncertainty, high-competition bids
- **GC Relationship Intelligence** - repeated game dynamics formalized into the relationship scoring model
- **Data flywheel seeding strategy** - coordination game solution for beta cold-start problem
- **Two-sided market sequencing** - locked GC monetization to Phase 3+ with clear trigger conditions

---

## THE PRODUCT

BidIntell is an AI-powered bid intelligence platform that saves subcontractors 18+ hours per week by automating bid analysis, follow-up communications, and building a database of which general contractors are worth pursuing.

**Core Philosophy:** BidIntell captures *decisions*, not just documents. The platform resolves the information asymmetry that currently favors GCs over subcontractors — and turns that advantage into a compounding data moat.

---

## THE THREE-LAYER SYSTEM

**Layer 1: AI Bid Analysis (The Hook)** — *Phase 1 / Active*
- Upload bid documents → AI extracts project details → Personalized BidIndex Score (0-100)
- GO/NO-GO recommendation tailored to each user's business and capacity
- Risk warnings: contract clauses, GC reputation flags, Winner's Curse alerts *(new)*
- Competitive Pressure Score component *(new - Phase 1.5)*

**Layer 2: Automated Follow-Up (The Stickiness)** — *Phase 4*
- AI sends follow-up sequence to GCs after bid submission
- User-configurable timing (large projects need longer review cycles)
- AI parses GC responses and auto-updates outcomes
- Value: Save 3 hours/week + capture critical outcome data

**Layer 3: GC Intelligence Database (The Moat)** — *Phase 3 - PRIORITY*
- Personal intelligence: Your win rate, response rate, history with each GC
- Crowdsourced intelligence: GC reputation, ghost rates, responsiveness from all users
- Competitor tracking: Who beats you and on which project types
- Value: Stop wasting estimating resources on GCs who will never award you work

---

## GAME THEORY INTELLIGENCE FRAMEWORK (NEW - v1.9)

*This section formalizes the strategic decision science embedded in BidIntell's scoring and intelligence layers. These aren't abstract concepts — they map directly to features already partially built or trivially buildable.*

### The Fundamental Insight

Construction bidding is a **multi-player auction game with asymmetric information**. Each sub knows their own costs but not competitors'. GCs know which subs are bidding but subs do not. This information gap is BidIntell's entire reason to exist — and every feature should be evaluated against whether it reduces that gap.

---

### Module 1: Competitive Pressure Score *(Phase 1.5 — Build Next)*

**Game Theory Basis:** Nash Equilibrium bid shading. In sealed-bid auctions, the optimal strategy is NOT to bid at true cost — it's to shade based on expected competitor count. More competitors = tighten margin; fewer = price up.

**What It Does:**
- Tracks how many subs typically bid each GC by trade (captured via user reports and outcome tracking)
- Calculates a "bid competition density" for each GC × trade × project type combination
- Surfaces a Competitive Pressure indicator on each analyzed bid: Low / Medium / High / Extreme

**Display Logic:**
```
Competitive Pressure: HIGH
Based on 23 BidIntell users tracking this GC:
→ 6-8 electrical subs typically bid Turner's commercial work
→ Average win rate at this competition level: 14%
→ Recommended: Tighten scope assumptions, or pass
```

**Data Requirement:** Requires outcome tracking data from multiple users. Gate display behind minimum 5 data points per GC/trade combo. Show "Insufficient data" below threshold — never fake confidence.

**Why This Fits Phase 1.5:** The scoring infrastructure is built. This adds one new component to the existing BidIndex calculation. Data starts accumulating on day one of beta; display logic activates as data matures.

---

### Module 2: Winner's Curse Risk Flag *(Phase 1.5 — Build Next)*

**Game Theory Basis:** In common-value auctions where true project difficulty is uncertain, the winner is often whoever *underestimated* costs most. This is rampant in construction — the sub who wins was frequently the one who missed something.

**What It Does:**
- Analyzes bid documents for Winner's Curse risk indicators:
  - Vague or incomplete scope definition
  - Aggressive timeline requirements
  - New GC relationship (no historical data)
  - High competition density (many bidders)
  - Unfamiliar geography or building type
  - Unusual contract risk clause density
- Generates a Winner's Curse Risk rating: Low / Moderate / Elevated / High

**Display Logic:**
```
⚠️ Winner's Curse Risk: ELEVATED
This bid has 3 of 5 risk indicators:
→ Scope: Drawings reference "specs TBD" in 4 sections
→ Timeline: 14-week schedule for project type typically requiring 20 weeks
→ Competition: High — 7+ subs likely bidding
Recommendation: Add 12-15% contingency to scope assumptions, or pass.
```

**Why This Is Differentiated:** No competitor tells subs *not* to chase a bid. This is contrarian, trust-building, and directly serves the "decision intelligence" positioning. A sub who avoids one bad win per quarter saves more than their annual subscription cost.

**Implementation:** Primarily a prompt engineering task on the existing Claude API extraction call. Add Winner's Curse risk analysis to the extraction prompt. Low build cost, high value.

---

### Module 3: GC Relationship Intelligence *(Phase 3 — Already Partially Scoped)*

**Game Theory Basis:** Repeated game dynamics. A sub's optimal strategy with a GC they've worked with 10 times differs fundamentally from a new relationship. In one-shot games, defection (ghosting, low-balling) dominates. In repeated games, cooperation (fair awards, honest feedback) emerges because reputation matters.

**What It Adds to Existing GC Intelligence:**
- **Relationship Score** between each sub and each GC: derived from bid history, win rate, project completions, any reported issues
- **Game Classification:** Flag GCs as "Repeat Game Partners" (long relationship, mutual benefit) vs "One-Shot Behavior" (ghost frequently, shop bids, rarely award)
- **Strategy Recommendation:** "You've completed 3 projects with Turner — they're a reliable repeat partner. Prioritize this bid." vs "This GC has one-shot behavior patterns — price accordingly or pass."

**Data Sources:** Outcome tracking (already built), GC responsiveness capture (already built), user GC tags (already built). This is aggregation and display logic, not new data collection.

**Why This Matters:** Helps subs allocate estimating time intelligently across their GC portfolio — not just on a per-bid basis.

---

### Module 4: Beta Cold-Start Strategy *(Phase 0/1 — Implement Now)*

**Game Theory Basis:** Coordination problem. Every sub wants GC intelligence data but hesitates to contribute first. This creates a coordination failure — everyone waits for someone else to move, so nobody moves.

**Solution: Pre-seed + Asymmetric Early Rewards**

**Pre-seed the data (remove blank slate problem):**
- Before launching to beta users, populate GC profiles with:
  - Public bid results (state procurement databases, Dodge Data free tier)
  - AGC and trade association published data
  - Ryan's 10 years of FSI data (anonymized) as founding dataset
- Users arrive to a platform that already *has something*, not an empty page

**Give early users asymmetric value:**
- Beta users get "Founding Member" status — permanent access to competitive intelligence features even at lower tiers
- Founding Members see their own data reflected back immediately (personal intelligence available day one)
- Crowdsourced intelligence unlocks as data accumulates — creates natural anticipation

**Lower contribution friction to minimum viable action:**
- After every bid: ONE question. "Did you win this?" That's it.
- Build the habit before asking for more
- Advanced data (outcome details, GC ratings) comes after trust is established

**Create momentum signals:**
- "47 Kansas City subs tracking bids this week" — even small numbers create momentum perception
- Geographic leaderboards showing data density by market

---

### Module 5: Two-Sided Market Sequencing *(Phase 3+ — DO NOT BUILD EARLY)*

**Game Theory Basis:** Two-sided market platform dynamics. GCs have a complementary problem — they need quality subs, face flaky bidders, and increasingly face compliance pressure to document fair bidding practices.

**The Strategic Sequence (DO NOT SKIP STEPS):**

Phase 1-2: Build entirely for subs. Do not approach GCs. Let reputation data accumulate.

Phase 3 trigger condition: 500+ subs using the platform, 2,000+ GC data points. At this scale, approach GCs with:
- "We have 200 verified electrical subs in KC actively tracking your bids"
- "Your responsiveness score is 67% — here's how to improve sub participation on your projects"

Phase 4+: GCs pay for verified sub network access and responsiveness reporting. Subs stay free or discounted as network contributors.

**CRITICAL WARNING:** Do not flip to GC monetization before subs feel the platform is *theirs*. The moment subs perceive BidIntell as working for GCs, trust collapses and the network effect reverses. Sequence is everything.

---

## UPDATED BIDINDEX SCORE COMPONENTS (v1.9)

The BidIndex Score (0-100) now has 5 components, phased in as data matures:

| Component | Weight | Phase | Status |
|-----------|--------|-------|--------|
| Location Fit | 25% | 1 | ✅ Built |
| Trade Match | 20% | 1 | ✅ Built |
| GC Relationship | 25% | 1 | ✅ Built |
| Keyword/Scope Match | 20% | 1 | ✅ Built |
| Competitive Pressure | 10% | 1.5 | 🔨 Build Next |

**Winner's Curse Risk** is a separate flag (not a score component) — it's a binary alert, not a percentage penalty.

---

## WHAT'S BUILT (Phase 1 Complete)

- ✅ User authentication (Supabase)
- ✅ PDF upload and AI extraction (Claude API)
- ✅ 4-component personalized BidIndex Score
- ✅ Plain-English report with source linking
- ✅ Full-page report view with editable fields
- ✅ "How to Improve Your Chances" section
- ✅ Manual outcome tracking (Won/Lost/Ghost/Didn't Bid)
- ✅ Decision confidence scoring (1-5 scale)
- ✅ GC responsiveness capture
- ✅ Competitor presence capture
- ✅ GC risk tags (user-created, admin-promoted)
- ✅ GC name normalization (AI-powered matching)
- ✅ Passive ghost trigger (auto-marks stale projects)
- ✅ Dashboard with stats and bid counter
- ✅ Beta feedback widget
- ✅ Cloud persistence (Supabase with RLS)

---

## PHASE 1.5: BETA VALIDATION + GAME THEORY MODULES (Updated)

**Timeline:** Weeks 9-16  
**Cost:** $0-2K  
**Goal:** Validate scoring accuracy AND add Competitive Pressure Score + Winner's Curse Risk Flag

### Build List (Addition to existing Phase 1.5)

**Competitive Pressure Score:**
- [ ] Add `gc_competition_density` table to Supabase (gc_id, trade, project_type, avg_bidder_count, sample_size)
- [ ] Update outcome tracking to capture "How many subs do you estimate bid this?" (optional field)
- [ ] Add aggregation logic (cron or edge function) to calculate competition density per GC/trade
- [ ] Add Competitive Pressure component to BidIndex calculation (10% weight, gates on min 5 data points)
- [ ] Display Competitive Pressure indicator on bid report

**Winner's Curse Risk Flag:**
- [ ] Add winner's curse risk analysis to Claude extraction prompt
- [ ] Define 5 risk indicators (scope vagueness, timeline aggression, competition density, GC newness, contract clause density)
- [ ] Add `winners_curse_risk` field to bids table (low/moderate/elevated/high + contributing_factors JSON)
- [ ] Display risk flag on bid report with plain-English explanation

**Beta Cold-Start (Implement Immediately):**
- [ ] Pre-populate GC profiles with Ryan's FSI historical data (anonymized)
- [ ] Add "Founding Member" badge to first 20 beta users (permanent feature unlock)
- [ ] Reduce outcome tracking to single-question flow after bid submission
- [ ] Add data density indicator ("X subs tracking this GC in your market")

---

## PHASE 3: GC INTELLIGENCE LAYER (Updated with Relationship Intelligence)

**Timeline:** Weeks 25-38  
**Cost:** $12-16K  
**Goal:** Build the data moat — crowdsourced GC intelligence + relationship dynamics

### Addition: GC Relationship Intelligence Module

**Database additions:**
```sql
-- GC relationship profiles (per user)
gc_relationship_profiles (
  user_id, gc_id,
  bids_submitted, bids_won, projects_completed,
  avg_win_rate, relationship_score (0-100),
  game_classification ('repeat_partner' | 'one_shot' | 'unknown'),
  last_interaction_date, created_at
)
```

**Aggregation logic:**
- Calculate relationship_score from: win rate, project completions, outcome confidence, reported issues
- Classify game type based on GC behavior patterns (ghost frequency, feedback rate, repeat awards)
- Surface on bid report: "Relationship: Strong Repeat Partner (3 projects completed, 38% win rate)"

---

## PHASE 2: TEAM ACCOUNTS (Post-Launch)

**Trigger:** First paying customer requests team access, OR 10+ paying subscribers.
**Goal:** Support estimating teams — shared projects, shared GC intelligence, role-based access.

### What this requires:
- `organizations` table — company account as the root entity
- `org_members` table — user → org mapping with role (`admin` | `member`)
- All `projects`, `clients`, `user_keywords`, `user_settings` re-scoped from `user_id` → `org_id`
- Invite-by-email flow (admin sends invite → magic link → member joins org)
- RLS rewrite — data visible to all org members, not just owner
- Stripe: seat-based billing or per-org flat rate (decide at build time)

### Pricing implication:
- Starter: 1 seat (current)
- Pro: up to 3 seats
- Team tier (new): 5–10 seats, ~$199/mo

### DO NOT build before April 1 launch. Build only when a paying customer asks.

---

## DECISION FRAMEWORK (Unchanged)

Before building any feature, ask:
1. Does this serve one of the three core layers?
2. Is this the right phase for this feature?
3. Does this help hit current phase success metrics?
4. Can we prove this without building it first?

Default: "Not yet — that's Phase X."

---

## VERSION HISTORY

- **v1.0** — January 13, 2026 — Initial roadmap
- **v1.1** — January 22, 2026 — Personalized scoring engine
- **v1.2** — January 26, 2026 — 4-component scoring
- **v1.3** — January 26, 2026 — Multi-GC support
- **v1.4** — January 29, 2026 — Trust features + data moat
- **v1.5** — February 3, 2026 — Intelligence Layer Framework
- **v1.6** — February 5, 2026 — Company types, multi-signal detection
- **v1.7** — February 6, 2026 — Full-page reports, county location
- **v1.8** — February 7, 2026 — Phase restructure, validate before scale
- **v1.9** — February 24, 2026 — **Game Theory Intelligence Framework:**
  - Competitive Pressure Score (Phase 1.5)
  - Winner's Curse Risk Flag (Phase 1.5)
  - GC Relationship Intelligence module (Phase 3)
  - Beta cold-start coordination strategy (immediate)
  - Two-sided market sequencing (locked to Phase 3+)

---

**This is the Bible. Capture decisions. Build the moat. Validate before scale.**
