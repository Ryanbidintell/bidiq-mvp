// ============================================
// Building Type Extraction Module
// AI classification of building/project types
// Required for Layer 0 Market Intelligence
// ============================================

/**
 * Building type categories for market intelligence
 */
const BUILDING_TYPES = {
    HOSPITAL: {
        label: 'Hospital / Healthcare',
        keywords: ['hospital', 'medical center', 'clinic', 'healthcare', 'surgery center', 'urgent care', 'patient care'],
        icon: '🏥'
    },
    OFFICE: {
        label: 'Office Building',
        keywords: ['office', 'corporate', 'headquarters', 'business park', 'professional building', 'tenant improvement', 'commercial office', 'office space', 'office tower', 'office complex', 'suite', 'executive', 'administration building'],
        icon: '🏢'
    },
    MULTIFAMILY: {
        label: 'Multifamily Residential',
        keywords: ['apartment', 'multifamily', 'residential', 'housing', 'condo', 'townhome', 'senior living'],
        icon: '🏘️'
    },
    RETAIL: {
        label: 'Retail / Restaurant',
        keywords: ['retail', 'shopping', 'restaurant', 'store', 'mall', 'plaza', 'food service', 'grocery'],
        icon: '🏬'
    },
    INDUSTRIAL: {
        label: 'Industrial / Warehouse',
        keywords: ['warehouse', 'industrial', 'manufacturing', 'distribution', 'logistics', 'plant', 'facility'],
        icon: '🏭'
    },
    EDUCATION: {
        label: 'Education',
        keywords: ['school', 'university', 'college', 'education', 'classroom', 'campus', 'student center', 'library'],
        icon: '🎓'
    },
    HOSPITALITY: {
        label: 'Hospitality',
        keywords: ['hotel', 'motel', 'resort', 'hospitality', 'conference center', 'lodging'],
        icon: '🏨'
    },
    GOVERNMENT: {
        label: 'Government / Municipal',
        keywords: ['government', 'municipal', 'city hall', 'courthouse', 'police', 'fire station', 'public works'],
        icon: '🏛️'
    },
    INFRASTRUCTURE: {
        label: 'Infrastructure / Utilities',
        keywords: ['infrastructure', 'utility', 'water treatment', 'wastewater', 'power plant', 'substation', 'bridge'],
        icon: '🚧'
    },
    OTHER: {
        label: 'Other / Mixed-Use',
        keywords: [],
        icon: '🏗️'
    }
};

/**
 * Extracts building type from project documents using AI + keyword matching
 */
async function extractBuildingType(projectName, scopeSummary, documentText, claudeAPIKey) {
    // First try fast keyword matching
    const keywordMatch = matchBuildingTypeByKeywords(projectName, scopeSummary);

    // FIX BUG 3: Lower confidence threshold from 0.7 to 0.5 for better keyword detection
    // If we have a strong keyword match, use it without calling AI
    if (keywordMatch && keywordMatch.confidence > 0.5) {
        console.log('✅ Building type from keywords:', keywordMatch);
        return keywordMatch;
    }

    // Fallback to AI classification for ambiguous cases
    console.log('🤖 Building type confidence low, using AI classification...');
    return await classifyBuildingTypeWithAI(projectName, scopeSummary, documentText, claudeAPIKey);
}

/**
 * Fast keyword-based building type matching
 */
function matchBuildingTypeByKeywords(projectName, scopeSummary) {
    const text = `${projectName} ${scopeSummary}`.toLowerCase();

    // FIX BUG 3: Improved keyword matching with better confidence calculation
    let bestMatch = null;
    let highestScore = 0;

    Object.entries(BUILDING_TYPES).forEach(([key, type]) => {
        if (key === 'OTHER') return;

        const matchCount = type.keywords.filter(keyword =>
            text.includes(keyword.toLowerCase())
        ).length;

        if (matchCount > highestScore) {
            highestScore = matchCount;

            // Better confidence calculation:
            // 1 match = 0.6 confidence
            // 2 matches = 0.8 confidence
            // 3+ matches = 0.95 confidence
            let confidence = 0.3;
            if (matchCount === 1) confidence = 0.6;
            else if (matchCount === 2) confidence = 0.8;
            else if (matchCount >= 3) confidence = 0.95;

            bestMatch = {
                type: key.toLowerCase(),
                label: type.label,
                icon: type.icon,
                confidence,
                method: 'keyword',
                matchedKeywords: matchCount
            };
        }
    });

    if (bestMatch) {
        return bestMatch;
    }

    // Default to OTHER if no matches
    return {
        type: 'other',
        label: BUILDING_TYPES.OTHER.label,
        icon: BUILDING_TYPES.OTHER.icon,
        confidence: 0.2,
        method: 'default'
    };
}

