---
title: The BidIndex Methodology — How BidIntell Scores a Bid Invitation
seoTitle: "BidIndex Methodology: How Bid Scoring Works"
excerpt: The full method behind the 0–100 BidIndex score — the five components, how they are weighted, what shifts the recommendation, and what the score deliberately does not claim to do.
seoDescription: A complete, public explanation of the BidIndex methodology: the five scoring components, user-set weights, the GO/REVIEW/PASS thresholds, and the limits of what a fit score can tell you.
category: Bid Strategy
readTime: 11 min read
publishedAt: 2026-07-29
slug: bidindex-methodology
---

Most scoring tools ask you to trust a number without telling you how it was produced. That is a reasonable thing to be suspicious of, especially when the number is telling you to walk away from revenue.

So this page documents the method in full. Not a summary — the actual components, how they combine, what moves the recommendation, and the specific things the score does not attempt to measure. If you want to argue with the BidIndex, this is the page that gives you enough detail to do it properly.

---

## First: the BidIndex is a fit score, not a win probability

This is the single most important thing to understand, and the most common thing people get wrong.

A BidIndex of 90 does **not** mean you have a 90% chance of winning. It means the invitation is a strong match for the way your business is set up — your trade, your service area, the client, the contract terms you are willing to accept.

A fit score and a win probability are different claims, and only one of them is honest with the data available before a bid goes out. To predict whether you will win, a system would need to know what your competitors are going to price, how badly they need the work this quarter, and whether the general contractor has already decided who is getting the job. None of that is in the bid documents. Anyone claiming otherwise is guessing and putting a decimal point on it.

What the documents *do* support is a fit judgment: given everything known about how you operate, does this job look like the kind of work you win and make money on?

Treat the BidIndex as triage, not prophecy. It tells you where to spend estimating hours. It does not tell you the outcome.

---

## The five components

Every bid is scored on five components. Four are active from your first bid. The fifth switches on once there is enough of your own history to support it.

### 1. Location Fit

Distance from your office to the job site, measured against the service radius you set.

This sounds trivial and is not. Travel is the cost most often left out of a bid and most reliably underestimated. A job ninety minutes outside your normal radius carries crew windshield time, per-diem exposure, slower response to punch items, and a supervision problem that does not exist on a job fifteen minutes away.

Location Fit is scored on your radius, not a national average, because a mechanical contractor covering three states and a drywall sub covering one metro have genuinely different answers to the same question.

### 2. Keywords & Contract Terms

Two things in one component: does the scope language match the work you actually do, and are there terms in the documents that shift risk onto you?

On the scope side, this reads the bid text for the material and product language of your trade. On the contract side, it looks for the clauses that reliably cause trouble — pay-if-paid and pay-when-paid, retainage terms, liquidated damages, indemnification language, lien-waiver and notice-of-claim provisions, vague or open-ended scope, and bid-shopping signals like invitation-only restrictions or explicit multiple-bidder language.

On a drawings-only package with no spec book, the scope keywords carry more of the weight, because there is no specification text to match against.

### 3. Client Relationship

Your history with this client: your own star rating, your win and loss record with them, how many bidders they typically invite, and behavioral signals you have logged over time — RFI responsiveness and payment reliability among them.

This is where a scoring system either earns its keep or becomes a horoscope. The component is built entirely from *your* record with that client. It is not a shared reputation score, not a network average, and not visible to anyone else. Two subcontractors can score the same general contractor very differently, and both can be right, because they have had different experiences.

### 4. Trade Match — or Product Match

For subcontractors this is Trade Match. For distributors and manufacturers' representatives it is Product Match, because the question is about catalog fit rather than crew scope.

Matching happens at the CSI MasterFormat **section** level — six-digit codes — not the division level. This distinction matters more than it sounds. Division 09 covers both resilient flooring and ceramic tile. A flooring contractor scored at the division level gets a strong match on a tile package they have no business bidding. Section-level matching is what separates a fire-curtain specialist from a generic Division 10 sub.

### 5. Competitive Pressure

How contested this client's bids tend to be, derived from the bidder counts and outcomes you have logged.

This component stays dormant until you have logged **three or more outcomes for a given client**, then activates automatically for that client. The reason for the gate is straightforward: with one or two data points, a competitive-pressure number is noise wearing a lab coat. Three is not a large sample either, but it is the point at which a pattern starts to carry more signal than the error bar.

Like Client Relationship, this is computed from your own logged outcomes only.

---

## How the components combine

Each component produces a 0–100 sub-score. Those are combined using weights that **you set**, which is the part most descriptions of the system leave out.

The starting weights for a subcontractor are:

| Component | Default weight |
|---|---|
| Location Fit | 25 |
| Keywords & Contract Terms | 30 |
| Client Relationship | 25 |
| Trade Match | 20 |

Distributors and manufacturers' reps start from a different distribution — location matters less, product match matters more — because the economics are different.

Competitive Pressure enters with a weight of 10 once it activates, and the other weights are rebalanced so the total still resolves to 100.

