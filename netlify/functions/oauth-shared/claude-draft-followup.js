// oauth-shared/claude-draft-followup.js
// Generates an AI follow-up email draft for a single follow_up_touches row.
// Called by generate-followup-drafts.js (scheduled) for each pending touch.
//
// Returns: { subject, body, reasoning }
// reasoning is a 1-sentence explanation of how the principle was applied (for QA only,
// never shown to GCs).

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const MODEL = 'claude-sonnet-4-6';

const PRINCIPLE_INSTRUCTIONS = {
  reciprocity: `This is a reciprocity touch. The goal is to give something useful before asking for anything. Open by briefly referencing the work your team put into the estimate — then offer a small, genuinely useful piece of information: a value-engineering note, a heads-up about a material lead time, a clarifying question that shows you read the scope carefully. Do NOT ask if they've made a decision yet. Tone: collegial, unhurried.`,

  commitment: `This is a commitment and consistency touch. The goal is a 5-second yes/no reply. Remind the GC of a specific, accurate thing they said or did that implied forward motion — an RFI they issued, a clarification call you had, the fact they sent you the invite directly. Frame the follow-up as a natural continuation of something already in motion, not a cold check-in. Ask one narrow yes/no question. Tone: matter-of-fact, efficient.`,

  social_proof: `This is a social proof touch. Reference a real, specific, recent project your company completed that is similar in type, trade, or GC to this bid. Include the project type, approximate size (if known), and outcome ("came in on schedule," "zero RFIs after mobilization," etc.). Do not fabricate details — use only what you know is true. If the user's company context is thin, keep the reference brief and genuine. Tone: confident but not boastful.`,

  liking: `This is a liking and rapport touch. Find the most genuine, specific thing you can say about this GC or this project that is actually true — the GC's reputation in your market, the building type you find interesting, the fact that you've worked together before. Do not manufacture warmth. Do not use "I hope this message finds you well" or any variant. One sentence of genuine observation, then get to the point. Tone: warm, human, direct.`,

  authority: `This is an authority touch. Demonstrate relevant expertise specific to this project's scope. This is not a credentials list — it is a single, precise observation about the scope, drawings, or spec that only someone who actually read the documents would know. If there's a legitimate scope ambiguity, name it. If there's a detail that affects the price, flag it. This positions you as a subject-matter expert, not just another number-submitter. Tone: technical, specific, confident.`,

  scarcity: `This is a scarcity touch. Reference a real, honest constraint — your crew availability window, a material procurement deadline, your estimating team's capacity. Do NOT manufacture urgency or invent fictional deadlines. If you have no real constraint to cite, skip this principle and fall back to reciprocity. The constraint must be specific (a date, a project, a procurement window) and true. Tone: matter-of-fact, professional. Never alarming.`,

  unity: `This is a unity touch. Emphasize shared identity — you've worked on similar projects in this market, you understand how this GC operates, you're both building in this city. Reference shared history if it exists. Avoid generic "we're the right team" language. One specific true thing that makes you and this GC part of the same professional community. Tone: understated, collegial.`,
};

const HARD_CONSTRAINTS = `
HARD CONSTRAINTS — violating any of these invalidates the draft:
- Never use exclamation points. Not one.
- Never say: "just checking in", "circle back", "touch base", "reach out", "hope this finds you well", "following up", "looping back", "wanted to touch base", or any variant of these phrases.
- Sign with first name only (no last name, no title, no company name in the sign-off).
- The word count must fall within ±15 words of the target. Count carefully.
- Subject line: 6–10 words, no punctuation at the end, no emojis.
- Plain text only — no bullet points, no bold, no markdown.
- One ask per email. Never more than one question.
- Never mention "BidIntell", "AI", or that the email was drafted by software.
`;

function buildPrompt(context) {
  const {
    userName,
    userFirstName,
    companyName,
    trade,
    projectName,
    projectAddress,
    projectType,
    projectSizeSf,
    bidScore,
    gcName,
    gcContactName,
    gcContactEmail,
    touchNumber,
    totalTouches,
    primaryPrinciple,
    secondaryPrinciple,
    wordCountTarget,
    customInstruction,
    priorTouches,
    templateName,
  } = context;

  const principleInstruction = PRINCIPLE_INSTRUCTIONS[primaryPrinciple] || PRINCIPLE_INSTRUCTIONS.reciprocity;
  const secondaryNote = secondaryPrinciple && PRINCIPLE_INSTRUCTIONS[secondaryPrinciple]
    ? `\nAs a secondary layer, also weave in a subtle element of the ${secondaryPrinciple} principle. Don't force it — only if it fits naturally.`
    : '';

  const priorTouchHistory = (priorTouches || []).map((t, i) =>
    `Touch ${i + 1} (sent ${t.sent_at ? new Date(t.sent_at).toLocaleDateString() : 'unknown'}): Subject: "${t.draft_subject || t.user_edited_subject || '(no subject)'}"`
  ).join('\n');

  const sizeLine = projectSizeSf ? `, ${projectSizeSf.toLocaleString()} SF` : '';
  const scoreLine = bidScore ? ` (BidIndex: ${bidScore})` : '';

  return `You are ghostwriting a follow-up email for ${userFirstName || userName || 'the estimator'} at ${companyName || 'a specialty subcontracting company'} (${trade || 'specialty trade'}).

PROJECT: ${projectName || 'the project'} — ${projectAddress || ''}${sizeLine}, ${projectType || 'commercial construction'}${scoreLine}
GC: ${gcName || 'the GC'}${gcContactName ? `, contact: ${gcContactName}` : ''}
THIS IS TOUCH ${touchNumber} OF ${totalTouches} (template: ${templateName || 'Standard GC'})

${priorTouchHistory ? `PRIOR TOUCHES SENT:\n${priorTouchHistory}\n` : ''}

PRINCIPLE INSTRUCTION:
${principleInstruction}${secondaryNote}

${customInstruction ? `USER'S CUSTOM INSTRUCTION FOR THIS TOUCH:\n${customInstruction}\n` : ''}

TARGET WORD COUNT: ${wordCountTarget || 70} words (body only, not subject line). Stay within ±15 words.

${HARD_CONSTRAINTS}

Return ONLY valid JSON in this exact format (no prose before or after):
{
  "subject": "Subject line here",
  "body": "Full email body here, plain text, signed with first name only",
  "reasoning": "One sentence: how this email applies the ${primaryPrinciple} principle"
}`;
}

async function generateDraft(context) {
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not set');

  const prompt = buildPrompt(context);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Claude API error (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || '';

  // Parse the JSON response
  let parsed;
  try {
    // Strip any markdown code fences if Claude added them
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Claude returned non-JSON: ${raw.slice(0, 200)}`);
  }

  if (!parsed.subject || !parsed.body || !parsed.reasoning) {
    throw new Error(`Draft missing required fields: ${JSON.stringify(Object.keys(parsed))}`);
  }

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
    reasoning: parsed.reasoning.trim(),
  };
}

module.exports = { generateDraft };
