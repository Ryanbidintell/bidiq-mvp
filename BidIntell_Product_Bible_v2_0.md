# BidIntell Product Bible v2.0

**Version:** 2.0
**Date:** April 8, 2026
**Status:** LOCKED — This is the definitive product roadmap and strategy
**Owner:** Ryan Elder

**What changed from v1.9:**
- Moat-first strategy layer added — features ranked and sequenced by defensibility, not just usefulness
- Full current-state audit — Phase 1, 1.5, and 2 are complete; roadmap updated accordingly
- BidIndex scoring model updated — user-defined weights are now the core personalization mechanism; 5-dimension upgrade path specified
- Bid Risk replaces Winner's Curse terminology throughout (construction-native language)
- Client replaces GC throughout (platform supports 7 client types, not GC-only)
- No-bid outcome added as first-class outcome type (distinct from Passed)
- Weight presets and scoring profile label added to Settings
- Anti-roadmap added — explicit list of what not to build
- Build order added — canonical near-term sequence
- Pricing updated to reflect live tiers (Solo $49 / Team $99 / Company $179)
- Phase 2 (Team accounts) marked complete
- BidIntell_Moat_Strategy_v1.md retired — fully absorbed into this document

---

## THE PRODUCT

BidIntell is an AI-powered bid intelligence platform for subcontractors and specialty contractors. It analyzes bid documents, scores each opportunity against your business profile, and — over time — learns from your outcomes to give you better recommendations than any generic AI ever could.

**Core philosophy:** BidIntell captures *decisions*, not just documents. Every bid you score, every outcome you log, every client relationship you rate — that data compounds into an intelligence layer that reflects how *your* company actually wins. That is the moat. Not the AI. The data.

**The fundamental problem we solve:** Construction bidding is a multi-player game with asymmetric information. Subs know their own costs but not competitors'. Clients know who's bidding but subs do not. BidIntell systematically closes that information gap — and turns the closing of it into a compounding advantage for every user.

---

## THE THREE-LAYER SYSTEM

**Layer 1: AI Bid Scoring (The Hook)** — *Complete*
- Upload or forward bid documents → AI extracts project details → Personalized BidIndex Score (0–100)
- GO / REVIEW / PASS recommendation calibrated to each user's weights, trade, location, and client relationships
- Bid Risk flag (scope gaps, rushed timeline, competitive pressure, contract risk density)
- Competitive Pressure Score (activates when ≥3 outcomes logged per client)

**Layer 2: Decision Intelligence (The Moat)** — *In progress — Q2–Q3 2026*
- Outcome corpus: win/loss/no-bid/ghost data that trains recommendations over time
- Client behavior profiles: win rate, ghost rate, RFI responsiveness, payment notes per client
- Estimator override loop: captures why users disagree with AI → feeds back into weight calibration
- Project twin finder: surfaces similar past bids and their outcomes at decision time

**Layer 3: Networked Intelligence (The Network Effect)** — *Phase 3 — Q3–Q4 2026*
- Cross-user win-rate benchmarks: anonymous aggregate data per client × trade × market
- Portfolio management: capacity vs. pursuit, pipeline view, team analytics
- Two-sided market (Phase 4+): GC network access — only after 500+ subs and 2,000+ GC data points

---

## CURRENT STATE (April 8, 2026)

### Completed

**Infrastructure**
- ✅ Supabase (Postgres + Edge Functions + RLS)
- ✅ Netlify (hosting + serverless functions, auto-deploy from main)
- ✅ Stripe billing (Solo $49/mo · Team $99/mo · Company $179/mo · 7-day trial)
- ✅ Postmark email (outbound notifications + inbound email forwarding)
- ✅ Claude API (AI extraction + scoring)
- ✅ GA4 analytics

