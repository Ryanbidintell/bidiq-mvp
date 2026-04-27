# BidIntell — Apollo Cold Outreach Sequences

**Sequence name:** `BidIntell — Specialty Subs`
**Goal:** Get a forward of one bid invite or a click to the ROI calculator. Not a demo call. Not a signup.
**Target:** Specialty subcontractors (flooring, sealants, HVAC, plumbing, electrical, drywall, painting) bidding commercial work.
**Geography (start here):** Missouri + Kansas + Colorado — reference customer states.
**Company size:** 5–100 employees.
**Titles:** Owner, President, VP of Operations, Estimator, Chief Estimator.

---

## Upload Instructions

### Step 1 — Create the Sequence

1. Log into Apollo → **Engage** (top nav) → **Sequences** → **+ New Sequence**
2. Name it: `BidIntell — Specialty Subs`
3. Schedule: **Business days only**, 8am–5pm recipient's time zone

### Step 2 — Add the 3 Steps

For each email click **+ Add Step** → **Automatic Email**. Use the delays below.

| Step | Delay from previous | Subject |
|------|---------------------|---------|
| 1 | Send immediately | `quick question — {{companyName}}` |
| 2 | Wait 4 days | `Re: quick question — {{companyName}}` |
| 3 | Wait 7 days | `closing the loop` |

Paste each body below into the rich text editor. Apollo handles `{{firstName}}` and `{{companyName}}` merge tags automatically.

### Step 3 — Connect Your Sending Account

**Settings → Email & Calling → Connect Email Account** → connect `ryan@bidintell.ai` (Google Workspace).

Set daily sending limit: **40 emails/day max** (Apollo cap before deliverability degrades).

### Step 4 — Build Your Contact List

**Search → People** → filter by:
- **Job Title:** Owner, President, VP of Operations, Estimator, Chief Estimator
- **Industry:** Specialty Trade Contractors, Construction
- **Geography:** Missouri, Kansas, Colorado (expand after first 100 replies)
- **Employee count:** 5–100

Run email verification before adding. Keep bounce rate under 2%.

### Step 5 — Add Contacts to the Sequence

Select contacts → **Add to Sequence** → `BidIntell — Specialty Subs` → **Start at Step 1**.

### Step 6 — Preview Before Launching

Click **Preview** on each step. Confirm `{{firstName}}` and `{{companyName}}` resolve. Fill in manually for any contacts missing company name — a blank subject line kills open rate.

### Step 7 — Launch

Toggle sequence to **Active**. Check **Analytics** tab after 48 hours.

**Benchmarks to watch:**
- Open rate: 35%+ is healthy
- Reply rate: 3–5% is a win at cold volume
- Calculator clicks: track via GA4 (event: `cta_click`)

---

## The Emails

---

### Email 1 — Day 1 (Cold intro)

**Subject:** `quick question — {{companyName}}`

```
{{firstName}},

How do you decide which bid invites are worth estimating vs. which ones to pass on?

Most specialty subs go off gut feel — GC relationship, how busy the shop is. Which works, until it doesn't.

Curious what smarter bid selection might be worth for your volume:
→ bidintell.ai/roi-calculator

Takes 30 seconds. Plug in your bids per year and win rate — it'll show you the number in actual dollars.

Ryan Elder
BidIntell
bidintell.ai
```

---

### Email 2 — Day 5 (Follow-up with real example)

**Subject:** `Re: quick question — {{companyName}}`

```
{{firstName}},

Sent this a few days ago — sharing a real example in case it helps explain what I mean.

[INSERT: paste a real scored report screenshot or describe a real project — e.g. "Commercial flooring job in Kansas City. BidIndex score: 31/100. Recommendation: PASS. Three reasons: 0% win rate with that GC over 4 bids, spec called for materials outside their core trade, pay-when-paid clause with no carve-out. The sub passed. Saved a full day of estimating time on a job they were unlikely to win."]

That's the whole product. Score the invite before you commit estimating hours to it.

If you want to try it on one of yours, forward it to me and I'll get you set up — takes about 10 seconds on your end.

Ryan
bidintell.ai
```

> **Note:** Replace the bracketed section with a real project from your dashboard that scored under 40. Pull the actual GC name, score, and reason. Real numbers close; hypotheticals don't.

---

### Email 3 — Day 12 (Breakup)

**Subject:** `closing the loop`

```
{{firstName}},

Won't keep filling your inbox. Last note.

If bid selection ever feels like a time sink — estimating jobs you don't win, chasing GCs who ghost you — that's the problem BidIntell solves.

Forward one invite and see what the score says. Free to try, no commitment.

If the timing's off, no worries.

Ryan
bidintell.ai
```

---

## Notes

- **Email 2 real example:** Use any project from the BidIntell dashboard that scored under 40. The more specific the better — actual GC name, actual score, actual reason. Redact the project name/address if needed.
- **ROI calculator URL:** `bidintell.ai/roi-calculator` — anyone who emails themselves their breakdown is a warm lead. They did the math and liked the number.
- **Founding member pricing:** mention it if you get a reply asking about cost — pricing locks in for the life of the subscription.
- **Trial:** 7 days, no credit card at signup.
