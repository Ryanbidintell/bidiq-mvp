# BidIntell — Claude Code Build Prompt
## Instant Outcome Feedback Loop (Phase 2 — Logging Reinforcement)

---

## CONTEXT

You are building a new feature set for BidIntell, an AI-powered bid intelligence platform for construction subcontractors. The app is a single-file HTML application (`app.html`) using vanilla JavaScript and Supabase (PostgreSQL + RLS + magic-link auth) as the backend. The Claude API is used for document analysis via `analyze.js`.

**The strategic problem this solves:**

BidIntell's data moat depends on a high outcome-logging rate (north star: ≥80%). The activation thresholds for intelligence features are already low and tiered — ≥3 outcomes per client activates Competitive Pressure, ≥20 total makes Twin Finder useful, ≥50 makes override calibration meaningful. The problem is **not** that the thresholds are high. The problem is that they are **invisible**. A user logs their first several outcomes into what feels like a void — no immediate payoff at the moment of entry, and no visible sense that they are filling a meter toward something useful. A low threshold the user cannot see is functionally identical to a high one.

**This build fixes that by doing two things, every single time a user logs an outcome:**

1. **Instant local analysis** — surface something useful the moment the user hits save, computed entirely from data we already have. No threshold required. This is the reward at the point of cost.
2. **Visible threshold progress** — show the user how close they are to unlocking each named intelligence feature, framed as a goal they are pulling toward, not silent backend plumbing.

The goal: convert the existing 3/20/50 threshold ladder from a logging *hope* into a logging *engine*.

**Read the existing codebase before writing any code.** Specifically understand:
- The current outcome tracking modal flow (Won/Lost/Ghost/Declined) and where `outcome_data` jsonb is written to the `projects` table
- The `clients` table (note: it is `clients`, NOT `general_contractors` — `getGCs()` is a legacy wrapper) and how `bids`/`wins` counts are maintained per client
- The existing bid report card styling so new components feel native
- How `scores.final` and `scores.recommendation` are stored per project

Commit before you start and after each module.

---

## DESIGN PRINCIPLE: REWARD THE ENTRY IN THE ENTRY MOMENT

Every piece of analysis in this build must satisfy one test: **does the user see value within the same session in which they logged?** If a feature requires waiting for accumulated volume before it shows anything, it does NOT belong in Module 1 — it belongs in the progress meter (Module 2) as a "coming soon, X more to go" state instead.

No jargon. Plain estimator language. Match the "Confidently Boring" voice — no AI hype, no exclamation points, dark navy + orange #F26522 accent, Inter/geometric sans-serif. Every line should sound like an experienced estimator talking, not a dashboard.

---

## MODULE 1: INSTANT OUTCOME ANALYSIS

### What It Is

A confirmation panel that appears immediately after a user saves any outcome, showing 2–4 instant insights computed from data already in Supabase. It replaces the current silent "outcome saved" state. The user logs, hits save, and immediately gets something back.

### The Four Instant Insights

All four compute from existing data with zero threshold. Show whichever ones have data; suppress any that don't yet apply (e.g. score reconciliation only if the project has a stored `scores.final`).

**1. Score-vs-Outcome Reconciliation**
Compares the BidIndex score this project received against what actually happened.

- Won + high score → "You scored this 78 and won. Your read on this one was right."
- Won + low score → "You scored this 54 and won anyway — worth noting what you saw that the score didn't."
- Lost/Ghost + high score → "You scored this 82 and it didn't convert. Second time a high score from this GC hasn't panned out." (only add the "second time" clause if true — see insight 2 data)
- Declined + any → skip reconciliation (no bid submitted to reconcile)

**2. Running Client Tally (shown at entry)**
Pulls the `bids`/`wins` counts for the client on this project, plus a ghost count derived from prior projects with this client where `outcome = 'ghost'`.

- "That's [Client]: [N] bids, [W] wins, [G] ghosts logged."
- This is real and useful at outcome #2. It visibly accumulates — this is the dopamine.

**3. Margin / Building-Type Running Line**
Computes the user's average won margin by `building_type` from `outcome_data.margin` across their won projects.

- "Your logged healthcare projects are averaging 12% won margin vs. 7% on retail."
- Only show if the user has at least 2 won outcomes with margin data across at least 2 building types. Otherwise suppress (the progress meter will reference it).

