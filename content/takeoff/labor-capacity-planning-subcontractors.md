---
title: Can You Actually Staff the Jobs You Win? Labor Capacity Planning for Subcontractors
seoTitle: Labor Capacity Planning for Subs
excerpt: Bid scoring tells you which jobs to chase. It doesn't tell you whether you can staff and afford them if they land. Here's how subcontractors plan labor capacity against a live bid pipeline — and why we built a Capacity module to close that gap.
seoDescription: How commercial subcontractors forecast labor demand against awarded backlog and a weighted bid pipeline — role-by-week gaps, staffing calls, and whether the margin covers the bench.
category: Capacity Planning
readTime: 8 min read
publishedAt: 2026-07-22
slug: labor-capacity-planning-subcontractors
---

# Can You Actually Staff the Jobs You Win? Labor Capacity Planning for Subcontractors

## Table of Contents
- [The Bid You Win Is a Staffing Promise](#the-bid-you-win-is-a-staffing-promise)
- [Two Questions Before You Commit](#two-questions-before-you-commit)
- [Why Pipeline Has to Be Weighted, Not Counted](#why-pipeline-has-to-be-weighted-not-counted)
- [From Demand to a Staffing Decision](#from-demand-to-a-staffing-decision)
- [The Money Question: Can You Afford the Bench?](#the-money-question-can-you-afford-the-bench)
- [Why We Built a Capacity Module](#why-we-built-a-capacity-module)
- [Where to Start](#where-to-start)
- [FAQs](#faqs)

---

There's a failure mode that doesn't show up in any bid log. You chase the right work, you win a good chunk of it, and then two awards land in the same three weeks and you're scrambling to find pipefitters who don't exist. Or the opposite: you staff up for a pipeline you were sure would convert, half of it slips, and now you're carrying a bench you can't bill.

Neither of those is a bidding problem. They're capacity problems — and for most commercial subs, labor is the real binding constraint. Industry workforce surveys have for years found that the large majority of contractors struggle to fill skilled craft positions. When people are the scarce resource, "which jobs should we chase?" is only half the question. The other half is: **if this work lands, can we actually staff it — and can we afford the crew in the meantime?**

This article is about that second half: how to forecast labor demand against a live bid pipeline, turn it into a staffing decision, and check the money before you commit.

---

## The Bid You Win Is a Staffing Promise

Every bid you submit is an implicit promise to put a crew on the job at a specific time. Most subs track the bidding side carefully — invites, scores, win rates — and track the staffing side in someone's head.

That works until it doesn't. The head-math breaks down exactly when it matters most: when several jobs overlap, when a big pursuit is 50/50, or when you're deciding whether to make a hire that takes weeks to onboard. Those are the moments where a gut call quietly costs you either a blown schedule or a month of unbilled payroll.

Capacity planning makes that promise explicit. It puts every awarded job and every live pursuit onto the same calendar, in the same unit — people, by role, by week — so you can see the collisions before they happen.

---

## Two Questions Before You Commit

A useful capacity picture answers two plain questions:

1. **If this work lands, can we staff it?** Do we have the electricians, the fitters, the PMs — in the weeks the work actually falls, not just in total?
2. **Can we afford the labor base while we wait to find out?** Payroll is mostly fixed and shows up every Friday. The margin that pays for it shows up only as work gets performed. Those two curves don't line up on their own.

Most staffing mistakes come from answering only the first question, or answering the second one with a single annual number instead of week by week.

---

## Why Pipeline Has to Be Weighted, Not Counted

The tempting shortcut is to add up everything in the pipeline and staff for it. That over-hires. The opposite shortcut — only staffing awarded work — leaves you flat-footed the week a big pursuit converts.

The honest middle is to weight the pipeline by how likely it is to become real:

- **Awarded work counts at 100%.** It's happening; staff for all of it.
- **A pursuit counts partially** — discounted by its **win probability × document confidence**. An invite-only tease you've barely reviewed with a 30% shot moves your plan far less than a full, priced package you'll probably win.

Add that up per role, per week, and you get a demand curve that reflects reality instead of optimism or fear. A pursuit that's 40% likely doesn't demand a full crew — it demands 40% of one, in the weeks it would run.

---

## From Demand to a Staffing Decision

Once demand is on the calendar, the rest is subtraction:

**Demand − supply = gap**, computed role by role, week by week. Your supply is your current bench, plus any approved-but-not-yet-started hires modeled from the date they can actually work. A positive gap is a shortage; a negative gap is a bench you're paying for and not using.

The gap is where the decision lives. A two-week shortage of one role is an overtime or short-term outside-labor call. A twelve-week shortage that starts three months out is a hiring call you need to make *now*, because craft hiring has lead time. A persistent surplus is a signal to chase more of the work that role does — or to stop carrying it.

The point isn't to automate the decision. It's to make the shortage or surplus visible early enough that you have options, instead of discovering it the Monday a job starts.

---

## The Money Question: Can You Afford the Bench?

Staffing feasibility and financial feasibility are different questions, and subs get burned by treating them as one. You can have the people and still lose money carrying them; you can be short-handed on a stretch that's actually very profitable.

The affordability view lines up two things month by month: the **gross margin** your awarded and weighted-pipeline work throws off (recognized as the work is performed, not when it's booked), against your **labor carry** — the payroll you owe regardless of workload. Seeing the fixed "nut" you owe every month next to the margin coming in tells you how much runway a slow stretch actually gives you, and whether a planned hire is affordable or just aspirational.

That's the difference between "we could use another PM" and "we can carry another PM through Q3 given what's actually landing."

---

## Why We Built a Capacity Module

We built BidIntell to answer *which bids are worth your time* — the [BidIndex Score](https://bidintell.ai/) that qualifies an invite before your estimators open the plans. But as subs used it, the same follow-up kept coming up: **okay, we know what to chase — now can we deliver it?** Scoring the front door doesn't help if the work you win collides in the shop.

So the [Capacity module](https://bidintell.ai/capacity.html) is the bridge from the bid decision to execution. It takes the pipeline you're already scoring, weights it the way described above, lays each job's crew curve onto a calendar from its trade and project-type template, and shows you the role-by-week gaps and the margin coverage. Field labor is kept separate from indirect roles like PMs and detailers, because they scale differently. A scenario planner lets you test a hire or a big win against the live plan without touching it.

A few things it deliberately is and isn't. It's **deterministic and transparent** — every recommendation traces back to inputs you control, not a black box. It runs on what you tell it: your roster, your backlog, your pursuits, and a handful of company assumptions (planning horizon, hiring lead time, burden and margin rates, monthly overhead). You can load your roster, backlog, and pipeline by CSV to get going. It's a planning tool, not a timekeeping or payroll system — it sits upstream of those, in the same place bid decisions get made.

---

## Where to Start

You don't need software to start thinking this way. Before your next award or big pursuit, sketch it out:

1. List your awarded jobs and roughly when each role is needed over the next quarter.
2. Add your live pursuits — but discount each by how likely it is to land.
3. Line that demand up against the crew you have (and any hire already in motion).
4. Circle the weeks where a role goes short or sits idle.
5. Check whether the margin coming in those months covers the payroll going out.

If that exercise is painful to do by hand — which it usually is once you're juggling more than a few jobs and pursuits — that's exactly the gap the Capacity module fills. Setup runs about ten minutes.

Bid scoring keeps you from chasing the wrong work. Capacity planning keeps a good win from turning into a staffing fire drill. You need both.

---

## FAQs

**What is labor capacity planning for a subcontractor?**
It's forecasting how much field and management labor your work will require — by role and by week — and comparing that to the crew you actually have. Done well, it flags shortages early enough to hire, add overtime, or bring in outside labor, and flags idle bench you're paying for but not billing.

**How should a bid pipeline factor into capacity planning?**
Awarded work should be staffed at 100%. Pursuits should be discounted by how likely they are to convert — a practical weighting is win probability times how confident you are in the scope you've reviewed. That keeps you from over-hiring for a pipeline that hasn't landed or ignoring a strong pursuit until it's too late to staff.

**What's the difference between staffing feasibility and financial feasibility?**
Staffing feasibility asks whether you have the right people in the right weeks. Financial feasibility asks whether the margin your work generates covers the mostly-fixed cost of carrying that crew. You can pass one and fail the other, which is why both are worth checking before you commit to a hire or a bid.

**Does capacity planning replace scheduling or payroll software?**
No. Capacity planning sits upstream of project scheduling and payroll. It works at the role-and-week level to answer staffing and affordability questions across your whole portfolio, before the detailed schedule exists. It informs the hire/overtime/outside-labor decision; your other systems execute it.

**How is BidIntell's Capacity module different from a spreadsheet?**
The math is the same math you'd do in a spreadsheet — it's just done consistently across every job and pursuit at once, updates when your pipeline changes, and keeps field labor separate from indirect roles. It's deterministic and transparent, so every staffing recommendation traces back to inputs you set. The scenario planner also lets you test a hire or a big win without disturbing your live plan.

---

Winning the right work is the first discipline. Being able to staff and afford it is the second. Score your bids, then look one step ahead — at whether the wins you're chasing fit the crew you can actually field.
