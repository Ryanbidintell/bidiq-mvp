/**
 * Product Match Scoring for Distributors and Manufacturer Reps
 * Replaces Trade Match component for non-subcontractor users
 *
 * Scores based on whether user's brands/products are specified in the bid documents
 */

/**
 * Analyze product specifications in bid documents
 * @param {string} documentText - Full text from all PDFs
 * @param {Array<string>} userProductLines - User's brands/product lines
 * @param {Array<string>} userCategories - User's product categories
 * @param {string} claudeAPIKey - Claude API key for AI analysis
 * @returns {Object} Product match analysis with score and details
 */
async function analyzeProductMatch(documentText, userProductLines, userCategories, claudeAPIKey) {
    if (!userProductLines || userProductLines.length === 0) {
        return {
            score: 50,
            status: 'not_configured',
            details: [],
            reason: 'Add your product lines in Settings to enable product matching'
        };
    }

    console.log('🏷️ Analyzing product specifications...');
    console.log('  User product lines:', userProductLines);
    console.log('  User categories:', userCategories);

    // Use Claude API to find product specifications
    const prompt = `You are analyzing construction bid specifications to identify product requirements.

USER'S PRODUCT LINES/BRANDS: ${userProductLines.join(', ')}
USER'S CATEGORIES: ${userCategories?.join(', ') || 'Not specified'}

Analyze the specifications and identify the status of each user product line. Return ONLY a valid JSON array:

[
  {
    "product_line": "Brand name from user's list",
    "category": "Product category (e.g., Electrical Equipment, Lighting, HVAC)",
    "status": "specified" | "approved_equal" | "or_equal" | "competitor" | "not_mentioned",
    "location": "Spec section and page where found (e.g., 'Section 26 24 16, Page 47')",
    "context": "Brief quote from spec showing how product was mentioned",
    "confidence": 0.0-1.0
  }
]

STATUS DEFINITIONS:
- "specified": User's exact brand is the primary specification (e.g., "Eaton panelboards shall be provided")
- "approved_equal": User's brand is listed as an approved alternate (e.g., "Square D or approved equal: Eaton, Siemens")
- "or_equal": Spec says "or approved equal" but user's brand not listed (opportunity to submit)
- "competitor": A competing brand is specified with no alternates mentioned
- "not_mentioned": No product specification found for this category yet

RULES:
- Only analyze products in user's categories
- Be precise about specification language
- Include page numbers when possible
- Return empty array [] if no relevant specifications found

Here is the specification text:

${documentText.substring(0, 50000)}`;

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
            throw new Error('Claude API error: ' + response.status);
        }

        const data = await response.json();
        const content = data.content[0]?.text || '[]';

        // Parse JSON response
        let jsonStr = content;
        if (content.includes('```')) {
            const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) jsonStr = match[1];
        }

        const findings = JSON.parse(jsonStr.trim());
        console.log('✅ Product analysis complete:', findings);

        // Calculate score based on findings
        return calculateProductMatchScore(findings, userProductLines);

    } catch (error) {
        console.error('❌ Product match analysis error:', error);
        return {
            score: 50,
            status: 'error',
            details: [],
            reason: 'Could not analyze product specifications. Check documents for product callouts.'
        };
    }
}

/**
 * Calculate product match score from findings
 * @param {Array} findings - Product specification findings
 * @param {Array<string>} userProductLines - User's product lines
 * @returns {Object} Score and analysis
 */
