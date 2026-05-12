# 10 — DIAGNOSTIC PROJECT SETUP IN CLAUDE

**Purpose:** Set up a dedicated Claude project for running the diagnostic motion.
**Time:** 20 minutes, one-time.

---

## WHY A SEPARATE PROJECT (NOT THIS ONE)

This current project — your BidIntell strategy project — holds 20+ documents that inform big-picture work: ICP, positioning, exit strategy, codebase docs, content plans. It's your *thinking* brain.

The diagnostic project will be your *operating* brain for this specific motion. It needs:
- The diagnostic call script (so the memo prompt always references the right structure)
- The Claude analysis prompt (your reusable memo generator)
- Anonymized memos as they get written (so cross-prospect pattern analysis works)
- The patterns_observed living doc

**Mixing these into the strategy project would dilute both.** Keep them separate.

---

## SETUP STEPS

### Step 1: Create the project

In Claude (web or app):
- New Project
- Name: **BidIntell Diagnostic Program**
- Description: "Operating project for the bid selection diagnostic motion. Used to generate memos from Granola transcripts, analyze cross-prospect patterns, and refine the diagnostic offer over time. Strategy work happens in the separate BidIntell project."

### Step 2: Add project knowledge documents

Upload these files (from the playbook folder) to project knowledge:

1. `00_PLAYBOOK_OVERVIEW.md` — context for any new chat
2. `04_DIAGNOSTIC_CALL_SCRIPT.md` — the script Claude references when interpreting transcripts
3. `05_CLAUDE_ANALYSIS_PROMPT.md` — the reusable prompt
4. `12_OBJECTION_HANDLING.md` — for any prospect-handling questions
5. `13_PATTERNS_OBSERVED_TEMPLATE.md` — the living patterns doc

Plus a copy of:
- `BidIntell_Product_Bible_v1_9.md` (or current version) — for voice and product context

### Step 3: Set custom instructions

In project settings → custom instructions, paste:

```
This project is the operating environment for BidIntell's bid selection diagnostic motion. When I drop a Granola transcript into a chat here, my goal is almost always to generate a diagnostic memo for the prospect.

Before writing any memo:
1. Reference the diagnostic call script in project knowledge to understand what each question was designed to surface
2. Reference the Claude analysis prompt in project knowledge for the exact memo structure and rules
3. Reference the BidIntell Product Bible for "Confidently Boring" voice — direct, no AI hype, plain estimator language, no exclamation points

When I ask for cross-prospect pattern analysis, pull from any anonymized memos already in project knowledge. Use only the diagnostic project's memo collection — do not reference outside knowledge about typical sub behavior unless I ask.

Memo voice rules:
- Treat the prospect as a peer, not a target
- Every observation must trace to something specific they said
- No generic estimating advice
- Do NOT mention BidIntell anywhere in any memo
- Do NOT pitch anything in any memo

When I ask anything outside of memo generation or pattern analysis, just answer normally. The project context is for the diagnostic workflow specifically.
```

### Step 4: Test the workflow

In a new chat in the diagnostic project, paste a short fake transcript and the analysis prompt with bracketed details filled in. Verify Claude:
- Recommends 1-page or 5-7 page format with reasoning
- Writes in the right voice
- Doesn't mention BidIntell
- Includes specific references to fake-transcript content

If anything's off, refine the custom instructions.

---

## WORKFLOW INSIDE THE PROJECT

### Per diagnostic call

1. Start a new chat in the diagnostic project
2. Title it "[Company Name] — Diagnostic — [Date]"
3. Paste the Claude analysis prompt with bracketed details filled in
4. Attach the Granola transcript (.txt or paste inline)
5. Send
6. Edit Claude's output for voice/specificity
7. Export memo as PDF (filename: `BidIntell_Diagnostic_[Company]_[YYYY-MM-DD].pdf`)
8. Save anonymized memo to project knowledge: replace company name with [Sub A], [Sub B], etc.
9. Save full memo PDF to Google Drive folder: `/BidIntell/Diagnostics/Memos/`

### Cross-prospect pattern analysis (every 5 memos)

Open a new chat in the diagnostic project. Paste:

```
Across the [N] anonymized diagnostic memos in this project knowledge so far, what patterns are emerging? Specifically:

1. What's the most common regret bid pattern?
2. What's the most common decision-process failure mode?
3. What's the most common "wish" answer (Q5 from the call script)?
4. Are there GC-type or scope-type patterns showing up across multiple subs?
5. What's the most common gap between what they think drives wins and what their data probably shows?

Synthesize these into 1-2 paragraphs in Confidently Boring voice. Output should be ready to drop into a LinkedIn post or a content piece.
```

Take Claude's output, drop it into the patterns_observed living doc, and use it for content.

### Refining the offer

If the conversion rate is below benchmarks, open a new chat in the diagnostic project and ask Claude to review the script, prompts, and memos for issues. Claude has the full context and can spot voice drift, missing questions, or pattern gaps.

---

## ORGANIZATION OF PROJECT KNOWLEDGE OVER TIME

Project knowledge has size limits. As memos accumulate, prune:

- **Keep:** All anonymized memos for the most recent 20 diagnostics
- **Archive:** Older memos move to a Google Drive archive folder; remove from project knowledge
- **Always keep:** The 5 core playbook docs, the Product Bible, the patterns_observed doc

Update the patterns_observed doc continuously — it's the synthesized institutional knowledge that compounds even after individual memos rotate out.

---

## SECURITY & CONFIDENTIALITY

The diagnostic project will hold:
- Real prospect names, companies, and bid data (in transcripts and pre-anonymization memos)
- Verbatim quotes about specific GCs and competitors
- Revenue and operational details

**Treat this data with care:**
1. Anonymize before adding to project knowledge (replace names with [Sub A], etc.)
2. Don't include full transcripts in project knowledge — they go in a separate Drive folder
3. Don't share the project with anyone (it's a single-founder project)
4. If you ever bring on a sales hire, give them their own project — don't add them to this one
5. If a prospect asks for their own data deleted, honor it — remove their memo and tracker row

---

**Next file: 11_COWORK_SETUP.md**