**Core Product**
- ✅ Authentication (magic link via Supabase)
- ✅ Onboarding wizard (12 steps, company type, trades, location, GC list)
- ✅ PDF upload + AI extraction (Claude, project details, scope, deadline, GC names)
- ✅ Inbound email forwarding — forward bid invites to {slug}@bids.bidintell.ai, auto-scores and replies
- ✅ BidIndex Score (4 components: location, contract terms, client relationship, trade match)
- ✅ User-defined score weights — sliders in Settings, saved per account (core personalization mechanism)
- ✅ Weight presets (Relationship-First · Risk-Averse · Market-Volume · Trade Specialist)
- ✅ Scoring profile label (live feedback: "Relationship-First — You win on trust and track record")
- ✅ Bid Risk flag (scope gaps, rushed timeline, competition pressure, contract risk density)
- ✅ Competitive Pressure Score (gc_competition_density table, activates at ≥3 outcomes per client)
- ✅ Contract risk detection (AI-powered clause identification + penalty scoring)
- ✅ CSI section-level trade matching (6-digit section codes, not just division-level)
- ✅ Full-page bid report with score breakdown, extracted data, contract risks, deadline chip
- ✅ Dashboard with project list, analysis date, bid economics stats
- ✅ Outcome tracking: Won / Lost / Ghosted / Passed / No Bid (all 5 types with structured data)
- ✅ Outcome data: win amount, margin, bidder count, competitor names, no-bid reasons, hours spent
- ✅ AI learning progress indicator (outcome-based)

**Client Intelligence**
- ✅ Client database (7 types: GC, Subcontractor, End User, Building Owner, Municipality, Distributor, Mfg Rep)
- ✅ Client ratings (1–5 stars), tags, bid history, win/loss tracking
- ✅ Client normalization agent (fuzzy matching, alias management, dedup detection)
- ✅ Extracted client suggestions — post-analysis chips for one-click add of clients found in bid doc
- ✅ Client search / filter in Clients tab

**Team & Billing**
- ✅ Organizations + org_members schema
- ✅ Team tab: member list, invite flow, bid count + GO rate per member
- ✅ Stripe checkout with 7-day trial, FOUNDING30 and FOUNDER30 coupons
- ✅ Stripe billing portal
- ✅ Subscription gate (bypassed for @fsikc.com)

**Admin**
- ✅ Admin dashboard: beta feedback, client alias management, system stats
- ✅ Founder Metrics tab: user activity, ROI leads, activation data
- ✅ BuildingConnected OAuth sync (internal only — ryan@fsikc.com)

### Pricing Tiers (Live)

| Tier | Seats | Monthly | Annual |
|------|-------|---------|--------|
| Solo | 1 | $49 | $490 |
| Team | up to 3 | $99 | $990 |
| Company | up to 8 | $179 | $1,790 |
| Enterprise | 9+ | Custom | Contract |

Trial: 7 days. Coupons: FOUNDING30 and FOUNDER30 (both 30% off).

---

## THE MOAT: WHY THIS BEATS GENERIC AI

Any LLM can score a bid. ChatGPT can read a PDF and say "looks risky." That's not the moat.

The moat is the proprietary data layer that accumulates with every decision:

1. **The outcome corpus** — win rates, margins, decline reasons, bidder counts per client. Nobody else has this data for subcontractors.
2. **Personalized scoring weights** — a score calibrated to *your* company's risk tolerance, relationships, and margin targets. No two BidIntell accounts score the same bid the same way.
3. **Client behavior dossiers** — years of ghost rates, RFI responsiveness, payment history, scope clarity per client. Irreplaceable after 12 months.
4. **The override loop** — when an estimator disagrees with AI, that's a labeled training example. 50+ overrides = a recalibrated model no competitor can reconstruct.
5. **The benchmark network** — anonymized cross-user intelligence that improves as users join. Only possible with proprietary outcome data.

After 12 months of active use, a BidIntell account cannot be reproduced on any competitor's platform — not in a week, not in a year.

---

## BIDINDEX SCORING MODEL

### The Core Principle: Weights Are User-Defined

This is the most important architectural decision in BidIntell. A flooring sub in a dense metro market weights location differently than a specialty mechanical contractor working nationally. A company with deep client relationships weights client score higher than a startup chasing any open bid.

