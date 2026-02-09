/**
 * Multi-Signal Trade Detection
 * Uses 4 signals to detect trade scope: CSI headers, drawing prefixes, material keywords, drawing titles
 * Philosophy: Never penalize users just because architects format documents differently
 */

// Drawing sheet prefix patterns (nearly universal across architecture firms)
const DRAWING_PREFIXES = {
    mechanical: ['M-', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'MH-', 'MECH-'],
    electrical: ['E-', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'ELEC-'],
    plumbing: ['P-', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'PLUMB-'],
    fire_protection: ['FP-', 'FP1', 'FP2', 'FP3', 'FP4', 'FP5', 'FIRE-'],
    telecom: ['T-', 'T1', 'T2', 'TC-', 'TELECOM-', 'DATA-'],
    fire_alarm: ['FA-', 'FA1', 'FA2', 'FA3', 'ALARM-'],
    structural: ['S-', 'S1', 'S2', 'S3', 'STRUCT-'],
    architectural: ['A-', 'A1', 'A2', 'A3', 'ARCH-']
};

// Map drawing prefixes to CSI divisions
const PREFIX_TO_CSI = {
    mechanical: ['23'],           // HVAC
    electrical: ['26'],           // Electrical
    plumbing: ['22'],             // Plumbing
    fire_protection: ['21'],      // Fire Suppression
    telecom: ['27', '28'],        // Communications, Electronic Safety
    fire_alarm: ['28'],           // Electronic Safety & Security
    structural: ['05', '03'],     // Metals, Concrete
    architectural: ['06', '07', '08', '09'] // Multiple finishes
};

// Material evidence keywords by trade (minimum 3 matches = 80% confidence)
const MATERIAL_KEYWORDS = {
    '23': { // HVAC/Mechanical
        keywords: ['ductwork', 'air handler', 'chiller', 'VAV', 'RTU', 'boiler', 'AHU', 'diffuser',
                   'damper', 'refrigerant piping', 'split system', 'exhaust fan', 'cooling tower',
                   'heat pump', 'FCU', 'fan coil', 'makeup air', 'economizer'],
        threshold: 3
    },
    '26': { // Electrical
        keywords: ['panelboard', 'switchgear', 'conduit', 'receptacle', 'circuit breaker', 'transformer',
                   'bus duct', 'motor control center', 'lighting fixture', 'disconnect', 'wire', 'raceway',
                   'junction box', 'cable tray', 'feeder', 'branch circuit'],
        threshold: 3
    },
    '22': { // Plumbing
        keywords: ['domestic water', 'sanitary', 'storm drain', 'water heater', 'backflow preventer',
                   'fixture schedule', 'roof drain', 'sewer', 'lavatory', 'water closet', 'urinal',
                   'drinking fountain', 'grease trap', 'ejector pump'],
        threshold: 3
    },
    '21': { // Fire Protection
        keywords: ['sprinkler', 'standpipe', 'fire pump', 'wet system', 'dry system', 'NFPA 13',
                   'sprinkler head', 'fire department connection', 'FDC', 'siamese', 'fire riser'],
        threshold: 3
    },
    '27': { // Low Voltage/Data
        keywords: ['data cable', 'fiber optic', 'access control', 'CCTV', 'cat6', 'patch panel',
                   'network rack', 'intercom', 'PA system', 'structured cabling'],
        threshold: 3
    },
    '28': { // Fire Alarm
        keywords: ['fire alarm panel', 'pull station', 'smoke detector', 'heat detector',
                   'notification device', 'horn strobe', 'FACP', 'addressable'],
        threshold: 2
    },
    '09': { // Finishes
        keywords: ['carpet', 'LVT', 'paint', 'drywall', 'ACT ceiling', 'flooring', 'tile',
                   'wallcovering', 'epoxy', 'rubber base', 'vinyl composition'],
        threshold: 3
    }
};

/**
 * Detect drawing sheet prefixes in document text
 * @param {Array} pages - PDF pages with text
 * @returns {Object} Detected prefixes by trade
 */
