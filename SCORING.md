# BidIntell Scoring Algorithm (BidIndex)

**Canonical reference for how the BidIndex is computed.** Last updated 2026-07-07.
Source of truth = `calculateScores()` in `app.html` (upload path). ⚠️ A second, slightly
divergent implementation scores the email-forward path (`supabase/functions/inbound-email/`)
— see "Two engines" at the bottom.

> **Status legend:** 🟢 LIVE for all users · 🟠 ADMIN-GATED (ryan@fsikc.com / ryan@bidintell.ai only, in validation) · ⚪ built but un-merged (not deployed).

---

## 1. The BidIndex

A **0–100** score, higher = better fit. Recommendation thresholds:
`>= 80 → GO` · `60–79 → REVIEW` · `< 60 → PASS`.

**Final = weighted sum of the component scores** (each `score × weight/100`), rounded.
Weights are **user-configurable** in Settings → Score Weights, must total 100. Defaults:
Location 25 / Keywords 30 / Client (GC) 25 / Trade 20. Presets: Relationship-First, Risk-Averse, Market-Volume, Trade Specialist.

---

## 2. Components (🟢 current live model)

### Location Fit
Geocode office + project → Haversine distance → score:
`≤25mi:100 · ≤50:85 · ≤100:70 · ≤150:50 · else 30`; if `dist > search_radius`, subtract 20 (floor 10).
- Unresolved location → default **50**. Same-city name match → 95 (est. 5mi); hardcoded KC-metro list → 90.
- `location_matters = false` → location weight redistributed to the other components, location score set aside.

### Keywords & Terms
Base **50**, **+8** per matched *good* keyword (user-configured), **drops to 30** if none match.
*Bad* keyword penalty (15/10/5 by `risk_tolerance`) applied only if contract language is present.
🟠 **Contract-risk clause penalty:** for non-admins, detected clauses (pay-if-paid, LDs, etc.) still subtract via `calculateContractRiskPenalty()`. **Admin-gated decouple removes this** (clauses become alerts, not a deduction — see §4). Clamp 0–100.

### Client Relationship (GC)
Per selected client: if bid/win history exists → win-rate weighted (`wins/bids × 100`); else `rating × 20`.
Competition penalty by number of GCs on the bid: `≤2:0 · ≤5:5 · ≤10:10 · else 15`. Default **50** if no client.

### Trade Match
If `preferred_csi_sections` set → scan specs for those section codes (+ their scope terms), presence-floor `min(65 + (n-1)×5, 100)`.
Else division mode over `trades[]`. Fallback when nothing matches → scope-keyword score (`30` if none, else `min(50 + 10n, 80)`).
- ⚪/note: distributors & mfg-reps currently return a **static 50 placeholder** (product match not computed) — pending the R-7 "not scored" fix (built, un-merged).

### Competitive Pressure (Module 4)
Per-user, from the user's **own** logged bidder counts (`gc_competition_density`). Weight **0 until 3+ outcomes** logged for that client; then weight 10 and `avg bidders → score` (`≤2:90 · ≤4:75 · ≤7:55 · ≤10:40 · else 25`). When active, the other four weights are each reduced ×0.9. *(Note: not "network"/cross-user data.)*

---

## 3. Contract-risk detection (always runs; how it's used is what changed)
`detectContractRisks()` (two-layer: keyword pre-filter → Claude clause library of ~10 categories: pay-if-paid, no-damage-for-delay, broad indemnification, LD flow-down, etc.). Results are stored on the project and **surfaced as alerts** (severity chips under the score + the Contract tab) regardless of scoring. How they affect the *number* depends on the decouple flag (§4).

---

## 4. Admin-gated changes in validation (🟠)
Gated to admin accounts via `isAdmin()`; every other user sees the §2 model unchanged. Not yet eval'd (pending labeled ITBs).

**(a) Contract-risk decouple** — `contractRiskDecoupled()`.
Clauses are **alerts, not penalties**: the contract-risk deduction is removed from the BidIndex. Rationale: every GC subcontract carries the same non-negotiable clauses, so penalizing their *presence* drags every bid down. UX matches (Score Weights slider "Contract Terms & Risk" → "Keywords & Terms"; "Risk-Averse" preset repurposed to client relationship & competition). Detection + alerts unchanged. Decision: `contract_risk_scoring_decision.md`. *Phase B (STANDARD vs ABOVE-MARKET vs AIA A401) not built.*

**(b) Consolidated scope model** — `scopeModelConsolidated()`.
**Trade Match owns "is this my work?"** (specs + scope keywords). The favorable/risk keywords stop being a weighted component and become a **capped ±10 modifier** on the final. The keywords weight redistributes to Trade Match (60%) + Client (40%). Keywords renders as a "MODIFIER: +N" line, not a weighted bar.
*Deferred: the Settings weights panel still shows 4 sliders (B2 = restructure to 3); secondary recompute sites, e.g. post-analysis address entry, re-sum via the old path and drop the modifier.*

> With both flags on (admin), the BidIndex = weighted Location / Trade / Client (+ Competitive) + a ±10 keyword nudge, with contract clauses shown as alerts.

---

## 5. Modifiers (not weighted components)
- **Capacity** (`slow`/`steady`/`aggressive`): a recommendation *nudge* on marginal bids ("you can probably pass" / "worth pursuing"), NOT a weighted input.
- **Bid Risk flag** ("ELEVATED"): a separate awareness flag from `calculateBidRisk()` (public bid, many bidders, bid-shopping language, vague scope, rushed timeline) — does not change the BidIndex.

---

## 6. Two engines (⚠️ known divergence — R-1)
- **Upload path:** `calculateScores()` in `app.html` — the source of truth above.
- **Email-forward path:** `supabase/functions/inbound-email/index.ts` — a separate implementation. Location mapping + trade presence-floor match; **keywords & GC scoring differ**, so the same bid can score slightly differently by channel. Verdict thresholds match (80/60). The shared CSI scope lexicon is generated from `app.html` via `scripts/gen-csi-scope.js`. Unifying these into one shared module is a planned change (see `improvement-sprint/ITEM3_ENGINE_UNIFICATION_DESIGN.md`).

---

## 7. Where scores are stored
`projects.scores` jsonb: `{ final, recommendation, components: { location, keywords, gc, trade, competitive }, weights }`. Each component: `{ score, weight, reason, details }`. See `SCHEMA.md`.
