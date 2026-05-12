# 05 — CLAUDE ANALYSIS PROMPT (REUSABLE MEMO GENERATOR)

**Purpose:** Turn a Granola transcript into a 1-page or 5-7 page diagnostic memo in the BidIntell Confidently Boring voice.
**When to use:** After every diagnostic call.
**Where to use:** Inside the "BidIntell Diagnostic Program" project in Claude (separate from your strategy project).

---

## HOW TO USE THIS PROMPT

1. After the call, get the Granola transcript (export as .txt or copy paste)
2. Open a new chat in the **diagnostic project** in Claude
3. Paste the prompt below
4. Attach or paste the transcript
5. Fill in the bracketed prospect details
6. Send

Claude will reply with (a) a recommendation on memo format, then (b) the memo itself.

---

## THE PROMPT — COPY THIS EXACTLY

```
I just ran a 30-minute bid selection diagnostic with [PROSPECT NAME], [ROLE] of [COMPANY], a [TRADE] specialty subcontractor doing roughly [REVENUE BAND] in [GEOGRAPHY]. Granola transcript attached/below.

Their stated reason for taking the call (from intake form Q4): "[QUOTE FROM Q4]"

My read on fit:
- ICP fit: [strong / mid / weak]
- Energy on call: [engaged / polite / distracted]
- Standout pattern I noticed: [one sentence]

Produce a diagnostic memo for them in BidIntell's "Confidently Boring" voice. The voice rules are non-negotiable:
- No exclamation points
- No AI hype words (game-changing, revolutionary, cutting-edge, next-level, powerful AI, seamless)
- Plain estimator language — write like an experienced sub talking to another sub
- No bullet lists where prose would do; if a list is needed, use it sparingly
- Direct, specific, peer-to-peer tone
- Treat them as an equal, not a prospect

FIRST, before writing the memo, tell me which format you recommend:
- 1-page memo if the call surfaced 2-3 patterns and the prospect is mid-fit OR if the call data is thin
- 5-7 page report if the call surfaced 4+ patterns AND the prospect is strong ICP fit (right size, right trade, decision-maker, articulated specific pain)

Give me your recommendation with one sentence of reasoning. Then write the memo in that format using the structure below.

---

1-PAGE FORMAT:

**[Company Name] — Bid Selection Read**
*Prepared by Ryan Elder, BidIntell — [Date]*

**The shape of your bid selection.** (2-3 sentences summarizing how they actually pick bids today, based on what they told you. Don't editorialize — describe.)

**Three patterns I noticed.** (3 specific patterns. Each one names a GC, scope, or behavior verbatim from the transcript. No generic advice. Each pattern is 2-4 sentences.)

**The bid you regretted.** (Reflect their specific regret story back to them in 3-5 sentences. Use their language where possible. Name the GC, scope, or situation they described. End with one sentence on what the regret tells you about their selection blind spots — this is the emotional anchor of the memo.)

**Two suggestions.** (Two concrete things they could do differently. Specific to their situation. NOT product features. Examples of good suggestions: "Before bidding [GC] again, check the last 5 bids you've sent them — if the win rate is under 20%, that's a stalking horse pattern, not variance." Or: "Track ghost rate by GC over the next 90 days — your gut on which GCs ghost is probably right but the numbers will surprise you on the order.")

**What I'd want to see.** (One sentence. The data they're missing pre-bid that would change their decisions, based on what they said in Q5. This is the hook the follow-up email picks up.)

---

5-7 PAGE FORMAT:

Same structure as 1-page, but expanded:

Section 1: The shape of your bid selection. (1 paragraph, ~5-7 sentences. Describe their decision process honestly, including what's missing.)

Section 2: Patterns I noticed. (4-6 patterns, each 4-8 sentences. Specific. Named.)

Section 3: GC-by-GC read. (Table or list of every GC they mentioned. For each: their wins/losses with that GC, your read, and a recommendation: keep bidding / slow down / stop. This section is the highest-value piece of a long memo because it's actionable per-relationship.)

Section 4: Scope risk profile. (Based on their loss patterns and regrets, name the types of scope they should flag for extra scrutiny before bidding. 2-4 categories.)

Section 5: The bid you regretted. (Same as 1-page version but with more context and a bit more depth.)

Section 6: Two-to-four suggestions. (Same as 1-page version, slightly more.)

Section 7: The system you're missing. (1-2 paragraphs. Describe what a structured pre-bid process for their shop would look like — without naming any product. Talk about it as an operational discipline they could build with index cards if they wanted to. This naturally implies the BidIntell value prop without pitching it.)

Section 8: What I'd want to see. (One paragraph. The data they're missing pre-bid.)

---

HARD RULES FOR BOTH FORMATS:

1. Do NOT mention BidIntell anywhere in the memo
2. Do NOT pitch anything — no product, no feature, no trial offer
3. Every observation must trace to something specific they said in the transcript — no generic estimating advice
4. Treat them as a peer, not a prospect
5. If you don't have enough specific transcript data to support a section, say so honestly rather than padding with generic content
6. Use their verbatim quotes (in italics or quotes) where it strengthens a point
7. End with the "What I'd want to see" line — that's the bridge to the follow-up email
8. Sign the memo as just "Ryan" or "Ryan Elder" — no title, no website, no email signature block (the email body handles that)

---

WHAT TO INCLUDE BEFORE THE MEMO IN YOUR REPLY:
- Recommended format (1-page or 5-7 page) with one-sentence reasoning
- One paragraph of patterns you noticed reading the transcript that I should keep in mind for the follow-up email
- Then the memo itself

GO.
```