function detectDrawingPrefixes(pages) {
    const found = {};
    const allText = pages.map(p => p.text).join('\n');

    for (const [trade, prefixes] of Object.entries(DRAWING_PREFIXES)) {
        const matches = [];
        for (const prefix of prefixes) {
            // Look for prefix in drawing lists, sheet titles, headers
            const regex = new RegExp(`\\b${prefix.replace('-', '[-\\s]?')}`, 'gi');
            const matchCount = (allText.match(regex) || []).length;
            if (matchCount > 0) {
                matches.push({ prefix, count: matchCount });
            }
        }

        if (matches.length > 0) {
            found[trade] = {
                prefixes: matches,
                confidence: 0.95,
                signal: 'drawing_prefix',
                csi_divisions: PREFIX_TO_CSI[trade] || []
            };
        }
    }

    return found;
}

/**
 * Detect material evidence keywords
 * @param {Array} pages - PDF pages with text
 * @param {Array<string>} userDivisions - User's CSI divisions
 * @returns {Object} Material evidence by division
 */
function detectMaterialEvidence(pages, userDivisions) {
    const found = {};
    const allText = pages.map(p => p.text).join('\n').toLowerCase();

    for (const division of userDivisions) {
        const materialData = MATERIAL_KEYWORDS[division];
        if (!materialData) continue;

        const matchedKeywords = [];
        for (const keyword of materialData.keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(allText)) {
                matchedKeywords.push(keyword);
            }
        }

        if (matchedKeywords.length >= materialData.threshold) {
            found[division] = {
                keywords: matchedKeywords,
                count: matchedKeywords.length,
                confidence: 0.80,
                signal: 'material_evidence'
            };
        }
    }

    return found;
}

/**
 * Detect trade references in drawing titles
 * @param {Array} pages - PDF pages with text
 * @returns {Object} Trade references found in titles
 */
function detectDrawingTitles(pages) {
    const found = {};
    const allText = pages.map(p => p.text).join('\n');

    const tradePatterns = {
        '23': ['HVAC PLAN', 'MECHANICAL PLAN', 'HEATING PLAN', 'COOLING PLAN', 'VENTILATION'],
        '26': ['ELECTRICAL PLAN', 'POWER PLAN', 'LIGHTING PLAN', 'ELECTRICAL RISER'],
        '22': ['PLUMBING PLAN', 'PLUMBING RISER', 'DOMESTIC WATER', 'SANITARY PLAN'],
        '21': ['FIRE PROTECTION PLAN', 'SPRINKLER PLAN', 'FIRE SUPPRESSION'],
        '27': ['DATA PLAN', 'TELECOM PLAN', 'COMMUNICATIONS PLAN'],
        '28': ['FIRE ALARM PLAN', 'ALARM FLOOR PLAN']
    };

    for (const [division, patterns] of Object.entries(tradePatterns)) {
        const matches = [];
        for (const pattern of patterns) {
            const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
            if (regex.test(allText)) {
                matches.push(pattern);
            }
        }

        if (matches.length > 0) {
            found[division] = {
                titles: matches,
                confidence: 0.85,
                signal: 'drawing_title'
            };
        }
    }

    return found;
}

/**
 * Multi-signal trade detection - combines all 4 signals
 * @param {Array} pages - PDF pages
 * @param {Array<string>} userDivisions - User's CSI divisions
 * @param {Array<string>} foundCSIDivisions - CSI divisions found in specs (Signal 1)
 * @returns {Object} Combined trade detection results
 */
