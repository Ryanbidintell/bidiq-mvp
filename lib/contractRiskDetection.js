// ============================================
// AI Contract Risk Detection Module
// Automatic detection of risky contract clauses
// BidIntell Phase 1 Core Differentiator
// ============================================

/**
 * Detects risky contract clauses using AI
 * Returns structured risk assessment with confidence scores
 */
async function detectContractRisks(documentText, claudeAPIKey) {
    const prompt = `You are a construction contract risk analyzer. Analyze this document for risky contract clauses.

CRITICAL RISK CLAUSES TO DETECT:

1. **Pay-if-paid / Pay-when-paid**
   - Subcontractor only gets paid if owner pays GC
   - Look for: "pay if paid", "pay when paid", "contingent upon receipt"

2. **Liquidated Damages**
   - Fixed daily damages for delays
   - Look for: "liquidated damages", "daily damages", "penalty for delay"

3. **Broad Indemnification**
   - Sub must defend/indemnify GC even for GC's negligence
   - Look for: "indemnify", "hold harmless", "defend against"

4. **No Damages for Delay**
   - Sub can't recover costs for project delays
   - Look for: "no damages for delay", "time extensions only", "no compensation for delay"

5. **Waiver of Consequential Damages**
   - Excessive waivers beyond industry standard
   - Look for: "waive consequential damages", "no indirect damages"

6. **High Retainage**
   - Retainage over 10%
   - Look for: "retainage", "retention", percentages > 10%

7. **Pay Application Terms**
   - Payment timeline > 45 days
   - Look for: "within X days", "net 60", "net 90"

8. **Termination for Convenience**
   - GC can terminate without cause
   - Look for: "terminate for convenience", "terminate at will"

9. **Warranty Period**
   - Excessive warranty (> 2 years)
   - Look for: "warranty period", "guarantee period"

10. **Insurance Requirements**
    - Excessive or unusual insurance requirements
    - Look for: "insurance", "coverage limits", specific dollar amounts

DOCUMENT TEXT:
${documentText.substring(0, 40000)}

Return ONLY a valid JSON object:
{
  "hasContractLanguage": true/false,
  "overallRiskLevel": "low|medium|high",
  "risksDetected": [
    {
      "type": "pay_if_paid|liquidated_damages|indemnification|no_damages_delay|consequential_waiver|high_retainage|slow_payment|termination_convenience|excessive_warranty|insurance_requirements",
      "severity": "low|medium|high",
      "confidence": 0.0-1.0,
      "excerpt": "exact text found (max 200 chars)",
      "explanation": "why this is risky (1 sentence)"
    }
  ],
  "totalRiskScore": 0-100
}

If no contract language found, return {"hasContractLanguage": false, "risksDetected": [], "totalRiskScore": 0}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeAPIKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            console.error('Contract risk detection API error:', response.status);
            return getDefaultRiskResult();
        }

        const data = await response.json();
        const content = data.content[0]?.text || '{}';

        // Parse JSON from response
        let jsonStr = content;
        if (content.includes('```')) {
            const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) jsonStr = match[1];
        }

        const result = JSON.parse(jsonStr.trim());
        console.log('Contract risk detection result:', result);

        return result;
    } catch (e) {
        console.error('Contract risk detection failed:', e);
        return getDefaultRiskResult();
    }
}

/**
 * Returns default result when AI detection fails
 */
function getDefaultRiskResult() {
    return {
        hasContractLanguage: false,
        overallRiskLevel: 'unknown',
        risksDetected: [],
        totalRiskScore: 0,
        error: 'AI detection unavailable'
    };
}

/**
 * Calculates penalty to apply to Keywords & Contract score based on risks
 * Respects user's risk tolerance setting
 */
function calculateContractRiskPenalty(risks, riskTolerance) {
    if (!risks || !risks.risksDetected || risks.risksDetected.length === 0) {
        return 0;
    }

    // Base penalty per risk by severity
    const severityPenalties = {
        high: 15,
        medium: 10,
        low: 5
    };

    // Risk tolerance multipliers
    const toleranceMultipliers = {
        low: 1.5,    // Low tolerance = higher penalties
        medium: 1.0,  // Medium = standard penalties
        high: 0.6     // High tolerance = lower penalties
    };

    const multiplier = toleranceMultipliers[riskTolerance] || 1.0;
    let totalPenalty = 0;

    risks.risksDetected.forEach(risk => {
        const basePenalty = severityPenalties[risk.severity] || 10;
        const confidenceWeight = risk.confidence || 1.0;
        totalPenalty += basePenalty * confidenceWeight * multiplier;
    });

    return Math.round(totalPenalty);
}

/**
 * Formats contract risks for display in bid analysis report
 */
function formatContractRisksForDisplay(risks) {
    if (!risks || !risks.hasContractLanguage || risks.risksDetected.length === 0) {
        return {
            html: '<div style="color:var(--text-muted);font-size:13px;">No contract language detected in bid documents</div>',
            hasRisks: false
        };
    }

    const riskIcons = {
        high: '🔴',
        medium: '🟠',
        low: '🟡'
    };

    const riskLabels = {
        pay_if_paid: 'Pay-if-Paid Clause',
        liquidated_damages: 'Liquidated Damages',
        indemnification: 'Broad Indemnification',
        no_damages_delay: 'No Damages for Delay',
        consequential_waiver: 'Consequential Damages Waiver',
        high_retainage: 'High Retainage',
        slow_payment: 'Slow Payment Terms',
        termination_convenience: 'Termination for Convenience',
        excessive_warranty: 'Excessive Warranty Period',
        insurance_requirements: 'High Insurance Requirements'
    };

    const riskLevel = risks.overallRiskLevel || 'unknown';
    const borderColor = riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : riskLevel === 'unknown' ? 'text-muted' : 'info';
    let html = `
        <div style="margin-top:16px;padding:16px;background:var(--bg-secondary);border-radius:8px;border-left:4px solid var(--${borderColor});">
            <div style="font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
                <span>⚠️ Contract Risks Detected (${risks.risksDetected.length})</span>
                <span style="font-size:11px;padding:2px 8px;background:var(--bg-tertiary);border-radius:4px;">Overall: ${riskLevel.toUpperCase()}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
                These clauses may increase project risk. Review carefully before bidding.
            </div>
    `;

    risks.risksDetected.forEach(risk => {
        const icon = riskIcons[risk.severity] || '⚪';
        const label = riskLabels[risk.type] || risk.type;
        const confidence = Math.round(risk.confidence * 100);

        html += `
            <div style="margin-bottom:12px;padding:12px;background:var(--bg-tertiary);border-radius:6px;">
                <div style="display:flex;align-items:start;gap:8px;">
                    <span style="font-size:16px;">${icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:13px;margin-bottom:4px;">
                            ${label}
                            <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(${confidence}% confidence)</span>
                        </div>
                        <div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-bottom:6px;">
                            "${risk.excerpt}"
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);">
                            ${risk.explanation}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    return {
        html,
        hasRisks: true,
        riskCount: risks.risksDetected.length,
        severity: risks.overallRiskLevel
    };
}

// Export functions for use in app.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectContractRisks,
        calculateContractRiskPenalty,
        formatContractRisksForDisplay
    };
}