These are defaults, not fixed constants. If you are a relationship-driven shop where the client is nearly everything, raise Client Relationship and lower the rest. If you will drive anywhere for the right scope, drop Location Fit. The weights are a statement about how *your* business works, and the score is only as good as that statement. Two contractors with identical weights and identical settings will get identical scores; the personalization lives in the settings, not in a black box.

---

## The recommendation bands

The combined score maps to one of three recommendations:

| Score | Recommendation | What it means |
|---|---|---|
| 80–100 | **GO** | Strong fit across most components. Worth pricing seriously. |
| 60–79 | **REVIEW** | Mixed signals. Something scores well and something does not. Open it and decide whether the tradeoff is acceptable. |
| Below 60 | **PASS** | Poor fit against your own criteria. |

REVIEW is not a hedge or a way of avoiding a decision. It is the honest output when components disagree — a perfect scope match from a client who pays slowly, or an ideal client on a job four hours away. Those bids need a human judgment that no weighted average should be making on its own. Collapsing them into a GO or a PASS would be a worse answer delivered more confidently.

---

## What modifies the recommendation without being a weighted component

Two inputs deliberately sit outside the weighted average.

**Current workload.** Your capacity setting adjusts the recommendation rather than feeding the weighted score. The logic: how busy you are right now does not change whether a job is a good fit for your business — it changes whether you should chase it this month. Baking workload into the fit score would corrupt the historical record, because a bid that scored 84 in a slow February and 84 in a frantic August would no longer mean the same thing. Keeping it as a modifier preserves comparability.

**Prevailing wage.** When prevailing-wage or union requirements are detected, the effect depends on a preference you set. Some shops actively want that work and are set up for the reporting; some avoid it. So this is a bounded adjustment in the direction of your stated preference, applied only when the requirement is actually detected in the documents, and reduced when detection is uncertain. It is not a universal penalty, because it is not a universal problem.

---

## What the score does not do

A methodology page that only lists strengths is marketing. These are real limits.

**It does not know your competitors' pricing.** No pre-bid system does. This is the largest single source of variance between a good fit score and an actual win.

**It does not read every drawing.** Extraction targets the sheets where a given trade's scope lives — finish schedules, reflected ceiling plans, roof plans and wall sections, depending on the division — rather than parsing every page of a 400-sheet set with equal attention. This is a deliberate accuracy-versus-cost tradeoff, and it means an unusual detail buried on an unexpected sheet can be missed.

**It is only as good as your settings.** A contractor who selects fifteen CSI sections they do not really pursue will get scores that reflect that. The system cannot detect that your stated scope is broader than your real one.

**Early scores are less personalized than later ones.** Client Relationship needs history and Competitive Pressure needs three outcomes per client. The first few weeks lean more heavily on location, scope, and contract terms. This improves with logged outcomes, which is the actual reason outcome tracking exists — not for reporting, but because it is the input that makes future scores yours.

**Contract clause detection finds language, not intent.** A pay-if-paid clause is flagged because it is present. Whether it is negotiable, standard for that client, or something you have signed happily for ten years is context the documents do not contain.

---

## Why the method is published at all

Two reasons.

A go/no-go recommendation is only useful if you can audit it. When a bid comes back at 58 and your instinct says otherwise, you should be able to open the score, see which component dragged it down, and decide whether the system knows something you missed or has a setting wrong. That requires knowing how the number is built. A score you cannot interrogate is a score you will eventually ignore.

The second reason is that a scoring method that cannot survive being read by the people it scores is not a method worth trusting. If publishing the weights and the limits made the BidIndex easy to game, the honest conclusion would be that the BidIndex was weak — not that the documentation should be thinner.

---

## Frequently asked questions

**Is the BidIndex a win probability?**
No. It is a 0–100 fit score measuring how well an invitation matches your trade, service area, client history, and contract terms. It does not account for competitor pricing, owner relationships, or timing. Use it to triage which bids deserve estimating hours.

**Can I change how the score is calculated?**
Yes. The component weights are yours to set. The defaults for a subcontractor are Location Fit 25, Keywords & Contract Terms 30, Client Relationship 25, and Trade Match 20, but they are a starting point, not a constraint.

**Why did the same bid score differently for me than for another contractor?**
Because the score is computed against your settings and your history. Different service radius, different CSI sections, different record with that client, and different weights all produce different results from identical documents. That is the intended behavior, not an inconsistency.

**When does Competitive Pressure start counting?**
Automatically, once you have logged three or more outcomes for a given client. Below that threshold there is not enough of your own data to say anything meaningful about how contested that client's bids are.

**Does my current workload change the score?**
It changes the recommendation, not the weighted score. Keeping workload out of the score means a bid that scored 84 last quarter is comparable to one that scores 84 today.

**Is my bid data or client rating shared with other users or with general contractors?**
No. Client ratings, win rates, and logged outcomes are private to your account and enforced at the database level. Client Relationship and Competitive Pressure are computed from your own records only — there is no shared or network-wide reputation score.

**What happens on a drawings-only bid with no specification book?**
Scope keyword matching carries more of the Keywords & Contract Terms component, since there is no specification text to match against. Contract clause detection has less to work with, so fewer risk flags on such a package means less available information rather than a cleaner contract.
