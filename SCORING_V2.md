# BidIndex v2 — Target Scoring Architecture (design)

**Status: DESIGN + core module built, NOT wired into prod.** `SCORING.md` remains "what's live now"; this is "where we're going." Foundation lives in `lib/scoring-core.mjs` (pure, tested, unimported by prod yet).

## The one idea
Score the **document set you actually have**, and make **confidence scale with completeness**. Invite vs full is not two engines — it's one engine with more or less data. Missing data lowers confidence; it never injects a fake default (fixes today's location→50 / trade→0 trap and the R-1 two-engine divergence at once).

## Three weighted buckets (the whole model; everything else is modifier/alert)
| Bucket | Question | Absorbs |
|---|---|---|
| **Project Fit** | "the kind of job I want?" | location + building-type preference + turnaround + (size later) |
| **Scope Fit** | "is this *my* work?" | Trade Match (CSI sections + scope keywords) |
| **Client Fit** | "want this GC?" | client relationship + Competitive Pressure |

`index = Project·wP + Scope·wS + Client·wC (weights sum 100) + keywordModifier(±10) − outlierContractPenalty(0..15)`, clamped 0–100.

## Data-availability modes
- **invite** — email/invite only: project name, location, due date, GC, subject/body scope hints, submission reqs, bidder clues, portal link. Verdict = triage (Open&Assign / Worth a look / Likely skip). Never a confident GO.
- **partial** — some docs.
- **full** — invite + drawings + specs + addenda + forms + exhibits. Verdict = GO/REVIEW/PASS.

`completeness` (0–100) is computed from which expected signals resolved and shown with every score.

## Weighting / modifiers / alerts
- **User-weighted (3 sliders, sum 100):** Project / Scope / Client.
- **Modifiers (bounded, not weighted):** favorable/risk keywords (±10), capacity (recommendation nudge).
- **Alerts (annotate, no weight):** contract clauses (standard = neutral chip; **outlier vs AIA A401 = bounded penalty**), rushed timeline, many bidders, bid-shopping, vague scope, low completeness.

## Building-type preference (per the Jul-7 decision)
Optional `target_building_types` on user_settings. Match → small **boost** to Project Fit; non-match → **neutral** (never a penalty — protects serendipity); unknown/low-confidence type → **abstain** + lowers completeness. Not its own slider. Learned-from-outcomes version is a later moat upgrade.

## Contract risk
Alerts by default; **outlier-only bounded penalty** vs AIA A401 baseline (Phase B, needs hand-labeled subcontracts). Standard clauses never move the score.

## Addenda
Not a category. New/revised docs enter the current set (latest-dated wins per field → supersession), re-run the same scorer, recompute completeness + index, show a **diff** ("bid date +7d, Scope 62→78").

## Engine
One pure `scoreOpportunity(opportunity, profile)` (in `lib/scoring-core.mjs`) called by BOTH paths. Normalized `opportunity` object carries per-field `{value, confidence}` + `availability`. Migrate via shadow mode (log v1-vs-v2 divergence on real traffic, cut over when quiet), admin-gated. Kills R-1.

## Rollout — see `improvement-sprint/HANDOFF_V2.md`.
