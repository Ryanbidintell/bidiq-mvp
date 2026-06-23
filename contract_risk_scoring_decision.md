# Contract Risk Scoring — Design Decision (Jun 22 2026)

**From an /office-hours challenge-the-approach session. Status: DECIDED, not yet built. Revisit after the Jun 23 Autodesk call.**

## The decision
**Decouple contract risk from the BidIndex. Do not penalize the score for the presence of risk clauses.** Surface them as an awareness panel + flag only the clauses that are *worse than normal*.

## Why (Ryan's 20-year domain truth)
Every GC's subcontract has the same risk clauses — pay-if-paid, no-damage-for-delay, indemnification, LD flow-down — and they are effectively **non-negotiable** ("never once in 20 years negotiated them out"). Therefore:
- Penalizing the *presence* of a universal clause makes **every** bid score low → the feature becomes noise estimators turn off.
- The signal is not presence, it's **deviation**: is *this* contract worse than the market norm?
- The value is **awareness + time saved**, not bid/no-bid deflation: "we read the 194-page subcontract in seconds and found the one clause worse than usual, so you can price/staff/plan for it."

## The approach (chosen: awareness panel + above-market flag, decoupled)
1. **BidIndex** stops including a contract-risk penalty by default. It answers "good fit, worth my time."
2. **Contract panel** (separate display) answers "what am I signing, and what's worse than normal." Always shows detected clauses with the quoted language + plain-English meaning.
3. **Standard vs above-market tag** on each clause:
   - **STANDARD (no flag):** pay-when-paid, ordinary indemnity, standard retainage, normal LDs — table stakes, no worse than the **AIA A401** baseline.
   - **ABOVE-MARKET (flag + "what to do" note):** pay-IF-paid w/ "condition precedent," no-damage-for-delay, indemnity covering the GC's OWN negligence, change-notice windows under ~48h, LDs flowed down AND stacked with no-damage-for-delay, one-sided consequential-damages waiver.

## Day-one "above market" without a corpus
Use **AIA A401 (the industry "fair" standard subcontract) as the baseline**. Flag clauses more aggressive than A401. The `contract_risk_detection_guide.md` already encodes the standard-vs-aggressive distinctions (pay-if-paid vs pay-when-paid, etc.). The corpus version (score vs "McCarthy's usual") is the later moat upgrade, not needed to ship value.

## Code-change map (for /plan-eng-review when building)
- `app.html:4777` `calculateContractRiskPenalty()` + its subtraction in `calculateScores()` (~10784): stop feeding the BidIndex by default.
- `contract_risks` jsonb already stores `severity` + `classification` per clause → the awareness panel already has its data.
- Add a `standard | above_market` tag per clause, driven by a curated ruleset (see assignment).
- Two displays, two questions: BidIndex = fit; Contract panel = terms + deviations.

## Assignment (Ryan)
Pull 4-5 real subcontracts (Turner Form 36, JE Dunn, McCarthy, etc.) + AIA A401 as baseline, and hand-mark every risk clause STANDARD vs ABOVE-MARKET. That hand-labeling **is** the day-one above-market ruleset and doubles as the detector's test set. (Use the Claude Desktop prompt — upload contracts, let it draft the classification, Ryan corrects.)

## Connection to platform strategy
Above-market detection only works on the **real contract document**, which is exactly the document access being negotiated with Autodesk (Data Management / Forma) and PlanHub. The contract-risk feature is a concrete reason the document-pull matters. See [[bidintell-bc-roadmap]] / [[bidintell-platform-strategy]].

## NOT changing
- The fit-score components/weights (separate question; the fit score's real near-term value = speed + accruing outcome data on best GCs/building-types/end-users).