**No fixed weight set is right for all users.** The power of BidIntell is that the score means something specific to *this company's* risk tolerance and business model.

**Today:** 4 components, user-adjustable sliders in Settings, saved per account in `user_settings.weights`.

### Current Components

```
BidIndex = (Location Fit      × W1)
         + (Contract Terms    × W2)
         + (Client Rel.       × W3)
         + (Trade Match       × W4)

Default weights: W1=25, W2=30, W3=25, W4=20
User presets: Relationship-First · Risk-Averse · Market-Volume · Trade Specialist
Constraint: W1 + W2 + W3 + W4 = 100 (enforced by UI)
```

Competitive Pressure runs as an additional signal (weight=10, activates when ≥3 outcomes exist per client).

### 5-Dimension Upgrade Path (Q2–Q3 2026)

As outcome data accumulates, expand to 5 explicit dimensions — each user-adjustable:

| Dimension | Default Weight | What It Measures | Activates |
|---|---|---|---|
| Strategic Fit | 30% | Trade match + location + building type history | Day 1 |
| Execution Risk | 25% | Scope completeness + contract risk + timeline | Day 1 |
| Commercial Risk | 20% | Contract terms + bid shopping + retainage | Day 1 |
| Win Likelihood | 15% | Client relationship + competitive pressure + past win rate with this client | ≥3 outcomes |
| Margin Posture | 10% | Historical margin on similar won bids | ≥5 WON outcomes with margin captured |

**Migration:** Auto-migrate legacy 4-component weights → 5-dimension defaults on first load. Show one-time "We upgraded your scoring model — review your weights" banner.

### Estimator Override Loop (Q2 2026)

When a user changes the AI recommendation (PASS → GO or GO → PASS), capture:
- Override direction
- Reason category (relationship, capacity, margin, scope, market, other)
- Free text note

Store in `projects.estimator_override` JSONB. Over time, surface patterns: "You override PASS→GO on high-client-score bids 8x more than average — consider raising your Client Relationship weight."

---

## GAME THEORY INTELLIGENCE FRAMEWORK

*These modules formalize the strategic decision science embedded in BidIntell's scoring. They are not abstract — each maps directly to built or near-term features.*

### Module 1: Competitive Pressure Score *(Complete)*

**Basis:** Nash Equilibrium bid shading. In sealed-bid auctions, optimal strategy is not to bid at true cost — it's to shade based on expected competitor count. More competitors = tighten margin; fewer = price up.

**What it does:** Tracks how many subs typically bid each client by trade. Surfaces a Competitive Pressure score (0–100) on each bid. Requires ≥3 data points per client before activating — never fakes confidence.

**Status:** Built. `gc_competition_density` table live. Activates when outcome bidder count data accumulates.

### Module 2: Bid Risk Flag *(Complete)*

**Basis:** Winner's Curse. In common-value auctions with uncertain project difficulty, the winner is often whoever underestimated costs most. The sub who wins a bad bid is worse off than the one who passed.

**What it does:** Analyzes bid docs for risk indicators — vague scope, rushed timeline, high competition, unfavorable contract clause density, bid shopping language. Returns Moderate / Elevated / High with contributing factors.

**Status:** Built. `calculateBidRisk()` runs on every analysis.

### Module 3: Client Relationship Intelligence *(Q3 2026)*

**Basis:** Repeated game dynamics. Optimal strategy with a client seen 10 times differs fundamentally from a first interaction. In one-shot games, defection dominates. In repeated games, cooperation emerges because reputation matters.

**What it adds:**
- Relationship score per client (derived from bid history, win rate, ghost rate, project completions)
- Game classification: Repeat Partner vs. One-Shot Behavior
- Strategy recommendation: "3 projects completed with this client — reliable repeat partner. Prioritize." vs. "One-shot behavior pattern — price accordingly or pass."

**Data:** Outcome tracking (built) + ghost capture (built) + client tags (built). This is aggregation and display logic, not new data collection.