**4. Ghost-Rate Flag (when applicable)**
If this outcome is a ghost and pushes a client's ghost rate over a threshold, surface it gently.

- "That's 3 ghosts from [Client] across 5 bids. Worth weighing before you spend estimating time there again."

### Implementation Steps

**Step 1: No new schema required for core insights.**
All four insights compute from existing `projects` rows (`scores`, `outcome`, `outcome_data`, `building_type`) and `clients` (`bids`, `wins`). Confirm this by reading the current outcome-save handler before writing anything.

**Step 2: Build a single computation function**
After the outcome save succeeds, call one function that returns an array of insight objects. Compute client history by querying the user's `projects` filtered to the same client (by the GC name stored in `gcs` jsonb or the linked client), NOT by re-counting from scratch on the client row alone — you need the ghost count which lives in projects.

```javascript
async function computeInstantInsights(project, client, userProjects) {
  const insights = [];

  // 1. Score-vs-outcome reconciliation
  const finalScore = project.scores?.final;
  if (finalScore != null && project.outcome !== 'declined') {
    insights.push(buildReconciliationInsight(finalScore, project.outcome, client, userProjects));
  }

  // 2. Running client tally
  if (client) {
    const ghosts = userProjects.filter(p =>
      sameClient(p, client) && p.outcome === 'ghost').length;
    insights.push({
      type: 'client_tally',
      text: `That's ${client.name}: ${client.bids} bids, ${client.wins} wins, ${ghosts} ghosts logged.`
    });
  }

  // 3. Margin by building type (only if enough data)
  const marginInsight = buildMarginInsight(userProjects);
  if (marginInsight) insights.push(marginInsight);

  // 4. Ghost-rate flag
  if (project.outcome === 'ghost' && client) {
    const ghostFlag = buildGhostRateFlag(client, userProjects);
    if (ghostFlag) insights.push(ghostFlag);
  }

  return insights;
}
```

Keep all four helper functions pure and individually testable. Be conservative: if data is thin, return nothing for that insight rather than a misleading line.

**Step 3: UI — replace the silent save confirmation**
After save, render the insights inside the outcome modal (or a slide-in panel) before it closes. Match the existing card style.

```html
<div class="instant-insights" id="instantInsights">
  <div class="ii-header">Logged. Here's what that tells us:</div>
  <ul class="ii-list" id="iiList">
    <!-- One <li class="ii-item"> per insight, populated dynamically -->
  </ul>
  <!-- Module 2 progress meter renders directly below this -->
</div>
```

Plain text, one insight per line, no icons heavier than a small dot. The header sets the frame: logging produced understanding.

---

## MODULE 2: VISIBLE THRESHOLD PROGRESS

### What It Is

A compact progress section, shown directly beneath the instant insights, that makes the named activation thresholds visible and turns each into a goal the user is approaching. This is the single highest-leverage part of the build — it converts invisible plumbing into a reason to log the next outcome.

### The Thresholds to Surface

Reference the real, current activation ladder. Show only the next 1–2 unlocks the user is approaching, not the whole list (avoid overwhelm — the user is a process-oriented person who needs one clear next action, not a menu).

| Unlock | Threshold | Counter source |
|---|---|---|
| Competitive Pressure read (per client) | ≥3 outcomes with that client | count of this client's resolved outcomes |
| Project Twin Finder | ≥20 total resolved outcomes | count of all resolved outcomes |
| Override calibration | ≥50 total resolved outcomes | count of all resolved outcomes |

> Confirm these exact numbers against the live build / Product Bible v1.9 before shipping copy. The numbers above come from the current project instructions (3 / 20 / 50). If the code uses different constants, the code is the source of truth — wire the meter to the actual constants, do not hardcode a second copy.

### Implementation Steps

**Step 1: Derive counts from existing data**
No new schema. Resolved outcome = `outcome IN ('won','lost','ghost')` (decide whether 'declined' counts — recommend NOT counting declined toward intelligence thresholds, since no bid was submitted; confirm against how Competitive Pressure aggregation already treats it).

**Step 2: Progress rendering**
```javascript
function buildProgressItems(userProjects, currentClient) {
  const resolved = userProjects.filter(p =>
    ['won','lost','ghost'].includes(p.outcome));
  const totalResolved = resolved.length;

  const items = [];

  // Per-client Competitive Pressure (most immediate, show first if close)
  if (currentClient) {
    const clientResolved = resolved.filter(p => sameClient(p, currentClient)).length;
    if (clientResolved < 3) {
      items.push({
        label: `Competitive Pressure read for ${currentClient.name}`,
        remaining: 3 - clientResolved,
        unit: 'outcome'
      });
    }
  }

  // Total-outcome unlocks — show only the NEXT one not yet reached
  if (totalResolved < 20) {
    items.push({ label: 'Project Twin Finder', remaining: 20 - totalResolved, unit: 'outcome' });
  } else if (totalResolved < 50) {
    items.push({ label: 'Override calibration', remaining: 50 - totalResolved, unit: 'outcome' });
  }

  return items.slice(0, 2); // never show more than 2 — one clear next goal
}
```

**Step 3: UI**
```html
<div class="threshold-progress" id="thresholdProgress">
  <!-- Example rendered item: -->
  <div class="tp-item">
    <span class="tp-label">2 more outcomes with Turner unlocks your Competitive Pressure read</span>
    <div class="tp-bar"><div class="tp-fill" style="width:33%"></div></div>
  </div>
