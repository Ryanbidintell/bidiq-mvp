# Contract-Clause Labeling Prompt (unblocks the outlier contract penalty)

**Purpose:** hand-label a few real subcontracts vs the AIA A401 fair baseline to build the STANDARD-vs-ABOVE-MARKET ruleset. That labeling *is* the day-one ruleset **and** the detector's test set. Output maps directly to `CONTRACT_CLAUSE_TIER` in `lib/scoring-core.js`.

## How to use
1. Open Claude Desktop (or claude.ai). Upload **one subcontract PDF** + (optionally) the **AIA A401** as the baseline.
2. Paste the prompt below.
3. Correct Claude's draft where your 20 years say otherwise — *your* correction is the ground truth.
4. Repeat for 4–5 real subs (Turner Form 36, JE Dunn, McCarthy, + a couple you have).
5. Send me the collected results; I'll merge into `CONTRACT_CLAUSE_TIER` + build the test set.

## The prompt
```
You are a construction contract analyst helping a subcontractor. I'm uploading a
subcontract agreement. Compare each risk-bearing clause to the AIA A401 standard
subcontract (the industry "fair" baseline).

For EACH risk clause you find, output a row:
- clause_type: a short snake_case id (e.g. pay_if_paid_condition_precedent,
  no_damage_for_delay, own_negligence_indemnity, change_notice_window,
  retainage, liquidated_damages, consequential_damages_waiver, flow_down)
- verbatim_quote: the exact clause text (short)
- tier: STANDARD (no worse than AIA A401 — table stakes) or ABOVE_MARKET (more
  aggressive than A401 — shifts real risk/cost onto the sub)
- why: one sentence, plain English, on what makes it standard vs above-market
- page_ref: page/section if visible

Rules:
- Presence of a clause is NOT automatically bad. Pay-when-paid, ordinary
  indemnity, normal retainage, standard LDs = STANDARD.
- Flag ABOVE_MARKET only when the term is materially worse than A401, e.g.:
  pay-IF-paid with "condition precedent", no-damage-for-delay, indemnity covering
  the GC's OWN negligence, change-notice windows under ~48h, LDs stacked with
  no-damage-for-delay, one-sided consequential-damages waiver.
- If unsure, mark STANDARD and say why you're unsure. Do not invent clauses.

Return a clean table, then a JSON array of {clause_type, tier} at the end.
```

## What I do with it
- Every `clause_type` you confirm as `ABOVE_MARKET` → added to `CONTRACT_CLAUSE_TIER` as `'above_market'` (a bounded −6 each, capped −15). STANDARD → never penalizes (stays a neutral alert chip).
- The verbatim quotes + tiers become the detector's regression test set.
- Ships behind the same admin gate; broadened after eval.