---

## EDITING THE OUTPUT

Claude will get the structure right and most of the content right on the first pass. You'll need to edit for:

- **Voice drift**: Sometimes Claude will slip in a generically-positive phrase. Cut it.
- **Padding**: If a section feels longer than it earns, trim.
- **Specificity**: Add any GC name, scope detail, or quote you remember that the transcript missed.
- **Personal touch**: Add 1-2 lines that only you would write — a peer comment, an observation from your own time running a sub, etc.

**Budget 15-20 minutes for editing.** The first 2-3 memos will need more work; once you have a few in the library, Claude will hit the voice tighter.

---

## DELIVERING THE MEMO

Once you're happy with the memo:

1. Export as PDF (Word doc → save as PDF, or use the docx skill if generating fresh)
2. Filename format: `BidIntell_Diagnostic_[CompanyName]_[YYYY-MM-DD].pdf`
3. Send via email (template in file 06)

---

## STORING MEMOS

Keep a copy of every memo in the diagnostic project in Claude (drop into project knowledge), AND in a Google Drive folder.

**Why both:** Claude project knowledge gives you cross-memo pattern analysis ("across all memos so far, what do prospects regret bidding most often?"). Google Drive gives you the durable record that survives if you restructure projects.

**Anonymize for project knowledge** — replace company names with [Sub A], [Sub B], etc. before adding to project knowledge so cross-memo analysis is clean.

---

## CROSS-MEMO PATTERN ANALYSIS

Every 5 memos, run this in the diagnostic project:

```
Across the [N] diagnostic memos in this project knowledge so far, what patterns are emerging? Specifically:

1. What's the most common regret bid pattern?
2. What's the most common decision-process failure mode?
3. What's the most common "wish" answer (Q5 from the call script)?
4. Are there GC-type or scope-type patterns showing up across multiple subs?
5. What's the most common gap between what they think drives wins and what their data probably shows?

Synthesize these into 1-2 paragraphs. Use Confidently Boring voice. Output should be ready to drop into a LinkedIn post or a content piece.
```

That output becomes:
- LinkedIn content (anonymized)
- BOOST 7 / Speedrun deck slides
- Updates to the patterns_observed living doc
- Hooks for cold outreach: "Across 12 diagnostics with shops your size, the top regret pattern was X. Worth half an hour to see if you have it?"

This is the compounding value of the diagnostic motion.

---

**Next file: 06_MEMO_DELIVERY_EMAIL.md**