function calculateProductMatchScore(findings, userProductLines) {
    if (!findings || findings.length === 0) {
        return {
            score: 50,
            status: 'not_mentioned',
            details: [],
            reason: 'No product specifications found in documents. Specifications may not be finalized yet.'
        };
    }

    // Score each finding
    const statusScores = {
        'specified': 100,
        'approved_equal': 85,
        'or_equal': 70,
        'competitor': 30,
        'not_mentioned': 50
    };

    let totalScore = 0;
    let totalWeight = 0;

    findings.forEach(finding => {
        const score = statusScores[finding.status] || 50;
        const weight = finding.confidence || 1.0;
        totalScore += score * weight;
        totalWeight += weight;
    });

    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

    // Generate reason text
    const specified = findings.filter(f => f.status === 'specified');
    const approvedEqual = findings.filter(f => f.status === 'approved_equal');
    const orEqual = findings.filter(f => f.status === 'or_equal');
    const competitor = findings.filter(f => f.status === 'competitor');

    let reason = '';
    if (specified.length > 0) {
        reason = `Your products are SPECIFIED: ${specified.map(f => f.product_line).join(', ')}`;
    } else if (approvedEqual.length > 0) {
        reason = `Your products are approved alternates: ${approvedEqual.map(f => f.product_line).join(', ')}`;
    } else if (orEqual.length > 0) {
        reason = `"Or equal" opportunity - your products may qualify`;
    } else if (competitor.length > 0) {
        reason = `Competing brands specified: ${competitor.map(f => f.context?.split(' ')[0] || 'Unknown').join(', ')}`;
    } else {
        reason = 'Product specifications not yet determined';
    }

    return {
        score: finalScore,
        status: specified.length > 0 ? 'specified' :
                approvedEqual.length > 0 ? 'approved_equal' :
                orEqual.length > 0 ? 'or_equal' :
                competitor.length > 0 ? 'competitor' : 'not_mentioned',
        details: findings,
        reason: reason,
        breakdown: {
            specified: specified.length,
            approved_equal: approvedEqual.length,
            or_equal: orEqual.length,
            competitor: competitor.length,
            not_mentioned: findings.filter(f => f.status === 'not_mentioned').length
        }
    };
}

/**
 * Format product match results for display
 * @param {Object} productMatch - Product match analysis result
 * @returns {string} HTML formatted display
 */
function formatProductMatchDisplay(productMatch) {
    if (!productMatch || !productMatch.details || productMatch.details.length === 0) {
        return `<div style="color:var(--text-muted);font-size:13px;">No product specifications found in documents.</div>`;
    }

    const specified = productMatch.details.filter(f => f.status === 'specified');
    const approvedEqual = productMatch.details.filter(f => f.status === 'approved_equal');
    const orEqual = productMatch.details.filter(f => f.status === 'or_equal');
    const competitor = productMatch.details.filter(f => f.status === 'competitor');

    let html = '<div class="product-match-details" style="margin-top:12px;">';

    if (specified.length > 0) {
        html += '<div style="margin-bottom:8px;"><strong style="color:var(--success)">✅ YOUR PRODUCTS SPECIFIED:</strong></div>';
        specified.forEach(item => {
            html += `<div style="margin-bottom:6px;padding:8px;background:var(--success-bg);border-radius:4px;font-size:12px;">
                <strong>${item.product_line}</strong> ${item.category ? `(${item.category})` : ''}
                <br><span style="color:var(--text-muted)">${item.location || 'Location not specified'}</span>
                ${item.context ? `<br><em style="font-size:11px;">"${item.context.substring(0, 100)}..."</em>` : ''}
            </div>`;
        });
    }

    if (approvedEqual.length > 0) {
        html += '<div style="margin:12px 0 8px;"><strong style="color:var(--success)">✅ APPROVED AS ALTERNATE:</strong></div>';
        approvedEqual.forEach(item => {
            html += `<div style="margin-bottom:6px;padding:8px;background:var(--success-bg);border-radius:4px;font-size:12px;">
                <strong>${item.product_line}</strong> ${item.category ? `(${item.category})` : ''}
                <br><span style="color:var(--text-muted)">${item.location || 'Location not specified'}</span>
            </div>`;
        });
    }

    if (orEqual.length > 0) {
        html += '<div style="margin:12px 0 8px;"><strong style="color:var(--warning)">⚠️ "OR EQUAL" OPPORTUNITY:</strong></div>';
        orEqual.forEach(item => {
            html += `<div style="margin-bottom:6px;padding:8px;background:var(--warning-bg);border-radius:4px;font-size:12px;">
                ${item.context || 'Spec allows approved equals - your products may qualify'}
                <br><span style="color:var(--text-muted)">${item.location || ''}</span>
            </div>`;
        });
    }

    if (competitor.length > 0) {
        html += '<div style="margin:12px 0 8px;"><strong style="color:var(--danger)">❌ COMPETING BRANDS SPECIFIED:</strong></div>';
        competitor.forEach(item => {
            html += `<div style="margin-bottom:6px;padding:8px;background:var(--danger-bg);border-radius:4px;font-size:12px;">
                ${item.context || `Competitor specified for ${item.category}`}
                <br><span style="color:var(--text-muted)">${item.location || ''}</span>
            </div>`;
        });
    }

    html += '</div>';
    return html;
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeProductMatch,
        calculateProductMatchScore,
        formatProductMatchDisplay
    };
}