### Module 4: Two-Sided Market *(Phase 4+ — DO NOT BUILD EARLY)*

**Basis:** Two-sided platform dynamics. GCs have a complementary problem — they need quality subs and face compliance pressure around fair bidding documentation.

**Sequence (do not skip steps):**
- Phase 1–3: Build entirely for subs. Do not approach GCs.
- Phase 4 trigger: 500+ subs, 2,000+ client data points. Then approach GCs with: "We have 200 verified electrical subs in KC actively tracking your bids."
- Phase 4+: GCs pay for verified sub network access. Subs stay free or discounted as network contributors.

**Critical warning:** Do not flip to GC monetization before subs feel the platform is *theirs*. The moment subs perceive BidIntell as working for GCs, trust collapses and the network effect reverses. Sequence is everything.

---

## FEATURE MOAT SCORES

Features ranked by defensibility. Score 1–5 across: Data Moat · Workflow Lock-in · Network Effect · Domain Depth · Revenue/Retention.

| Feature | Composite | Tag |
|---|---|---|
| Client behavior profiles (win rate, ghost rate, RFI, payment) | 4.6 | **Moat** |
| Outcome capture (win/loss/no-bid) | 4.4 | **Moat** |
| Competitive Pressure Score | 4.4 | **Moat** |
| AI learning / outcome-trained recs | 4.4 | **Moat** |
| No-bid reason capture | 4.2 | **Moat** |
| Estimator override loop | 4.2 | **Moat** |
| Project twin finder | 4.2 | **Moat** |
| Win/loss analytics dashboard | 4.2 | **Moat** |
| Cross-user win-rate benchmarks | 4.0 | **Moat** |
| Personalized scoring weights | 4.0 | **Moat** |
| Client relationship score | 3.6 | **Moat** |
| Capacity vs. pursuit portfolio view | 3.6 | **Moat** |
| Inbound email forwarding | 3.2 | **Moat** |
| CSI section picker / trade match | 3.2 | **Moat** |
| AI bid scoring (GO/REVIEW/PASS) | 3.0 | Parity |
| Contract risk detection | 2.8 | Parity |
| Bid Risk flag | 2.8 | Parity |
| Team tab / multi-user | 2.6 | Parity |
| Bid report (display) | 2.2 | Parity |
| BuildingConnected sync | 2.4 | Parity |
| Works-with SEO pages | 1.2 | Commodity |

---

## MOAT-FIRST ROADMAP (Q2–Q4 2026)

### Phase 1 — Core Decision Substrate *(Q2: April–May — Mostly Complete)*

**Goal:** Every bid scored reliably. Every recommendation explainable. Users trust the score.

**Remaining:**
- Inbound email forwarding: resolve PDF size limit (>6MB fails)
- Outcome modal surfaced consistently after every bid closes
- 5-dimension weight migration when data is sufficient

**Success metrics:**
- ≥80% of uploaded bids produce a valid GO/REVIEW/PASS
- ≥3 bids scored per active user per month

---

### Phase 2 — Proprietary Data Capture & Feedback Loops *(Q2–Q3: May–July)*

**Goal:** BidIntell learns from every decision you make.

**Build list:**
- [ ] **Estimator override capture** — "Override Decision" button on report; saves direction + reason to `projects.estimator_override`
- [ ] **Client behavior card fields** — Add RFI responsiveness (1–5) and payment flag to outcome form; display on client card
- [ ] **Win/loss analytics dashboard** — Win rate by client, building type, trade; score vs. outcome correlation chart
- [ ] **Outcome completeness nudges** — Require margin on WON; require "how high" on LOST; surface completion % in dashboard
- [ ] **Competitive Pressure explainer** — Expand the card: show which past projects feed the score, plain-language guidance, activation progress

**Why it increases defensibility:**
After 50 logged outcomes, BidIntell knows things about a sub's business that no competitor can reconstruct. Every override is a labeled training example. Every no-bid reason is a strategic filter no generic AI has.

