// netlify/functions/diagnostic-agent/prompts.js
// Prompts for the diagnostic prep agent. Versioned. Edit voice here.

const CONFIDENTLY_BORING_VOICE_RULES = `
VOICE RULES (NON-NEGOTIABLE):
- "Confidently Boring" — read like an experienced estimator talking to another estimator
- No exclamation points
- No AI hype words: game-changing, revolutionary, cutting-edge, next-level, powerful, seamless
- No emojis
- Plain estimator language. Direct. Specific. Peer-to-peer.
- Treat the prospect as an equal, not a target
- Short paragraphs. One idea per paragraph.
`;

/**
 * Research prompt — Claude with web_search tool digs up everything
 * relevant about the prospect's company before the call.
 */
function buildResearchPrompt({
  companyName,
  trade,
  geography,
  role,
  prospectName,
  intakeAnswer,
}) {
  return `You are doing pre-call research for Ryan Elder, founder of BidIntell. Ryan has a 30-minute diagnostic call booked with ${prospectName}, ${role} of ${companyName}, a ${trade} specialty subcontractor in ${geography || "an unspecified location"}.

The prospect's stated reason for taking the call: "${intakeAnswer}"

Your job: use web_search to gather public information that will help Ryan show up to the call as a credible peer, not a stranger.

Specifically, search for and synthesize:

1. **Company basics:** What does ${companyName} actually do? Specific scopes within ${trade}? Approximate size cues (employee count on LinkedIn, project size cues, geographic footprint)?

2. **Recent project signals:** Any mentions of recent projects, awards, completed work, news mentions? This tells Ryan what kind of work they're chasing.

3. **The owner / decision-maker:** Search for ${prospectName}. Background, prior roles, time at the company, anything they've posted publicly that signals how they think about the business.

4. **GCs they likely work with:** Search for "${companyName}" + "subcontractor" + GC names common to their geography and trade. If specific GC relationships surface, name them.

5. **Industry context:** Anything specific to ${trade} subs in ${geography || "their region"} right now — labor pressure, demand cycles, recent association activity, anything that gives Ryan a current-events hook.

6. **Red flags:** Any signs they may not be a fit (different size than stated, different trade than stated, recent acquisition, leadership turnover)?

OUTPUT FORMAT — strict markdown:

\`\`\`
# Company Brief: ${companyName}

## Quick Facts
- Trade specifics: [what they actually do]
- Estimated size: [employee count, geographic footprint, anything available]
- Years in business: [if findable]
- Geographic footprint: [primary metros]
- Public website: [URL or "not found"]

## ${prospectName} — Background
[2-3 sentences on the prospect specifically. Tenure, role, prior background, posting style.]

## Recent Project Signals
[Bullet list of 2-5 recent projects, news mentions, awards, or "no public recent project signals" if nothing surfaces.]

## Likely GC Relationships
[Bullet list of GCs surfaced or inferred, or "no public GC relationships surfaced" if nothing.]

## Industry / Trade Context
[2-3 sentences on what's happening in their trade and metro right now that's worth knowing.]

## Red Flags
[Bullet list, or "none surfaced".]

## Hooks for the Call
[3-5 specific things Ryan can reference to show he did his homework. Each hook must be specific — "I saw the Mercy Hospital flooring job last fall" not "you do healthcare work."]

## ICP Fit Read
[One sentence: Strong / Mid / Weak fit, with brief reasoning.]
\`\`\`

${CONFIDENTLY_BORING_VOICE_RULES}

If web_search returns thin or no results, say so honestly in each section rather than inventing details. A short brief that's accurate is better than a long brief that's hallucinated.

Begin research now.`;
}

/**
 * Script tailoring prompt — takes the company brief + the standard
 * 5-question script and tailors it to this specific prospect.
 */
