# Contract Risk Clause Detection Guide for BidIntell

## The Problem We Just Solved (And Why It's Hard)

Finding the paid-when-paid clause in the Turner Form 36 subcontract required:
1. **OCR fallback** — The Form 36 uses custom font encoding that makes standard text extraction return garbled characters
2. **Semantic understanding** — The clause never literally says "paid when paid" — it says "express condition precedent of payment therefor by the Owner"
3. **Legal classification** — Distinguishing pay-*when*-paid (timing) from pay-*if*-paid (condition precedent), which carry very different legal weight

This is exactly what BidIntell needs to handle automatically at scale.

---

## Two-Layer Detection Strategy

### Layer 1: Keyword/Pattern Search (Fast, Cheap, Pre-Filter)

Run this BEFORE sending to Claude API to reduce token usage. If these patterns hit, flag for deeper analysis. If they don't hit, still send the payment sections to Claude — many clauses use indirect language.

```javascript
const RISK_CLAUSE_PATTERNS = {
  // PAY-WHEN-PAID / PAY-IF-PAID
  paid_when_paid: {
    severity: "high",
    exact_phrases: [
      "paid when paid",
      "pay when paid",
      "pay-when-paid",
      "paid-when-paid",
      "pay if paid",
      "pay-if-paid",
      "paid if paid",
      "paid-if-paid"
    ],
    semantic_phrases: [
      "condition precedent",
      "express condition precedent",
      "conditioned upon.*payment.*owner",
      "contingent upon.*payment",
      "receipt of payment.*from.*owner",
      "only with funds received",
      "payment.*received by contractor from.*owner",
      "subject to.*payment.*by the owner",
      "contractor receives payment",
      "owner has paid",
      "payment therefor by the owner"
    ],
    // CRITICAL: These distinguish pay-IF-paid (worse) from pay-WHEN-paid
    escalation_to_pay_if_paid: [
      "condition precedent",
      "express condition precedent",
      "shall not be obligated",
      "only with funds received"
    ]
  },

  // LIQUIDATED DAMAGES FLOW-DOWN
  liquidated_damages: {
    severity: "high",
    exact_phrases: [
      "liquidated damages",
      "LD's",
      "LDs",
      "delay damages"
    ],
    semantic_phrases: [
      "per day.*delay",
      "damages.*per calendar day",
      "assessable against.*subcontractor"
    ]
  },

  // INDEMNIFICATION (BROAD FORM)
  indemnification: {
    severity: "medium",
    exact_phrases: [
      "indemnify.*hold harmless.*defend",
      "broad form indemnit",
      "indemnification"
    ],
    semantic_phrases: [
      "sole negligence.*contractor",
      "indemnify.*even if.*caused by",
      "regardless of.*fault"
    ]
  },

  // NO-DAMAGE-FOR-DELAY
  no_damage_for_delay: {
    severity: "high",
    exact_phrases: [
      "no damage for delay",
      "no damages for delay"
    ],
    semantic_phrases: [
      "not.*entitled.*claim.*cost.*delay",
      "waive.*claim.*delay.*damages",
      "extension of time.*sole remedy",
      "limited extent.*contractor.*recovered.*from.*owner"
    ]
  },

  // WAIVER OF CONSEQUENTIAL DAMAGES (ONE-SIDED)
  consequential_damages_waiver: {
    severity: "medium",
    semantic_phrases: [
      "waive.*lost profit",
      "waive.*overhead.*home office",
      "waive.*indirect damages",
      "waive.*consequential"
    ]
  },

  // RETAINAGE TERMS
  retainage: {
    severity: "low",
    semantic_phrases: [
      "retainage.*10%",
      "retain.*10.*percent",
      "retainage.*exceed"
    ]
  },

  // DISPUTE RESOLUTION (BINDING ARBITRATION / JURY WAIVER)
  dispute_resolution: {
    severity: "medium",
    exact_phrases: [
      "waive.*right to trial by jury",
      "binding arbitration",
      "jury waiver"
    ],
    semantic_phrases: [
      "sole discretion.*contractor.*forum",
      "waive.*jury"
    ]
  }
};
```

### Layer 2: Claude API Prompt (Semantic Understanding)

This is the prompt to use in your `detectContractRisks()` function. The key insight: **teach Claude what these clauses look like in practice, not just what they're called.**

