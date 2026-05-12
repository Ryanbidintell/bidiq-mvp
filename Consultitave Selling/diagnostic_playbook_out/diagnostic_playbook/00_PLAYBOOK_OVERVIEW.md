# BIDINTELL DIAGNOSTIC PROGRAM — MASTER PLAYBOOK

**Version 1.0 — May 2026**
**Owner:** Ryan Elder
**Purpose:** Convert warm-network and ICP-fit prospects into paying BidIntell users by leading with consulting value, not product pitch.

---

## THE ONE-PAGE SUMMARY

You are not selling software. You are running free 30-minute structured research conversations with specialty sub owners, and you are sending them a written read on their bid selection patterns afterward.

The diagnostic motion produces three things, in this order:

1. A relationship of trust with an owner/president who treats you as a peer
2. A written artifact (1-page or 5-7 page memo) that lives in their inbox and gets shared
3. A natural opening — 5-7 days later — to bring BidIntell into the conversation as the *consequence* of what you found, not the point of the meeting

**Critical rule:** You do not pitch in the diagnostic call. Ever. The memo earns the right to the second conversation. Break this rule once and the framework collapses.

---

## THE FULL MOTION — 9 STAGES, AGENT-AUGMENTED

```
STAGE                            HUMAN     AGENT     TIME
─────────────────────────────────────────────────────────
1. Outreach                      ✓         —         5 min/send
2. Booking via Calendly          —         ✓         auto
3. Pre-call prep                 review    creates   5 min review
   ├─ Web + LinkedIn research              ✓
   ├─ Tailored 5-question script           ✓
   ├─ Drive folder + intake doc            ✓
   ├─ Tracker sheet row                    ✓
   └─ Founder summary email                ✓
4. Diagnostic call               ✓         records   30-35 min
5. Memo generation               ✓         assists   15-25 min
   └─ Granola transcript → diagnostic project in Claude
6. Memo delivery                 ✓         —         5 min
7. Tracking sheet update         ✓         —         10 min
8. Follow-up email (5-7d later)  ✓         —         5 min
9. Conversion path               ✓         —         varies
```

**Agent eliminates ~40 min/prospect of manual prep.** Without it: 75 min/prospect. With it: ~35 min/prospect of actual high-leverage human work (the call + memo + follow-up).

**Throughput cap: 5 diagnostics per week.** Above that, memo quality drops.

---

## FILES IN THIS PLAYBOOK

| File | What it is | When you use it |
|---|---|---|
| `00_PLAYBOOK_OVERVIEW.md` | This file | Read first |
| `01_OUTREACH_SCRIPTS.md` | Email + LinkedIn DM templates (5 scripts) | Stage 1 |
| `02_LINKEDIN_PUBLIC_POSTS.md` | Public LinkedIn posts to drive inbound (5 posts) | Stage 1 (parallel) |
| `03_CALENDLY_INTAKE_SETUP.md` | Calendly event config + intake form | Stage 2 (one-time) |
| `04_DIAGNOSTIC_CALL_SCRIPT.md` | The 5-question call script + facilitator notes | Stage 4 |
| `05_CLAUDE_ANALYSIS_PROMPT.md` | Reusable prompt for memo generation | Stage 5 |
| `06_MEMO_DELIVERY_AND_FOLLOWUP_EMAILS.md` | Memo delivery + follow-up templates | Stages 6, 8 |
| `07_TRACKING_SHEET_GUIDE.md` | How to use the tracker spreadsheet | Stage 7 |
| `09_LANDING_PAGE_COPY.md` | Copy + deploy guide for /diagnostic page | Inbound channel |
| `10_PROJECT_SETUP.md` | How to set up the diagnostic Claude project | One-time |
| `11_COWORK_SETUP.md` | Optional Cowork plumbing | Phase 2 |
| `12_OBJECTION_HANDLING_AND_PATTERNS_TEMPLATE.md` | Objection responses + patterns doc template | Ongoing |
| `BidIntell_Diagnostic_Tracker.xlsx` | The tracking spreadsheet (6 tabs, dropdowns built in) | Daily |
| `diagnostic_landing_page.html` | Production-ready landing page (matches bidintell.ai) | Deploy |
| `agent/` folder | The Netlify function automation | Deploy |

