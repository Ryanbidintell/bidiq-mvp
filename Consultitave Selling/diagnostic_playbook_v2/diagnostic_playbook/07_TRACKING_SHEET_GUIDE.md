# 07 — TRACKING SHEET GUIDE

**Purpose:** Capture every diagnostic conversation as structured data so the dataset compounds in value over time.
**Tool:** Google Sheets (start simple). Migrate to Airtable later if/when you outgrow it.
**Companion file:** `BidIntell_Diagnostic_Tracker.xlsx` (build it from the structure below)

---

## WHY THIS MATTERS

You will run 30+ structured conversations over the next 6 months. The transcripts are valuable. The memos are valuable. But the **structured cross-prospect dataset** is the most valuable asset because:

1. Every column becomes a queryable dimension (filter, group, count)
2. Patterns emerge at N=10, N=20, N=30 that you can't see in any single call
3. The dataset becomes content fuel ("Across 30 specialty subs, 22 said X")
4. The dataset becomes acquirer fuel — Procore/Autodesk pay multiples for proprietary buyer-behavior data
5. The dataset is your unfair advantage. Anyone can write software. Almost no one in this space has talked to 30 sub owners and captured what they said in structured form.

**Treat the sheet like a research instrument, not a CRM.** Every field has a reason. Fill them in honestly even when the answer is "I don't know."

---

## SHEET STRUCTURE — TAB 1: PROSPECTS

One row per prospect. Columns below.

### IDENTITY & SOURCE

| Column | Type | Description |
|---|---|---|
| Prospect ID | Auto | P001, P002, etc. |
| First Name | Text | |
| Last Name | Text | |
| Company | Text | |
| Role | Text | Owner / President / VP / etc. |
| Trade | Text | Div 10, flooring, MEP, glazing, etc. |
| Revenue Band | Single-select | <$2M, $2-5M, $5-10M, $10-20M, $20-50M, $50M+ |
| Geography (city/state) | Text | |
| LinkedIn URL | URL | |
| Email | Email | |
| Phone | Text | |
| Source | Single-select | Warm network / Referral / LinkedIn DM / LinkedIn post / Inbound from /diagnostic page / Cold |
| Source detail | Text | Specific person who referred, or which post they came from |

### CALL INFO

| Column | Type | Description |
|---|---|---|
| Date booked | Date | When they booked |
| Date of call | Date | |
| Call duration (min) | Number | Actual length |
| Granola transcript | URL/file | Link to transcript |
| Intake Q4 answer | Long text | Verbatim — what they're hoping to get out of the call |
| No-show? | Yes/No | |

### Q1 — WINS

| Column | Type | Description |
|---|---|---|
| Win count discussed | Number | How many wins they walked through |
| GCs they win with | Long text | Comma-separated list |
| Win attribution | Multi-select | Relationship / Price / Fit / Timing / Luck / Other |
| Win concentration | Single-select | Concentrated (1-2 GCs) / Moderate / Spread |
| Win self-awareness | Single-select | High (knows why) / Partial / Low (guessing) |

### Q2 — LOSSES

| Column | Type | Description |
|---|---|---|
| Loss count discussed | Number | |
| GCs they lose to | Long text | Comma-separated |
| Loss pattern | Multi-select | Same GC repeating / Scope mismatch / Pricing / Timing / Stalking horse / Unclear |
| Loss self-awareness | Single-select | High / Partial / Low |

### Q3 — REGRETS (THE GOLD)

| Column | Type | Description |
|---|---|---|
| Regret stories | Long text | One paragraph per regret, verbatim where possible |
| Common regret pattern | Multi-select | Wrong GC / Wrong scope / Wrong size / Wrong location / Desperation bid / GC-with-no-real-intent |
| Estimating hours wasted (mentioned) | Number | Only if they said a number |
| Verbatim emotional quote | Text | One memorable line |

### Q4 — DECISION PROCESS

| Column | Type | Description |
|---|---|---|
| Bid/no-bid decision-maker | Single-select | Owner / Estimator / Committee / Default-yes (no real decision) |
| Decision time spent | Single-select | <5 min / 5-30 min / >30 min / Unclear |
| Tools used today | Multi-select | Excel / Paper / Software / Nothing formal / Other |
| Has a real process? | Single-select | Yes / Aspirational / No |

### Q5 — THE WISH (ROADMAP INPUT)

| Column | Type | Description |
|---|---|---|
| Wish — verbatim | Long text | What they said when asked "if you could see one thing pre-bid" |
| Wish category | Single-select | GC behavior / Contract risk / Competitor signal / Scope clarity / Timing / Recommendation/score / Other |

### MEMO

| Column | Type | Description |
|---|---|---|
| Memo type | Single-select | 1-page / 5-7 page |
| Memo date sent | Date | |
| Memo file link | URL | Link to PDF in Google Drive |
| Memo response received? | Yes / No / Pending | |
| Memo response gist | Text | Brief summary if they replied |

### FOLLOW-UP

| Column | Type | Description |
|---|---|---|
| Follow-up email date | Date | |
| Follow-up response | Single-select | Sent bid / Asked for trial / "Thinking" / No reply / Declined |
| Last touch date | Date | Most recent contact |
| Next action | Text | "Send 14-day nudge" / "Re-engage 60 days" / "Convert" / "Closed" |