function buildScriptTailoringPrompt({
  companyName,
  prospectName,
  trade,
  intakeAnswer,
  companyBrief,
}) {
  return `You are tailoring the BidIntell diagnostic call script for a specific prospect.

PROSPECT: ${prospectName}, ${companyName} (${trade})
INTAKE ANSWER (what they're hoping to get out of the call): "${intakeAnswer}"

COMPANY BRIEF FROM RESEARCH:
${companyBrief}

THE STANDARD SCRIPT IS 5 QUESTIONS:

Q1 — Walk me through your last 5 wins. Which GC, what scope, why do you think you won?
Q2 — Now your last 5 losses. Same format.
Q3 — Of the bids you chased, which ones do you wish you'd never started?
Q4 — Walk me through last Tuesday morning when a bid invite hit your inbox. Who looks at it, what do you check, how do you decide?
Q5 — If you could see one thing about a bid invite the moment it landed that you can't see today, what would it be?

YOUR JOB: Customize the script for THIS prospect. Specifically:

1. Pre-question hooks — for each question, add a brief 1-sentence "what to listen for with this specific prospect" note based on the company brief and intake answer. Example: "Listen for whether [specific GC named in brief] comes up in their wins or losses."

2. Probing follow-ups — for any question where the company brief gives you a specific angle to push on, add a tailored probe. Example: "If they mention healthcare work, probe on the Mercy Hospital project specifically."

3. Likely conversational hooks — based on the intake answer ("${intakeAnswer}"), suggest where Ryan should steer extra time. If they said "I want to know which GCs to stop bidding," Question 2 (losses) and Question 3 (regrets) deserve more time.

4. Pre-call mental prep — 3 bullets at the top: what to mention in the warm-up, what to NOT mention (anything that would feel like Ryan stalked them), and the one specific hook from the brief that Ryan should drop naturally in the opening to signal "I did my homework but I'm not creepy about it."

OUTPUT FORMAT:

\`\`\`
# Tailored Call Script: ${companyName} — ${prospectName}

## Pre-Call Mental Prep

**Mention in warm-up:** [1 specific thing from the brief]
**Don't mention:** [anything that crosses the "I researched you" line]
**Natural hook for the opening:** [one line Ryan can drop]

## Time Allocation (adjusted for this prospect)

[How to weight the 30 minutes. If their intake answer points hard at one area, give that question extra time and trim another.]

## Q1 — Wins (X minutes)

**Standard question:** Walk me through your last 5 wins. Which GC, what scope, why do you think you won?

**Listen for with this prospect specifically:** [tailored note from the brief]

**Probe if it comes up:** [specific follow-up if [GC name from brief] is mentioned]

## Q2 — Losses (X minutes)
[Same structure]

## Q3 — Regrets (X minutes)
[Same structure — this is "the gold," likely deserves the most time]

## Q4 — Decision Process (X minutes)
[Same structure]

## Q5 — The Wish (X minutes)
[Same structure]

## After the Call — Memo Notes

Based on the brief, the memo for ${companyName} should especially focus on:
- [angle 1]
- [angle 2]

Likely "wish" answer based on intake: [prediction Ryan can validate or be surprised by]
\`\`\`

${CONFIDENTLY_BORING_VOICE_RULES}

The point of tailoring is so Ryan walks into the call having actually thought about THIS company, not running a generic checklist. Be specific. If the brief is thin, say "brief is thin — run the standard script, focus on Q3 and Q5 to extract pattern data."

Begin tailoring now.`;
}

/**
 * Founder summary email — what Ryan sees in his inbox after the agent runs.
 */
function buildFounderEmailPrompt({
  companyName,
  prospectName,
  callTime,
  driveFolderUrl,
  intakeAnswer,
  companyBrief,
  fitRead,
}) {
  return `Write a brief internal email to Ryan summarizing a new diagnostic booking. Format: plain text email, friendly-internal tone (not customer-facing).

DETAILS:
- Prospect: ${prospectName} at ${companyName}
- Call time: ${callTime}
- Their intake answer: "${intakeAnswer}"
- ICP fit read: ${fitRead}
- Drive folder: ${driveFolderUrl}

Keep it under 100 words. Lead with the most important thing (fit read + the one hook Ryan should remember). End with the Drive link. No sign-off — Ryan knows it's from the agent.

Format:

\`\`\`
Subject: New diagnostic booked — [Company]

[2-3 sentence summary including: fit rating, the one most useful hook from the brief, and a heads-up about the time-allocation suggestion if there is one]

Folder: [Drive URL]

[Optional: any red flags surfaced in research, in 1 sentence]
\`\`\``;
}

module.exports = {
  buildResearchPrompt,
  buildScriptTailoringPrompt,
  buildFounderEmailPrompt,
  CONFIDENTLY_BORING_VOICE_RULES,
};