**Success metrics:**
- ≥60% of PASS decisions have a logged decline reason (90 days)
- ≥50% of WON outcomes have margin captured
- ≥80% of active accounts have ≥5 outcomes logged (90 days)

---

### Phase 3 — Networked & Behavioral Intelligence *(Q3: July–September)*

**Goal:** Client behavior is a first-class data object. Cross-user signals begin.

**Build list:**
- [ ] **Client behavior cards** — Per-client profile: avg bidder count, ghost rate, win rate, RFI responsiveness, payment flag, scope clarity history
- [ ] **Project twin finder** — Surface 2–3 most similar past bids (by client, building type, trade, location) + their outcomes and margins
- [ ] **Anonymous cross-user benchmarks** — "Subs in your trade typically see X bidders on this client's jobs" — activates at ≥10 contributing users per bucket; `benchmark_cache` table populated nightly
- [ ] **AI recalibration from overrides** — Detect per-user calibration patterns; surface weight adjustment suggestions in Settings
- [ ] **5-dimension BidIndex migration** — Activate Win Likelihood and Margin Posture dimensions when sufficient outcome data exists

**Why it increases defensibility:**
Client behavior cards are irreplaceable after 12 months. Cross-user benchmarks are the first true network effect — the product gets better as users join. Project twins surface institutional memory that lives nowhere else.

**Success metrics:**
- ≥5 client behavior cards populated per active account
- Twin finder surfaced on ≥30% of bid reports after ship
- At least 1 trade vertical with ≥10 users contributing to cross-user benchmarks

---

### Phase 4 — Portfolio & Management Layer *(Q4: October–December)*

**Goal:** BidIntell moves from estimator tool to pursuit management system. Owner/principal retention.

**Build list:**
- [ ] **Capacity vs. pursuit view** — Open bids in flight, estimated hours, capacity headroom, overbidding flag
- [ ] **Pursuit pipeline** — Status board replacing flat project list (scoring → submitted → awarded/lost)
- [ ] **Team win/loss visibility** — Org-level outcome rollup for Company plan
- [ ] **Monthly summary email** — Auto-generated: bids scored, won, lost, total contract value, win rate trend
- [ ] **Win rate analytics Phase 2** — Score vs. outcome correlation chart; bid economics by decision type

**Why it increases defensibility:**
The management layer creates org-level lock-in. When the owner uses BidIntell for the weekly pipeline meeting, churn becomes very hard. This is the transition from individual tool to company OS.

**Success metrics:**
- ≥50% of Company accounts use capacity view in first 30 days
- Monthly email open rate ≥40%
- Company-plan churn ≤5% quarterly

---

### Phase 5 — Adoption Parity *(Q4+, only if blocking growth)*

Build only if named users or prospects cite these as blockers to paying:
- Mobile/Safari responsive polish
- BuildingConnected auto-import (only if Autodesk ISV approved)
- Bulk CSV bid history import
- SSO/SAML (Enterprise only, on-demand)

---

## BUILD ORDER (Near-Term)

### Now
1. Estimator override capture — 3 hours
2. Client behavior card fields (RFI responsiveness, payment flag) on outcome form — 4 hours
3. Win/loss analytics dashboard — 4 hours

### Q2 (May–June)
4. Outcome completeness nudges
5. Competitive Pressure explainer
6. Inbound email PDF size limit fix

### Q3 (July–August)
7. Project twin finder (needs ≥20 outcomes to be useful)
8. Client behavior cards full display
9. Anonymous cross-user benchmarks (build schema now; UI activates at threshold)

### Q4
10. Portfolio / capacity vs. pursuit view
11. Two-sided market prep (schema only — no GC-facing features yet)

### Hard dependency chain
```
User-defined weights + outcome completeness
        ↓
≥3 outcomes per client → Competitive Pressure activates
≥20 total outcomes → Twin finder is useful
≥50 total outcomes → Override calibration is meaningful
≥10 active accounts → Cross-user benchmarks activate
```

---

## ANTI-ROADMAP