```javascript
const CONTRACT_RISK_PROMPT = `You are a construction contract risk analyst specializing in subcontractor agreements. 

Analyze the following contract text and identify ALL risk clauses that would concern a subcontractor. 

CRITICAL DETECTION RULES:
1. Clauses often do NOT use their common names. "Paid-when-paid" never literally appears — look for the LEGAL MECHANISM instead.
2. Pay attention to WHO bears the risk in each clause.
3. Distinguish between severity levels based on legal enforceability and financial impact.

CLAUSE LIBRARY — What to look for and HOW they actually appear:

## PAY-IF-PAID (HIGHEST RISK)
Common names: pay-if-paid, conditional payment
What it really says: "condition precedent of payment by the Owner" or "only with funds received from Owner" or "subject to the express condition precedent of payment therefor by the Owner"
Why it matters: Contractor has ZERO obligation to pay sub if owner doesn't pay. Sub bears owner's credit risk.
Key distinguisher: Uses "condition precedent" language. This is legally stronger than pay-when-paid.

## PAY-WHEN-PAID (HIGH RISK)  
Common names: pay-when-paid, timing of payment
What it really says: "payment within X days after contractor receives payment from owner" or "payment shall be made when contractor receives payment"
Why it matters: Creates timing dependency but contractor still ultimately owes the money.
Key distinguisher: Sets payment TIMING but doesn't eliminate the obligation entirely.

## NO-DAMAGE-FOR-DELAY (HIGH RISK)
Common names: no damage for delay, delay waiver
What it really says: "not entitled to claim cost reimbursement for delay except to the limited extent contractor has recovered from owner" or "extension of time shall be the sole remedy"
Why it matters: Sub can't recover costs when GC causes delays. Only gets time, not money.

## BROAD FORM INDEMNIFICATION (HIGH RISK)
What it really says: "indemnify, hold harmless and defend contractor... from and against any and all claims" — especially dangerous when it covers contractor's own negligence.
Why it matters: Sub pays for contractor's mistakes. May be unenforceable in some states.

## FLOW-DOWN / INCORPORATION BY REFERENCE (MEDIUM RISK)
What it really says: "bound by all terms of the general contract" or "prime contract terms are incorporated herein"
Why it matters: Sub inherits risks from a contract they may never have seen.

## CONSEQUENTIAL DAMAGES WAIVER (MEDIUM RISK - if one-sided)
What it really says: "waives all claims for lost profit, home office overhead, and indirect damages"
Why it matters: If only the sub waives (not mutual), sub can't recover real losses.

## JURY TRIAL WAIVER (MEDIUM RISK)
What it really says: "expressly agrees to waive right to trial by jury"

## LIQUIDATED DAMAGES FLOW-DOWN (HIGH RISK)
What it really says: "subcontractor shall be liable for liquidated damages" or LD amounts passed through

## TERMINATION FOR CONVENIENCE (MEDIUM RISK)
What it really says: "contractor may terminate without cause" — check if sub gets profit on unperformed work

## CHANGE ORDER RESTRICTIONS (MEDIUM RISK)
What it really says: "notice within X hours/days" with very short windows, or "failure to notify constitutes waiver"

Respond in this exact JSON format:
{
  "risks_found": [
    {
      "clause_type": "pay_if_paid",
      "severity": "high|medium|low",
      "classification": "pay-if-paid (condition precedent)",
      "exact_quote": "the first 20 words of the actual clause text...",
      "page_reference": "estimated page or section if detectable",
      "plain_english": "What this means for the subcontractor in one sentence",
      "state_note": "Any state-specific enforceability notes if applicable"
    }
  ],
  "overall_risk_level": "high|medium|low",
  "risk_summary": "2-3 sentence summary of the contract's overall risk profile for a subcontractor",
  "risk_score_penalty": 0-30 
}

The risk_score_penalty should be:
- 0-5: Standard/fair contract terms
- 6-15: Moderately aggressive, common in commercial construction  
- 16-25: Very aggressive, multiple high-risk clauses
- 26-30: Extremely aggressive, recommend legal review before bidding

IMPORTANT: If you detect a pay-if-paid clause with "condition precedent" language, ALWAYS classify it as pay-if-paid (not pay-when-paid). This distinction matters legally.

Here is the contract text to analyze:
`;
```

---

## Handling the PDF Extraction Problem

The Turner Form 36 we just analyzed had **custom font encoding** that made standard PDF text extraction fail. Here's how to handle this in BidIntell:

