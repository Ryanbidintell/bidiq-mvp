# BidIntell — Build Roadmap

**Last Updated:** June 1, 2026
**Owner:** Ryan Elder
**Status:** ACTIVE — single source of truth for what to build and in what order

> **How to use this doc.** This is the one list. When a new idea hits, it goes in the Idea Parking Lot at the bottom — not into the build queue. Nothing moves to NOW until something in NOW ships. If a feature isn't on this page, the answer is "not yet." Check this before starting any build session.

---

## NORTH STAR

**Outcome logging rate ≥80%.** Every build decision is judged against one question: does this make a user more likely to log their next outcome? The accumulated outcome corpus is the acquisition asset. The scoring algorithm is replicable; the data is not.

---

## NOW — In-Flight / Next Up (as of 5/29/26)

This is the current to-do list. Build top to bottom. Do not start NEXT-tier work until these clear.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Instant AI feedback loop** | ✅ SHIPPED June 1 (commit `6d766f1`) | Module 1: score reconciliation, client tally, margin by building type, ghost-rate flag. Module 2: threshold progress meter (CP at 3, Twin Finder at 20, override cal at 50) with celebration state. Background reload. No new schema. |
| 2 | **Follow-up automation system** | ✅ Weeks 1-9 BUILT (May 22) — **blocked on Ryan OAuth/Azure setup** | Schema, sequence templates UI, schedule activation, Google OAuth, Microsoft OAuth, AI draft generation, approval & send UI (Gmail + Microsoft Graph), ghost outcome prompts, onboarding modal — all built and admin-gated. All user-visible UI hidden behind `isAdmin()`. Scheduled functions commented out in netlify.toml. Unblocked when Ryan: (1) sets up Google Cloud Console + Gmail API + 4 Netlify vars, (2) registers Azure app + 3 Netlify vars, (3) approves Week 10 soft launch to remove admin gates + uncomment scheduled functions. |
| 3 | **alert.js monitoring system** | ✅ SHIPPED June 2 (commits `7a6f57e`, `d3208cd`) | `netlify/functions/alert.js`: `sendAlert({source,severity,title,detail,dedupeKey,context})`. Always logs to `admin_events` (`event_type='system_alert'`); emails ryan@bidintell.ai via Postmark only for severity ≥ error, throttled (6h/dedupeKey, configurable `ALERT_THROTTLE_MINUTES`/`ALERT_EMAIL_MIN_SEVERITY`). Never throws. Also HTTP endpoint (GET=self-check, POST=client alerts). Wired into 5 paths: stripe-webhook (critical), inbound-email (project-save + reply-send), process-transcripts (auth/list/folder), analyze (scoring), notify (magic-link). Failure-only + throttled → respects the "shut off all emails" rule. Tested: `node scripts/test-alert.js` (25 assertions). **Bonus:** found + fixed a live P0 — inbound-email-background.js had a syntax error since `ec1de0d` (core flow failing to load); fixed in `28ce9f4`. Extended `scripts/check-app-syntax.js` to syntax-check ALL functions at build time so this can't recur. |
| 4 | **Diagnostic agent** | ✅ DONE | Primary acquisition funnel per GTM plan. Score a prospect's live bid, deliver as finished artifact, no signup. Feeds top of funnel. |
| 5 | **GTM execution (daily motion)** | In flight — ongoing | Not a build. LinkedIn primary: ~10 connects/day, 3 "send me a bid" offers/day, Pipedrive logging. Target 100 paying customers by Dec 31, 2026. Diagnostic offer is the funnel. Cold outbound is not primary. |

### Open limitations carried in NOW (verify/fix, not new features)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6 | **Scope filtering / CSI false-positive fix** | Not built — real limitation | Scanner currently reads full document, not filtered to user's CSI sections / trade keywords → false positives. **Corrects Bible v2.0 line 79, which wrongly marks CSI section matching complete.** Damages trust in the score, which damages logging — arguably belongs high in NOW, not deferred. |
| 7 | **Inbound email PDF size limit fix** | Open | Forwarded bid PDFs >6MB currently fail. Small fix, real friction. |
| 8 | **Outcome completeness nudges** | Open | Require margin on WON, reason on LOST, surface completion %. Prerequisite for #1 quality (garbage-in problem) — build alongside the feedback loop, not after. |

---

## PARTNERSHIP PIPELINE (parallel track — not a build queue)

Runs alongside the build work; doesn't compete for build hours. Status as of 5/29/26.

| Partner | Category | Status | Next action |
|---|---|---|---|
| **Togal.AI** | Takeoff (flooring-adjacent) | **Proposal SUBMITTED — under review by their team** | Wait on their response; warm intro via Ryan's friend in Togal sales |
| **MeasureSquare** | Takeoff (flooring) | Proposal going out **week of 5/29** | Send |
| **FloorRight** | Takeoff (flooring) | Proposal going out **week of 5/29** | Send |
| PlanSwift | Takeoff (general) | Not started — lower priority | After flooring story proven |
| Stack | Takeoff (general) | Not started — lower priority | After flooring story proven |
| PlanHub | Plan room | Active conversations (Barry → Samantha → Evan; Fleischman CPO) | Ongoing |