</div>
```

Copy pattern: "[N] more [outcomes] [with Client] unlocks [feature]." Concrete, singular goal, framed as the user pulling it toward themselves. When a threshold is crossed *by this very save*, celebrate it plainly: "That outcome just unlocked your Competitive Pressure read for Turner — it's on your next bid for them."

---

## IMPLEMENTATION ORDER

Build in this sequence. Do not skip steps.

1. **Instant insight computation functions** (Module 1, Step 2) — pure functions, fully unit-testable before any UI. Get these right first; they are the substance.
2. **Outcome-save UI swap** (Module 1, Step 3) — replace the silent confirmation with the insights panel.
3. **Threshold progress** (Module 2) — wire counters to real constants, render beneath insights.
4. **Crossing celebration** — the "you just unlocked X" state, since it depends on both prior modules.

The whole build is read-heavy and computation-light — it surfaces data you already have. There are no new external dependencies and (likely) no new tables. If you find yourself adding a table, stop and reconsider: the point is that this is all derivable now.

---

## TESTING CHECKLIST

**Instant Outcome Analysis**
- [ ] Saving a Won outcome with a stored score shows the reconciliation line correctly
- [ ] High-score-but-lost shows the "didn't convert" framing, and only says "second time" when a prior high-score non-conversion with that client actually exists
- [ ] Declined outcomes skip score reconciliation (no submitted bid)
- [ ] Client tally shows correct bids / wins / ghosts at outcome #2
- [ ] Margin-by-building-type line is suppressed until ≥2 won margins across ≥2 building types
- [ ] Ghost-rate flag fires only when a real threshold is crossed, never on a first ghost
- [ ] Thin-data cases produce fewer insights, never a misleading or fabricated one
- [ ] No insight ever displays NaN, undefined, or "0 bids 0 wins"

**Threshold Progress**
- [ ] Counters derive from live constants, not a hardcoded duplicate of the threshold numbers
- [ ] Never shows more than 2 progress items
- [ ] Per-client Competitive Pressure item disappears once that client hits 3 resolved outcomes
- [ ] Shows the NEXT total-outcome unlock only (Twin Finder, then Override) — not both at once
- [ ] Crossing a threshold on the current save shows the celebration state correctly
- [ ] 'declined' handling matches how Competitive Pressure aggregation already counts (verify, don't assume)

**General**
- [ ] Outcome save still writes `outcome_data` jsonb exactly as before — this build only adds a read/display step after save
- [ ] Nothing writes to `user_revenue` or any system table
- [ ] Panel matches existing card styling; voice is plain, no exclamation points, no jargon
- [ ] Works on iPhone/Safari (modal/panel does not clip on small screens)
- [ ] `admin_events` logs an `outcome_recorded` event as it does today (do not regress existing tracking)

---

## STYLE CONSTRAINTS

- Match existing card/component styling in `app.html`
- Plain English only — an estimator should never see a word they wouldn't say on a job site
- Every insight is either a fact ("3 ghosts across 5 bids") or an actionable read ("worth weighing before you spend estimating time there") — never vague encouragement
- No fabricated numbers. If the data isn't there, say nothing rather than estimate
- The frame is always: *you logged this, so now you know something you didn't before*

---

*Reference: BidIntell Product Bible v1.9 | North Star: Outcome logging rate ≥80% | Schema v2.0 (projects.outcome_data, clients.bids/wins)*