---

## THE AGENT — WHAT IT DOES

When a prospect books via Calendly, the agent automatically:

1. Verifies the Calendly webhook signature
2. Runs Claude with `web_search` to research the prospect's company (LinkedIn, projects, GC relationships, industry context)
3. Tailors the standard 5-question script to that prospect's specific intake answer and the research findings
4. Creates a Google Drive folder under `/BidIntell/Diagnostics/Prospects/`
5. Writes 3 docs into the folder: company brief, tailored script, intake answers
6. Appends a row to the tracker spreadsheet (Prospects tab) with prospect details + ICP fit read
7. Emails Ryan a brief summary with link to the Drive folder

You wake up to an email like:

> **Subject: New diagnostic booked — Summit Insulation**
>
> Strong ICP fit. Brennan's been at Summit 12 years, took over from his dad. Recent project signals show they're heavy on healthcare + multifamily — surfaces likely GC names. Push hard on Q3 (regrets) — his intake answer says "want to know which GCs are wasting our time."
>
> Folder: drive.google.com/...

**Cost:** ~$0.10 per booking. **Setup time:** ~45 minutes one-time. **Payoff:** No more frantic 10-min Google searches at 8:55am before a 9am call.

See the `agent/` folder for full architecture, code, and deploy guide.

---

## THE WEEK-ONE CRITICAL PATH

### Day 1 (Monday) — Foundation
- [ ] Set up the new "BidIntell Diagnostic Program" project in Claude (file 10)
- [ ] Upload `BidIntell_Diagnostic_Tracker.xlsx` to Google Drive as a Google Sheet
- [ ] Create the Drive folder structure: `/BidIntell/Diagnostics/Prospects/`, `/Memos_All/`, `/Templates/`
- [ ] Set up Calendly event with 4 intake questions (file 03)

### Day 2 (Tuesday) — Manual outreach starts
- [ ] Send the warm-network email (Script 1) to your 3 strongest ghosters
- [ ] Post the public LinkedIn post #1 (file 02)
- [ ] Send 5 cold-warm LinkedIn DMs (Script 3 or 4)

### Days 3-5 (Wed-Fri) — Run early diagnostics manually
- [ ] Run any calls that get booked
- [ ] Generate first memo using Claude prompt (file 05)
- [ ] Send memos
- [ ] Update tracking sheet within 1 hour of each call

### Following Monday — Decisions
- [ ] Send follow-up emails to first prospects who got memos
- [ ] Decide if landing page is ready to publish (3 manual diagnostics done?)
- [ ] Decide if agent is worth deploying now or after week 2

### Week 2 — Scale
- [ ] Deploy the landing page (`diagnostic_landing_page.html`)
- [ ] Deploy the agent (`agent/` folder + env vars + Calendly webhook)
- [ ] LinkedIn post #2 (the observation post)
- [ ] Continue outreach cadence

---

## SUCCESS METRICS — 60 DAYS

| Metric | Target |
|---|---|
| Outreach sent | 50 |
| Calls booked | 15 |
| Calls completed | 12 |
| Memos delivered | 12 |
| Follow-ups sent | 12 |
| Trial starts from diagnostic path | 6 |
| Paid conversions | 3 |

If you hit those numbers, the motion works and becomes your primary GTM through Q3.

---

## THE PHILOSOPHICAL ANCHOR

This motion exists because:

1. **Your warm network ghosted on the trial signup.** That's data, not failure — it told you self-serve doesn't fit the buyer behavior of busy sub owners.
2. **ConTech buyers respond to relationships, not outbound.** You have 20+ years of relationships in this industry. Use them.
3. **You are not just selling software** — you are building a structured ICP research dataset that compounds in value over time. The diagnostic is the dataset acquisition mechanism.
4. **The data moat is the real asset.** Outcome logging in BidIntell is one layer; structured pre-bid decision research across 30+ subs is another. Both compound.
5. **Your unfair advantage is you** — 20 years on the sub side, the credibility to walk into any owner's office and have a peer conversation. Software founders without your background can't run this motion. Use the advantage while you have it.

The agent makes it scalable. The voice keeps it credible. The dataset makes it valuable.

---

**End of overview. Start with file 01 — outreach scripts.**