**Note:** The follow-up-automation gate on takeoff outreach was **released early** — proposals are going out now, ahead of the build shipping. Positioning: *"We filter, they measure"* / *"A faster takeoff on a wrong-fit job is still wasted time."* Doc: `BidIntell_Togal_Partnership_Proposal_v2.docx` (template for MeasureSquare + FloorRight).

---

## NEXT — Queued (do not start until NOW clears)

Sequenced by data dependency. These are real and planned, but blocked behind NOW.

1. **BuildingConnected API integration** — ~50–70% complete (OAuth scaffolding started). **Gated behind follow-up automation (#2).** MVP design locked: user clicks "Pull & Score" per opportunity (not fully automatic). Stage 0 pre-flight subscription check needed (403 = free-tier office, not auth failure). Audit prompt drafted.
2. **Competitive Pressure explainer card** — expand the card: show contributing projects, plain-language guidance, activation progress. Pairs naturally with the threshold meter in #1.
3. **Estimator override capture** — "Override Decision" button on report; saves direction + reason to `projects.estimator_override`. Labeled training data for future recalibration.
4. **Win/loss analytics dashboard** — win rate by client, building type, trade; score-vs-outcome correlation. **Frame as instant-feedback surfaces, not standalone dashboards, or you rebuild #1's logic twice.**
5. **Client behavior card fields** — RFI responsiveness (1–5) + payment flag on outcome form; display on client card.

---

## NOT YET — Anti-Roadmap (explicit no, with trigger conditions)

Do not build these. Each has a named trigger that must fire first.

| Feature | Why not | Trigger to revisit |
|---|---|---|
| Project twin finder | Not useful below data threshold | ≥20 total outcomes logged |
| AI recalibration from overrides | Not meaningful below threshold | ≥50 total outcomes logged |
| Cross-user benchmarks | No network effect yet | ≥10 active accounts per trade/market bucket |
| 5-dimension BidIndex migration | Win Likelihood + Margin Posture need data | Sufficient outcome + margin data exists |
| Two-sided / GC monetization | Trust collapses if subs feel platform works for GCs | 500+ subs AND 2,000+ client data points |
| Portfolio / capacity-vs-pursuit view | Phase 4 management layer | Company-tier retention becomes the focus (Q4) |
| BuildingConnected **auto**-sync (vs. click-to-pull) | No proprietary data advantage; Autodesk ISV unresolved | Autodesk ISV approved AND paying BC-active users ask |
| Bulk CSV import | Data-quality risk | 3+ paying prospects cite as blocker |
| SSO / SAML | Only matters at 50+ seats | Real Enterprise prospect demands it |
| Custom report PDF export | Zero churn over it | Enterprise deal requires it |
| Contract risk as standalone/marketed feature | Generic LLMs do this; no moat | Never as standalone — keep as scoring signal only |
| Paid ads / cold-email volume | Wrong stage, no outcome data to target | Post-100 customers with logged-outcome proof |

---

## DECISION FILTER (run before any new build)

1. Is it in NOW? If no → it waits.
2. Does it make a user more likely to log their next outcome? If no → high bar to justify.
3. Is it the right phase per the dependency chain? Don't build on data that doesn't exist yet.
4. Is there a smaller v1? There usually is.
5. Is it on the Anti-Roadmap? If yes → the answer is no until the trigger fires.

**Default answer to any new idea: "Parking lot. Not yet."**

---

## DEPENDENCY CHAIN

```
Instant feedback loop + outcome completeness nudges (#1, #8)
        ↓  (makes logging self-reinforcing → protects ≥80% north star)
Follow-up automation (#2)
        ↓  (gates partnership outreach + BC API)
BuildingConnected API (NEXT-1)
        ↓
Per-user thresholds unlock as data accumulates:
≥3 outcomes/client  → Competitive Pressure activates (built)
≥20 total outcomes  → Twin finder useful
≥50 total outcomes  → Override calibration meaningful
≥10 active accounts → Cross-user benchmarks activate
```

---

## IDEA PARKING LOT

New ideas land here, not in NOW. Reviewed deliberately, not in the moment they arrive.

- _(empty — add dated entries as ideas hit)_

---

*Cross-references: Product Bible v2.1 (source of truth for strategy/phases) · `BidIntell_FollowUp_Automation_Build_Spec_v1.md` · `BidIntell_Claude_Code_Prompt_OutcomeFeedbackLoop.md` · `BidIntell_GTM_Strategy_May2026_Dec2026.md` · CLAUDE.md · SCHEMA.md*