/**
 * AI-powered building type classification for ambiguous cases
 */
async function classifyBuildingTypeWithAI(projectName, scopeSummary, documentText, claudeAPIKey) {
    const prompt = `You are a construction project classifier. Based on the project information below, classify the building/project type.

PROJECT NAME: ${projectName}

SCOPE SUMMARY: ${scopeSummary || 'Not provided'}

DOCUMENT EXCERPT: ${documentText.substring(0, 5000)}

AVAILABLE CATEGORIES:
- hospital: Hospital, medical center, healthcare facility, clinic
- office: Office building, corporate headquarters, business park
- multifamily: Apartment, condo, residential housing, senior living
- retail: Retail store, shopping center, restaurant, food service
- industrial: Warehouse, manufacturing, distribution, logistics facility
- education: School, university, college, library, student center
- hospitality: Hotel, motel, resort, conference center
- government: Government building, municipal facility, courthouse, public safety
- infrastructure: Utility, water/wastewater treatment, bridge, roadway
- other: Mixed-use or doesn't fit other categories

Return ONLY a valid JSON object:
{
  "type": "hospital|office|multifamily|retail|industrial|education|hospitality|government|infrastructure|other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation (1 sentence)"
}`;

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
                max_tokens: 512,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            console.error('Building type classification API error:', response.status);
            return getDefaultBuildingType();
        }

        const data = await response.json();
        const content = data.content[0]?.text || '{}';

        // Parse JSON
        let jsonStr = content;
        if (content.includes('```')) {
            const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) jsonStr = match[1];
        }

        const result = JSON.parse(jsonStr.trim());

        // Find matching type label and icon
        const typeKey = result.type.toUpperCase();
        const typeInfo = BUILDING_TYPES[typeKey] || BUILDING_TYPES.OTHER;

        return {
            type: result.type,
            label: typeInfo.label,
            icon: typeInfo.icon,
            confidence: result.confidence,
            reasoning: result.reasoning,
            method: 'ai'
        };
    } catch (e) {
        console.error('Building type classification failed:', e);
        return getDefaultBuildingType();
    }
}

/**
 * Returns default building type when classification fails
 */
function getDefaultBuildingType() {
    return {
        type: 'other',
        label: BUILDING_TYPES.OTHER.label,
        icon: BUILDING_TYPES.OTHER.icon,
        confidence: 0.2,
        method: 'fallback'
    };
}

/**
 * Formats building type for display in bid analysis
 */
function formatBuildingTypeForDisplay(buildingType) {
    if (!buildingType || !buildingType.type) {
        return '<span style="color:var(--text-muted);">Unknown</span>';
    }

    const confidence = Math.round((buildingType.confidence || 0) * 100);
    const confidenceColor = confidence > 80 ? 'var(--success)' : confidence > 50 ? 'var(--warning)' : 'var(--text-muted)';

    let html = `
        <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:var(--bg-secondary);border-radius:6px;">
            <span style="font-size:16px;">${buildingType.icon || '🏗️'}</span>
            <span style="font-weight:600;font-size:13px;">${buildingType.label}</span>
    `;

    if (buildingType.confidence) {
        html += `<span style="font-size:11px;color:${confidenceColor};">(${confidence}%)</span>`;
    }

    html += `</div>`;

    if (buildingType.reasoning && buildingType.method === 'ai') {
        html += `
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-style:italic;">
                ${buildingType.reasoning}
            </div>
        `;
    }

    return html;
}

/**
 * Gets market intelligence based on building type
 * (Placeholder for Layer 2 features)
 */
function getBuildingTypeMarketInsights(buildingType, userTrades) {
    // Future: Return market-specific insights
    // e.g., "Hospital projects in your area have 62% win rate for electrical trades"
    return null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractBuildingType,
        matchBuildingTypeByKeywords,
        classifyBuildingTypeWithAI,
        formatBuildingTypeForDisplay,
        BUILDING_TYPES
    };
}