Explicit list of what not to build, and why.

| Feature | Problem | Decision |
|---|---|---|
| BuildingConnected auto-sync | Autodesk ISV approval unresolved. BC data available to any tool that integrates — no proprietary data advantage. | **Push to Phase 5 or cut.** Don't block moat work on it. |
| Works-with SEO pages | Pure marketing. Zero product moat. | **Already built — do not expand.** No further investment. |
| AI advisor personality / tone picker | Users don't care after week 1. Onboarding friction, zero moat. | **Remove from onboarding.** Keep buried in Settings for power users only. |
| Contract risk as standalone feature | Generic LLMs do contract review. Competing with Harvey, Ironclad, ChatGPT. No proprietary data. | **Keep as scoring signal only.** Do not market or build as standalone surface. |
| Custom report PDF export | Every user asks, zero churn over it. | **Push to Q4.** Only build if Enterprise deal requires it. |
| SSO / SAML | Only matters for 50+ seat Enterprise. Current plan is 1–8 seats. | **Do not build until real Enterprise prospect demands it.** |
| Bulk CSV import | High data quality risk. Parity with any SaaS tool. | **Push to Q4.** Only if 3+ paying prospects cite as blocker. |
| Two-sided GC monetization | Trust collapses if subs feel platform works for GCs. Sequence is everything. | **Locked to Phase 4+.** Trigger: 500+ subs, 2,000+ client data points. |

---

## THE DEFENSIBILITY FLYWHEEL

```
User scores a bid
        ↓
BidIndex gives personalized recommendation (their weights, their clients)
        ↓
User logs outcome (won/lost/no-bid/override)
        ↓
Client behavior profiles get smarter
Competitive Pressure activates (≥3 outcomes per client)
Project twin finder finds better matches
Margin Posture dimension activates
        ↓
Next recommendation is more accurate
        ↓
User trusts the score more → logs outcomes more
        ↓
Moat compounds.
```

---

## DECISION FRAMEWORK

Before building any feature, ask:

1. **Does this increase defensibility?** Check the moat scores table. Composite < 3.0 = parity feature. Build only if it unblocks adoption.
2. **Is this the right phase?** Phases are sequenced by dependency. Don't build Phase 3 features before Phase 2 data exists.
3. **Is there a simpler version?** v1 of anything is always smaller than you think it needs to be.
4. **Is it on the anti-roadmap?** If yes, the answer is no.

Default answer to any feature request: "Not yet — that's Phase X."

---

## VERSION HISTORY

| Version | Date | Summary |
|---|---|---|
| v1.0 | Jan 13, 2026 | Initial roadmap |
| v1.1 | Jan 22, 2026 | Personalized scoring engine |
| v1.2 | Jan 26, 2026 | 4-component scoring |
| v1.3 | Jan 26, 2026 | Multi-client support |
| v1.4 | Jan 29, 2026 | Trust features + data moat |
| v1.5 | Feb 3, 2026 | Intelligence Layer Framework |
| v1.6 | Feb 5, 2026 | Company types, multi-signal detection |
| v1.7 | Feb 6, 2026 | Full-page reports, county location |
| v1.8 | Feb 7, 2026 | Phase restructure, validate before scale |
| v1.9 | Feb 24, 2026 | Game Theory Intelligence Framework; Competitive Pressure Score; Bid Risk Flag; Client Relationship Intelligence module; Beta cold-start strategy; Two-sided market sequencing |
| **v2.0** | **Apr 8, 2026** | **Moat-first strategy layer integrated. Full current-state audit. Phase 1+1.5+2 marked complete. Q2–Q4 moat-first roadmap. User-defined weights as core personalization. No-bid outcome. Weight presets + scoring profile. 5-dimension BidIndex upgrade path. Anti-roadmap added. Client language (replaces GC). BidIntell_Moat_Strategy_v1.md retired into this document.** |

---

**This is the Bible. v2.0. One doc. One roadmap. Capture decisions. Build the moat. Validate before scale.**
