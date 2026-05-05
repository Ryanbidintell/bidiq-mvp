# BidIntell Hiring Plan — May 2026

**Stage:** 1 month post-commercial launch (April 2026)  
**Mission:** Pre-bid decision intelligence for specialty subcontractors  
**Hiring thesis:** Build the smallest team that can compound the outcome data moat fast enough to make the acquisition thesis real.

---

## Team Structure (Current)

| Role | Agent | Reports To | Status |
|------|-------|-----------|--------|
| CEO | CEO | Board | Active |
| CTO (Founding Engineer) | CTO | CEO | Active |
| QA Engineer | QA Engineer | CEO | Active |

---

## Hires Made

### Hire 1: CTO (Founding Engineer)

**Why now:** The product is live. Technical velocity is the only bottleneck between us and the outcome data moat. Every week without a dedicated engineer is a week the scoring algorithm stays unimproved and the outcome logging UX stays broken.

**Mandate:**
- Own all product engineering end-to-end
- Prioritize outcome logging rate above all else — it is the single most critical near-term metric (target: 80%+)
- Make the BidIndex score explainable (trust drives retention drives outcomes)
- Build the data infrastructure that compounds: every logged outcome trains GC behavioral intelligence
- Research plan room integrations as a distribution multiplier

**First 30 days priorities:**
1. Audit the outcome logging funnel (BID-4) — where are subs dropping off?
2. Ship explainable BidIndex scoring (BID-3) — build trust fast
3. Implement outcome logging reminders (BID-2) — email + in-app nudges

**Skills required:** Full-stack (web), data pipelines, ideally construction-adjacent industry experience or B2B SaaS with SMB customers.

---

### Hire 2: QA Engineer

**Why now:** We are 1 month post-launch. Bugs in the outcome logging or scoring flow are not just UX problems — they are data moat problems. A missed Won/Lost log is a lost training signal, permanently. QA needs to be a first-class function before we start shipping faster.

**Mandate:**
- Protect the three core flows: bid upload, BidIndex scoring, outcome logging
- Establish automated test coverage before feature velocity increases
- Create QA process that scales (playbook, severity matrix, definition of done)
- Gate every release through a defined approval process

**First 30 days priorities:**
1. Set up automated test suite for core flows (BID-7)
2. Write the QA playbook and bug triage standards (BID-8)

**Skills required:** Test automation (Playwright or Cypress), API testing, comfortable owning QA independently without a large team.

---

## What We Are NOT Hiring For (Yet)

| Role | Why We're Waiting |
|------|------------------|
| Product Manager | CEO owns product decisions until we have 50+ active subs giving consistent signal |
| Sales | Founder-led sales until we have repeatable ICP fit proven ($2M-$20M specialty subs) |
| Marketing / DevRel | CMO added when we have case studies to amplify, not before |
| Second Engineer | After CTO has shipped 2-3 features and we understand where the bottleneck is |
| Data Scientist | After outcome logging rate hits 80% and we have a meaningful dataset to model |

**Rule:** We add headcount when the constraint is provably capacity, not clarity. Hiring before clarity is how startups waste 18 months.

---

## Roadmap Delegation Summary (May 2026)

### Assigned to CTO

| Issue | Priority | Why |
|-------|----------|-----|
| BID-4: Audit outcome logging funnel | Critical | Data moat depends on this |
| BID-2: Implement outcome logging reminders | High | Fastest path to 80% logging rate |
| BID-3: Make BidIndex score explainable | High | Trust = retention = more outcomes |
| BID-5: Build sub analytics dashboard | Medium | Retention and daily active use |
| BID-6: Research plan room integrations | Medium | Distribution multiplier research |

### Assigned to QA Engineer

| Issue | Priority | Why |
|-------|----------|-----|
| BID-7: Set up automated test suite | High | Protect core flows before velocity increases |
| BID-8: Create QA playbook and triage standards | Medium | Process before people |

---

## Decision Rules for Future Hiring

1. **Add a hire when:** Current team is provably the bottleneck and we know what the new hire would own for their first 90 days.
2. **Don't add a hire when:** We're hoping someone will figure out what the problem is once they get here.
3. **Sequence matters:** Product velocity before distribution. Get the outcome logging rate to 80% before hiring for growth.
4. **No leadership vacuums:** If the CTO is spread across more than 3 active workstreams, escalate to CEO. Either scope, sequence, or hire.

---

## Key Metric Targets (30-60-90 Days)

| Metric | Current | 30-day Target | 90-day Target |
|--------|---------|--------------|--------------|
| Outcome logging rate | TBD | 50%+ | 80%+ |
| Active subs | TBD | Baseline set | +20% |
| Bids uploaded/week | TBD | Baseline set | Growing WoW |
| BidIndex explainability | None | Shipped | Iterated |

*CTO to establish baselines in first 2 weeks via BID-4 audit.*

---

**Owner:** CEO  
**Last updated:** 2026-05-01  
**Next review:** 2026-06-01 (revisit if outcome logging rate hits 80% earlier or if CTO is blocked)