### CONVERSION

| Column | Type | Description |
|---|---|---|
| Trial started? | Yes/No + Date | |
| Bid scored for them? | Yes/No + Date | |
| Converted to paid? | Yes/No + Date | |
| Paid plan tier | Single-select | Solo / Team / Company / Enterprise |
| Reason didn't convert | Text | Verbatim if they explained |

### QUALITATIVE

| Column | Type | Description |
|---|---|---|
| Quote of the call | Text | One memorable line |
| Fit rating | Single-select | Strong ICP / Mid / Weak |
| Energy rating | Single-select | Engaged / Polite / Distracted |
| Notes for next conversation | Long text | Hooks for follow-up — what to reference back |

---

## SHEET STRUCTURE — TAB 2: PATTERNS DASHBOARD

This tab uses formulas/queries against Tab 1 to surface aggregate patterns.

Suggested cells:

- Total prospects diagnosed: `=COUNTA(Prospects!A:A)-1`
- ICP-fit prospects (strong): `=COUNTIF(Prospects![FitColumn], "Strong ICP")`
- Conversion rate: `=COUNTIF(Prospects![PaidColumn], "Yes")/COUNTA(Prospects!A:A)-1`
- Top regret pattern: countif by category
- Top wish category: countif by category
- Most-mentioned GCs: requires manual review or text-parsing formula
- Avg days call → trial: `=AVERAGEIFS(...)`
- Avg days trial → paid: `=AVERAGEIFS(...)`

**Update this tab manually every Friday — 10 minutes.** It becomes your weekly dashboard.

---

## SHEET STRUCTURE — TAB 3: OUTREACH LOG

Track every outreach attempt, separate from prospect records.

| Column | Type | Description |
|---|---|---|
| Date sent | Date | |
| Channel | Single-select | Email warm / Email cold-warm / LinkedIn DM warm / LinkedIn DM cold / Text / LinkedIn post |
| Recipient | Text | Name |
| Script used | Single-select | Script 1 / 2 / 3 / 4 / 5 |
| Reply received? | Yes/No | |
| Reply timing | Single-select | <24h / 1-3 days / 4-7 days / 8+ days |
| Outcome | Single-select | Booked / Deferred / Declined / No reply |
| Notes | Text | |

**Why this matters:** Lets you measure script performance. After 50 sends you'll know which script converts best and you can double down on it.

---

## SHEET STRUCTURE — TAB 4: LINKEDIN POSTS

Track public post performance separately.

| Column | Type | Description |
|---|---|---|
| Date posted | Date | |
| Post number/title | Text | "Post 1 — The Opener" |
| Impressions | Number | |
| Comments | Number | |
| DMs received | Number | |
| Calls booked from this post | Number | |
| Notes | Text | |

---

## SHEET STRUCTURE — TAB 5: WEEKLY METRICS

One row per week.

| Column | Type | Description |
|---|---|---|
| Week of (Monday) | Date | |
| Outreach sent | Number | |
| Calls booked | Number | |
| Calls completed | Number | |
| Memos delivered | Number | |
| Follow-ups sent | Number | |
| Bids scored | Number | |
| Trials started | Number | |
| Paid conversions | Number | |
| Net new MRR | $ | |
| Notes | Text | |

**Fill in every Friday.** Forces weekly reflection on the motion.

---

## DATA HYGIENE RULES

1. **Fill the sheet within 1 hour of a call.** Memory degrades fast. Never let a call go unrecorded for more than a day.

2. **Use the controlled vocabulary in single-select fields.** If you start typing "owner" sometimes and "Owner" other times, the queries break. Pick the spelling, stick to it.

3. **Verbatim quotes in quotation marks.** Distinguish what they actually said from your interpretation.

4. **Anonymize before sharing.** When pulling patterns into LinkedIn posts or content, replace company names with [Sub A], [Sub B]. Never publish identifying details without explicit permission.

5. **Don't delete rows.** If a prospect is no-go, mark them "Closed" and add the reason. The dataset's value is in the full record, including failures.

---

## SETTING UP THE SHEET — STEP BY STEP

1. Create new Google Sheet: "BidIntell Diagnostic Tracker"
2. Create 5 tabs as named above
3. Build column headers per the structure above
4. For single-select columns, use Data → Data validation → List of items
5. For dates, format columns as Date
6. Bookmark the sheet, pin it to your browser
7. Set a recurring 30-min Friday calendar block: "Update diagnostic tracker"

---

## OPTIONAL — AUTOMATIONS LATER (NOT WEEK 1)

Once the manual workflow is solid, you can add:

- **Calendly → Sheet** webhook (Zapier free tier): auto-create row when someone books
- **Postmark → Sheet** webhook: log when memos and follow-ups are sent
- **Stripe → Sheet** webhook: auto-populate paid conversion fields

**Do not build these in week 1.** Manual entry forces field discipline. Automate only after you've run 10 prospects manually and you know which columns matter.

---

**A companion .xlsx file with this structure pre-built is delivered alongside this playbook.**

**Next file: 09_LANDING_PAGE_COPY.md**
