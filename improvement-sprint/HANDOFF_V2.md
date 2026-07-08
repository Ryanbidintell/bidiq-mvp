# v2 Scoring Rollout — HANDOFF (2026-07-07, autonomous block)

Everything here is on branch **`sprint/v2-scoring-core`**, **not pushed, not wired into prod, zero user impact.** I did NOT touch any live scoring path — the unified engine is built as a standalone, tested module that nothing imports yet. Wiring it in (shadow mode) is the next session, with you present + eval data.

## Done this block
- **`SCORING_V2.md`** — the target architecture (one engine, 3 buckets Project/Scope/Client, availability modes invite/partial/full, completeness meter, modifiers/alerts, addenda-as-updates, outlier-only contract penalty, building-type preference).
- **`lib/scoring-core.js`** — the v2 unified core, pure + dual-mode (browser `<script>` + Node), the shared framework both paths will call (the R-1 fix). Implements:
  - 3 buckets, each returns `{score, confidence, reasons, alerts}` and **abstains** (excluded from the weighted index, weights renormalized) when data is missing — never a fake default.
  - **Building-type preference (your Jul-7 decision):** match → +10 Project Fit boost; non-match → **neutral (no penalty)**; unknown/"Other"/low-confidence → **abstains**. Confidence-gated. Not its own slider.
  - Completeness 0–100; mode-specific verdict (full → GO/REVIEW/PASS; invite/partial → OPEN_AND_ASSIGN / WORTH_A_LOOK / LIKELY_SKIP — **never a confident GO on thin data**).
  - Competitive Pressure folded into Client Fit; keyword ±10 modifier; contract clauses as alerts.
- **`scripts/test-scoring-core.js`** — 17/17: full vs invite verdicts, building-type boost/neutral/abstain, missing-data abstain, completeness, competitive fold-in, modifier caps.

## ⚠️ AI extraction check (you asked to confirm the AI picks up project/building type)
- **Upload path: YES.** `app.html` extract prompt classifies `building_type` (12 types: Healthcare/Office/Multifamily/Retail/Industrial/Education/Higher Education/Government/Religious/Mixed-Use/Infrastructure/Other) **and** `project_type` (New Construction/Renovation/Addition/TI/Demolition/Mixed). Both extracted today.
- **Email / invite path: NO.** The edge extract schema (`supabase/functions/inbound-email/index.ts:692` & `:755`) omits `building_type` — it only pulls gc/project name/city/state/address/due-date/scope/trade_keywords/bond/value. **So building-type scoring can't work on the email/invite path until we add `building_type` (and ideally `project_type`) to that schema.** One-line prompt add, but it's an edge-function change (deploys separately) — folded into the unification below.

## NEXT (needs you + can't be done blind)
1. **Wire `lib/scoring-core.js` into both paths in shadow mode** — run v2 alongside the live engine, log v1-vs-v2 divergence to `admin_events`, serve old, admin-gated. This is the actual R-1 fix. (Plan: `ITEM3_ENGINE_UNIFICATION_DESIGN.md`.)
2. **Add `building_type` (+`project_type`) to the edge/invite extraction schema** so Project Fit works on email/invite.
3. **`target_building_types` setting** (multi-select in Settings + onboarding; additive `text[]` on user_settings). The scorer already reads `profile.targetBuildingTypes`.
4. **Invite-mode UI** — Invite Score + completeness badge + triage verdict (the Wallworks inbox-triage wedge).
5. **Addenda diff/supersession** + **outlier contract penalty** (needs your hand-labeled subcontracts vs AIA A401).
6. **Eval baseline on real ITBs** → validate verdict-flips before serving v2 to anyone.

## LATER
Portal/doc-link auto-pull (Autodesk/PlanHub); crowdsourced competition + GC-payment intel; per-estimator/team analytics.

## Also live-but-parked from earlier (unrelated to v2, still un-pushed on their branches)
Sprint items #0/#1/#2/#2b/R-7 (fallback guard, decline reasons, bid-date, product-match) — flag-OFF branches awaiting your review. The contract-decouple + keyword-consolidation are **admin-gated on live** for your QA.

Run all v2 tests: `node scripts/test-scoring-core.js`. Nothing here ships until you review + we shadow + eval.