function detectTradesMultiSignal(pages, userDivisions, foundCSIDivisions = []) {
    console.log('🔍 Multi-signal trade detection starting...');
    console.log('  User divisions:', userDivisions);
    console.log('  CSI divisions found:', foundCSIDivisions);

    const results = {
        matches: [],
        signals_used: [],
        highest_confidence: 0
    };

    // Signal 1: CSI Division Headers (existing, 100% confidence)
    const csiMatches = userDivisions.filter(div => foundCSIDivisions.includes(div));
    if (csiMatches.length > 0) {
        results.matches.push(...csiMatches.map(div => ({
            division: div,
            confidence: 1.00,
            signal: 'csi_header',
            source: 'Specification section headers'
        })));
        results.signals_used.push('CSI Headers');
        results.highest_confidence = 1.00;
    }

    // Signal 2: Drawing Sheet Prefixes (95% confidence)
    const prefixResults = detectDrawingPrefixes(pages);
    for (const [trade, data] of Object.entries(prefixResults)) {
        const matchingDivisions = data.csi_divisions.filter(div => userDivisions.includes(div));
        if (matchingDivisions.length > 0) {
            results.matches.push(...matchingDivisions.map(div => ({
                division: div,
                confidence: data.confidence,
                signal: data.signal,
                source: `Drawing sheets: ${data.prefixes.map(p => p.prefix).join(', ')}`
            })));
            results.signals_used.push('Drawing Prefixes');
            if (data.confidence > results.highest_confidence) {
                results.highest_confidence = data.confidence;
            }
        }
    }

    // Signal 3: Material Evidence Keywords (80% confidence)
    const materialResults = detectMaterialEvidence(pages, userDivisions);
    for (const [division, data] of Object.entries(materialResults)) {
        // Only add if not already matched by higher confidence signal
        const alreadyMatched = results.matches.some(m => m.division === division);
        if (!alreadyMatched) {
            results.matches.push({
                division,
                confidence: data.confidence,
                signal: data.signal,
                source: `Material keywords: ${data.keywords.slice(0, 5).join(', ')}${data.keywords.length > 5 ? '...' : ''}`
            });
            results.signals_used.push('Material Evidence');
            if (data.confidence > results.highest_confidence) {
                results.highest_confidence = data.confidence;
            }
        }
    }

    // Signal 4: Drawing Titles (85% confidence)
    const titleResults = detectDrawingTitles(pages);
    for (const [division, data] of Object.entries(titleResults)) {
        const alreadyMatched = results.matches.some(m => m.division === division);
        if (!alreadyMatched && userDivisions.includes(division)) {
            results.matches.push({
                division,
                confidence: data.confidence,
                signal: data.signal,
                source: `Drawing titles: ${data.titles.join(', ')}`
            });
            results.signals_used.push('Drawing Titles');
            if (data.confidence > results.highest_confidence) {
                results.highest_confidence = data.confidence;
            }
        }
    }

    // Remove duplicates, keep highest confidence for each division
    const uniqueMatches = {};
    for (const match of results.matches) {
        if (!uniqueMatches[match.division] || match.confidence > uniqueMatches[match.division].confidence) {
            uniqueMatches[match.division] = match;
        }
    }
    results.matches = Object.values(uniqueMatches);

    // Remove duplicate signal names
    results.signals_used = [...new Set(results.signals_used)];

    console.log('✅ Multi-signal trade detection complete');
    console.log('  Matches found:', results.matches.length);
    console.log('  Signals used:', results.signals_used);
    console.log('  Highest confidence:', results.highest_confidence);

    return results;
}

/**
 * Calculate trade match score using multi-signal detection
 * @param {Array} pages - PDF pages
 * @param {Array<string>} userDivisions - User's CSI divisions
 * @param {Array<string>} foundCSIDivisions - CSI divisions from specs
 * @returns {Object} Trade match score and details
 */
function calculateTradeMatchScore(pages, userDivisions, foundCSIDivisions = []) {
    if (!userDivisions || userDivisions.length === 0) {
        return {
            score: 50,
            reason: 'Add your trades in Settings to enable trade matching',
            details: { found: [], signals: [] }
        };
    }

    const detection = detectTradesMultiSignal(pages, userDivisions, foundCSIDivisions);

    if (detection.matches.length === 0) {
        return {
            score: 0,
            reason: `None of your divisions found in documents. Verify your trade is included in this project.`,
            details: { found: [], signals: detection.signals_used }
        };
    }

    // Calculate score as percentage of user's divisions matched
    const matchPercentage = detection.matches.length / userDivisions.length;
    const score = Math.round(matchPercentage * 100);

    // Generate reason text based on signals used
    let reason = '';
    if (detection.signals_used.includes('CSI Headers')) {
        reason = `Your divisions found in specification headers`;
    } else if (detection.signals_used.includes('Drawing Prefixes')) {
        reason = `Trade scope confirmed via drawing sheets (${detection.matches.map(m => m.source.split(':')[1]?.trim() || '').filter(Boolean).join(', ')})`;
    } else if (detection.signals_used.includes('Material Evidence')) {
        reason = `Trade scope confirmed via material evidence (${detection.matches.length} division${detection.matches.length > 1 ? 's' : ''})`;
    } else {
        reason = `Trade scope confirmed via ${detection.signals_used[0]}`;
    }

    return {
        score,
        reason,
        details: {
            found: detection.matches.map(m => m.division),
            signals: detection.signals_used,
            highest_confidence: detection.highest_confidence,
            matches: detection.matches
        }
    };
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectDrawingPrefixes,
        detectMaterialEvidence,
        detectDrawingTitles,
        detectTradesMultiSignal,
        calculateTradeMatchScore
    };
}
