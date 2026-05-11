// netlify/functions/diagnostic-agent/lib-claude-research.js
// Wraps Anthropic SDK for the two Claude calls: research synthesis and script tailoring.

const Anthropic = require('@anthropic-ai/sdk');
const {
  buildResearchPrompt,
  buildScriptTailoringPrompt,
  buildFounderEmailPrompt,
} = require('./prompts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

/**
 * Run company research with web_search tool.
 * Returns: structured markdown brief, or fallback string if API fails.
 */
async function runResearch(prospectData) {
  try {
    const prompt = buildResearchPrompt(prospectData);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 8, // cap searches per run
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text blocks (skip tool_use and tool_result blocks)
    const textBlocks = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    if (!textBlocks || textBlocks.length < 100) {
      return {
        success: false,
        brief: fallbackBrief(prospectData, 'Claude returned empty response'),
        searchesRun: 0,
      };
    }

    // Strip code fences if Claude wrapped the markdown
    const cleanBrief = textBlocks.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

    // Count searches actually performed (for logging)
    const searchesRun = response.content.filter((b) => b.type === 'tool_use').length;

    return {
      success: true,
      brief: cleanBrief,
      searchesRun,
    };
  } catch (err) {
    console.error('Research call failed:', err);
    return {
      success: false,
      brief: fallbackBrief(prospectData, err.message),
      searchesRun: 0,
    };
  }
}

/**
 * Tailor the call script using the company brief.
 */
async function tailorScript({ prospectData, companyBrief }) {
  try {
    const prompt = buildScriptTailoringPrompt({
      ...prospectData,
      companyBrief,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const cleanScript = text.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

    return { success: true, script: cleanScript };
  } catch (err) {
    console.error('Script tailoring failed:', err);
    return {
      success: false,
      script: fallbackScript(prospectData),
    };
  }
}

/**
 * Generate the founder summary email body.
 */
async function generateFounderEmail(emailContext) {
  try {
    const prompt = buildFounderEmailPrompt(emailContext);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return text.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
  } catch (err) {
    console.error('Founder email generation failed:', err);
    return fallbackFounderEmail(emailContext);
  }
}

/**
 * Extract structured fields from the brief — used for the tracker row.
 * Pattern-match against the markdown headings.
 */
function extractFitRead(brief) {
  const match = brief.match(/##\s*ICP Fit Read[\s\S]*?\n(.+?)(?:\n##|\n$|$)/i);
  if (!match) return 'Unknown';
  const text = match[1].toLowerCase();
  if (text.includes('strong')) return 'Strong ICP';
  if (text.includes('weak')) return 'Weak';
  if (text.includes('mid')) return 'Mid';
  return 'Unknown';
}

// ---------- Fallbacks (when API fails) ----------

function fallbackBrief({ companyName, prospectName, trade, geography }, errorMsg) {
  return `# Company Brief: ${companyName}

⚠️ **Research API failed during prep.** Reason: ${errorMsg}

Run the call without pre-research. Lean on the standard 5-question script and rely on what the prospect tells you in the warm-up.

## What we know from intake

- Prospect: ${prospectName}
- Company: ${companyName}
- Trade: ${trade}
- Geography: ${geography || 'Not specified'}

## ICP Fit Read

Unknown — research failed. Treat as Mid until proven otherwise.
`;
}

function fallbackScript({ companyName, prospectName }) {
  return `# Standard Diagnostic Script — ${companyName} (${prospectName})

⚠️ Script tailoring failed. Run the standard 5-question script.

See playbook file 04 — DIAGNOSTIC CALL SCRIPT for the full standard version.

Time allocation: 2 min open, 6 min Q1, 6 min Q2, 8 min Q3 (the gold), 5 min Q4, 3 min Q5, 3 min close.

Skip the "what to listen for" tailored notes — research wasn't available for this prep run.
`;
}

function fallbackFounderEmail({ companyName, prospectName, callTime, driveFolderUrl, intakeAnswer }) {
  return `Subject: New diagnostic booked — ${companyName}

${prospectName} at ${companyName} booked for ${callTime}. Intake answer: "${intakeAnswer}".

Research/tailoring failed during prep — Drive folder still created with intake details. Run the standard script.

Folder: ${driveFolderUrl}`;
}

module.exports = {
  runResearch,
  tailorScript,
  generateFounderEmail,
  extractFitRead,
};
