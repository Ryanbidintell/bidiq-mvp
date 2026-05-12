# 11 — COWORK SETUP FOR THE DIAGNOSTIC MOTION

**Purpose:** Use Anthropic's Cowork (desktop tool for non-developers to automate file and task management) to handle the operational plumbing of the diagnostic workflow — file organization, transcript handling, follow-up reminders.

**Important note before you start:** Cowork is a beta product and capabilities evolve. Some of what's described below may need adjustment based on what Cowork can do today. Treat this as a workflow blueprint — adjust to match Cowork's current feature set.

---

## WHAT COWORK SHOULD HANDLE

The clear operational pain points Cowork can address:

1. **File organization** — keeping transcripts, memos, intake forms organized by prospect
2. **File naming consistency** — enforcing the `BidIntell_Diagnostic_[Company]_[YYYY-MM-DD]` convention
3. **Calendar reminders** — flagging when each prospect needs the follow-up email (5-7 days post-memo)
4. **Cross-system bookkeeping** — keeping the tracking sheet, Drive folders, and email threads aligned

---

## RECOMMENDED FOLDER STRUCTURE (LOCAL OR DRIVE)

Set this up first — Cowork will work against this structure:

```
/BidIntell/
└── /Diagnostics/
    ├── /Prospects/
    │   ├── /P001_StergosFDC/
    │   │   ├── intake_form.txt
    │   │   ├── transcript_2026-05-14.txt
    │   │   ├── memo_draft.md
    │   │   ├── memo_final.pdf
    │   │   └── notes.md
    │   ├── /P002_HigleyHal/
    │   └── ... (one folder per prospect)
    ├── /Memos_All/
    │   ├── BidIntell_Diagnostic_FDC_2026-05-14.pdf
    │   └── ... (flat folder, all memos for easy browsing)
    ├── /Templates/
    │   ├── memo_1page_template.docx
    │   ├── memo_5to7page_template.docx
    │   └── follow_up_email_template.txt
    ├── /Patterns/
    │   ├── patterns_observed_living.md
    │   └── monthly_synthesis_2026-05.md
    └── /Outreach/
        ├── linkedin_posts_log.md
        └── outreach_log.md
```

---

## TASKS TO ASSIGN TO COWORK

### Task 1: New prospect setup

**Trigger:** New prospect books via Calendly OR you manually add a row to the tracking sheet.

**Cowork actions:**
1. Create new folder `/Prospects/P[NNN]_[LastName][CompanyShort]/`
2. Drop blank `notes.md` template into the folder
3. Drop intake form answers into `intake_form.txt`
4. Add calendar event for the call
5. Add calendar event for "Memo write-up" 1-3 days after call
6. Add calendar event for "Send follow-up email" 5-7 days after memo
7. Update tracking sheet with prospect info

### Task 2: Post-call file organization

**Trigger:** You drop a Granola transcript into Cowork.

**Cowork actions:**
1. Detect prospect from transcript filename or content
2. Move transcript to the right `/Prospects/P[NNN]_*/` folder
3. Rename it `transcript_[YYYY-MM-DD].txt`
4. Open the diagnostic project in Claude with the transcript pre-loaded (if Cowork can deep-link Claude)
5. Update tracking sheet: mark "call completed"

### Task 3: Memo finalization

**Trigger:** You finish editing a memo and save it as `memo_final.pdf` in the prospect folder.

**Cowork actions:**
1. Copy memo to `/Memos_All/` with proper naming convention
2. Update tracking sheet: memo date sent, memo type, memo file link
3. Schedule follow-up email reminder for 5-7 days later
4. (Optional) Draft the follow-up email in your inbox using the template

### Task 4: Weekly metrics roll-up

**Trigger:** Friday at 4 PM (or whenever you do your weekly review).

**Cowork actions:**
1. Pull row counts from tracking sheet for the week
2. Update Tab 5 (Weekly Metrics) with: outreach sent, calls booked, calls completed, memos delivered, follow-ups sent, trials started, paid conversions
3. Generate a 1-paragraph summary email to yourself: "This week: X outreach, Y calls booked. Top quote: [pull from sheet]. Action item: [based on metrics]."

### Task 5: Pattern synthesis trigger

**Trigger:** Every 5th completed memo.

**Cowork actions:**
1. Notify you that pattern synthesis is due
2. Create new file in `/Patterns/` called `synthesis_[YYYY-MM-DD].md`
3. Open the diagnostic project in Claude with the cross-prospect prompt pre-loaded

---

## WHAT NOT TO ASSIGN TO COWORK

- **Generating memos.** That's Claude's job, in the diagnostic project. Cowork moves files; Claude generates content.
- **Sending outreach emails.** Outreach is high-touch, personalized. Don't automate.
- **Sending follow-up emails.** Same reason. The follow-up is the conversion email and needs to reflect the specific call. Cowork can *remind* you, but you write it.
- **Talking to prospects.** You.
- **Deciding whether a prospect is ICP-fit.** You.
- **Editing memos.** You.

Cowork is the operations layer. The judgment calls stay with you.

---

## SETUP STEPS

### Phase 1: Manual workflow first (Week 1-2)

Before configuring Cowork:

1. Set up the folder structure manually
2. Run 3-5 diagnostics with manual file management
3. Identify which steps are most repetitive and time-consuming
4. THEN configure Cowork to automate those specific steps

**Don't pre-build automation for a workflow you haven't run yet.** You'll automate the wrong things.

### Phase 2: Configure Cowork for top 3 repetitive tasks (Week 3+)

Pick the 3 most painful manual steps and automate those first. Likely candidates:
- New prospect folder creation + calendar events (Task 1)
- Memo move-to-Memos_All folder + tracking sheet update (Task 3)
- Friday weekly roll-up (Task 4)

Skip Tasks 2 and 5 initially — they're nice-to-have but not painful.

### Phase 3: Expand as you learn (Month 2+)

After 10+ diagnostics, you'll have a clear picture of what's worth automating. Add Cowork tasks based on actual friction, not theoretical efficiency.

---

## ALTERNATIVE: ZAPIER / MAKE.COM

If Cowork doesn't quite fit yet, the same workflows can run on Zapier or Make.com:

- Calendly → Google Sheet (booking auto-creates row)
- Calendly → Calendar (auto-creates write-up and follow-up events)
- Postmark → Sheet (logs emails sent)
- Stripe → Sheet (logs paid conversions)

Free tiers handle this volume. Set up only if Cowork is missing capabilities you need today.

---

## INTEGRATION WITH THE STRATEGY PROJECT

The diagnostic project (file 10) and Cowork operate in parallel:

- **Strategy project (this one)**: ICP refinement, GTM strategy, decisions about whether to pivot the diagnostic offer, big-picture brand
- **Diagnostic project**: Memo generation, cross-prospect pattern analysis, refining the diagnostic motion itself
- **Cowork**: File organization, calendar reminders, tracking sheet updates, the operational layer

**Don't blur these.** Each has a clear role. Friction comes from forcing one tool to do another's job.

---

**Next file: 12_OBJECTION_HANDLING.md**
