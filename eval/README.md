# Extraction + Scoring Accuracy Eval (golden set)

The `test-*.js` scripts check the engine's **logic**. This checks its **accuracy** on
real bids: does extraction get the fields right, and does the score land in the right
GO / REVIEW / PASS band?

You can't improve accuracy you don't measure. This is the measurement.

## Run it

```bash
node scripts/eval-extraction.js          # grade eval/golden/*.json, print report
node scripts/eval-extraction.js --min 85 # also exit 1 if field accuracy < 85% (for CI gating)
```

## Add a real bid (2 minutes)

1. Copy `eval/golden/_template.json` → `eval/golden/<short-id>.json`.
2. Run the bid through BidIntell in the app.
3. Fill **`expected`** with the hand-verified truth (what the fields *should* be — you're the domain expert; this is the ground truth).
4. Paste what the app actually produced into **`extracted_snapshot`** (and `scored_snapshot`).
5. Re-run. The report shows where extraction missed and whether the score band was right.

Start with the bids you already have in front of you — Mindy's (mechanical, prevailing wage), Wallworks' (drywall), Regents' (flooring). A dozen labeled bids across full plan sets / thin invites / image-only drawings is enough to make every future prompt or scoring change safe.

## What it grades

- **Scalars/enums** (`building_type`, `project_state`, `prevailing_wage`) — exact match.
- **Arrays** (`spec_divisions_found`, `sheet_disciplines_found`, `scope_of_work_trades`) — precision/recall/F1 (partial credit shown).
- **Presence** — any `expected` key ending in `_present` (e.g. `bid_deadline_present`) checks the base field is non-empty in the snapshot.
- **Recommendation band** — `expected_recommendation` vs `scored_snapshot.recommendation`, plus `|score delta|` if `expected_score` is set.

Output: per-bid pass/miss, **per-field accuracy (worst first)** so you see where extraction actually breaks, and an overall summary.

## Notes / roadmap

- **Offline by design.** It grades captured snapshots, so it's free, deterministic, and CI-safe. Re-capture snapshots after a prompt/model change to catch regressions and model drift (this is what would have caught the retired-model outage that silently returned fallback scores).
- **Live re-extraction** (re-run the current model over the raw bid text) is a future add — it needs the extraction prompt lifted out of `app.html` into a shared module so the harness and the app share one source of truth. Worth doing when you unify the v1/v2 engines.
- Keep raw bid **PDFs out of git** (large + sensitive). The golden JSON here holds only labels + extracted text fields, which are safe to commit.
- Delete `example-thin-invite.json` once you've added real bids — it's only here so the report has something to show.