```javascript
async function extractContractText(pdfBuffer) {
  // Step 1: Try standard text extraction
  let text = await extractTextStandard(pdfBuffer);
  
  // Step 2: Check for garbled text (common in Turner, Holder, etc.)
  const garbledRatio = countNonPrintable(text) / text.length;
  
  if (garbledRatio > 0.15) {
    // Text is garbled — fall back to OCR
    console.log('Garbled text detected, falling back to OCR');
    text = await extractTextOCR(pdfBuffer);
  }
  
  // Step 3: Focus on payment/risk sections to save tokens
  const relevantSections = extractRelevantSections(text);
  
  return relevantSections;
}

function extractRelevantSections(text) {
  // These are the sections where risk clauses live
  const sectionKeywords = [
    'payment', 'article iv', 'article v', 'progress payment',
    'final payment', 'indemnif', 'insurance', 'termination',
    'delay', 'change order', 'lien', 'dispute', 'arbitration',
    'liquidated damages', 'retainage', 'condition precedent'
  ];
  
  const lines = text.split('\n');
  const relevant = [];
  let inRelevantSection = false;
  let blankLineCount = 0;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isRelevant = sectionKeywords.some(kw => lower.includes(kw));
    
    if (isRelevant) {
      inRelevantSection = true;
      blankLineCount = 0;
    }
    
    if (inRelevantSection) {
      relevant.push(line);
      if (line.trim() === '') blankLineCount++;
      if (blankLineCount > 3) inRelevantSection = false;
    }
  }
  
  return relevant.join('\n');
}
```

---

## Integration with BidIndex Scoring

In your `calculateScore()` function, apply the risk penalty:

```javascript
function calculateScore(locationScore, keywordScore, gcScore, tradeScore, contractRisks, userRiskTolerance) {
  // Base weighted score
  let baseScore = (locationScore * 0.30) + 
                  (keywordScore * 0.25) + 
                  (gcScore * 0.25) + 
                  (tradeScore * 0.20);
  
  // Apply contract risk penalty scaled by user's risk tolerance
  let riskPenalty = contractRisks.risk_score_penalty || 0;
  
  // Scale penalty by risk tolerance
  // Low tolerance = full penalty, High tolerance = reduced penalty
  const toleranceMultiplier = {
    'low': 1.0,      // Full penalty
    'medium': 0.6,   // 60% of penalty
    'high': 0.3      // 30% of penalty
  };
  
  const scaledPenalty = riskPenalty * (toleranceMultiplier[userRiskTolerance] || 0.6);
  
  return Math.max(0, Math.round(baseScore - scaledPenalty));
}
```

---

## Testing Checklist

Test with these real-world contract types:

| GC | Form | Known Challenges |
|----|------|-----------------|
| Turner | Form 36-III | Custom font encoding, OCR required, aggressive pay-if-paid |
| Holder | Standard Sub Agreement | Long-form, deep indemnification clauses |
| JE Dunn | Standard Form | Moderate terms, typical midwest GC |
| McCarthy | Standard Sub Agreement | Flow-down heavy, LD exposure |
| AIA A401 | Industry Standard | Baseline "fair" contract for comparison |

For each, verify BidIntell correctly detects:
- [ ] Pay-if-paid vs pay-when-paid (classification matters)
- [ ] No-damage-for-delay 
- [ ] Indemnification scope
- [ ] Jury waiver
- [ ] LD exposure
- [ ] Change order notice windows

---

## Claude Code Implementation Notes

When using Claude Code to build this into BidIntell:

1. **The prompt is the product** — Spend time refining the CONTRACT_RISK_PROMPT above. Test it against 5-10 real subcontracts you have access to through FSI.

2. **OCR fallback is non-negotiable** — Major GCs (Turner, Holder, Skanska) frequently use PDFs with custom fonts. Without OCR fallback, you'll miss the most important contracts.

3. **Section extraction saves money** — Don't send 194 pages to Claude. Extract the payment/legal articles (usually 15-20 pages) and send only those.

4. **Store the raw clause text** — When a risk is detected, store the exact quote in `contract_risks` jsonb field. Users need to see WHY something was flagged.

5. **State-aware scoring** — Pay-if-paid is unenforceable in some states (NY, CA). Future enhancement: adjust severity based on project location. Not Phase 1, but design the schema for it now.
