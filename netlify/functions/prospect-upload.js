// Prospect Upload - Netlify HTTP Function
// POST /api/prospect-upload
// Body: {
//   prospects: [{
//     company_name, owner_email,
//     trade?, geography?, estimated_revenue?, owner_name?,
//     title?,           // not stored, used for ICP gate
//     industry?         // not stored, used for ICP gate
//   }],
//   override_icp_gate?: boolean   // admin-only escape hatch; logs but still surfaces rejections
// }
// Admin-only: requires valid Supabase session token for ryan@bidintell.ai or ryan@fsikc.com

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------- ICP gate (BID-142) ----------
// Our ICP: owner / president at a $2M–$20M specialty subcontractor.
// Anyone whose customers we sell to (mega-GCs / EPCs) must be rejected,
// regardless of how clean the row looks. Ryan reviews rejections and can
// pass override_icp_gate=true on a follow-up call if any are intentional.

// GC / EPC tier company-name keywords. Matched case-insensitive on company_name.
// Keep entries here as substrings — single words like "Walsh" can false-positive,
// so prefer multi-word fragments where possible.
const GC_TIER_COMPANY_KEYWORDS = [
    'kiewit',
    'bechtel',
    'skanska',
    'turner construction',
    'suffolk construction',
    'whiting-turner', 'whiting turner',
    'clark construction',
    'mccarthy building', 'mccarthy holdings',
    'hensel phelps',
    'dpr construction',
    'aecom',
    'jacobs engineering', 'jacobs solutions',
    'fluor',
    'black & veatch', 'black and veatch',
    'burns & mcdonnell', 'burns and mcdonnell',
    'je dunn', 'j.e. dunn', 'j. e. dunn',
    'manhattan construction',
    'mccown gordon', 'mccowngordon',
    'the weitz company', 'weitz company',
    'mortenson construction',
    'walsh construction', 'walsh group',
    'brasfield & gorrie', 'brasfield and gorrie',
    'holder construction',
    'balfour beatty',
    'hoar construction',
    // From actual paused list — also GCs, not specialty subs:
    'structure tone',
    'hathaway dinwiddie',
    'h. j. russell', 'h.j. russell', 'hj russell',
    'deangelis diamond',
    'tellepsen',
    'rodgers builders',
    'stalco construction',
    'delphi construction',
    'sampson construction'
];

// Email domains we reject outright. Owner_email is split on '@'.
const GC_TIER_DOMAINS = new Set([
    'kiewit.com',
    'bechtel.com',
    'skanska.com',
    'tcco.com',                 // Turner
    'suffolk.com',
    'whiting-turner.com',
    'clarkconstruction.com',
    'mccarthy.com',
    'henselphelps.com',
    'dpr.com',
    'aecom.com',
    'jacobs.com',
    'fluor.com',
    'bv.com',                   // Black & Veatch
    'burnsmcd.com',
    'jedunn.com',
    'manhattanconstruction.com',
    'mccowngordon.com',
    'weitz.com',
    'mortenson.com',
    'walshgroup.com',
    'brasfieldgorrie.com',
    'holderconstruction.com',
    'balfourbeattyus.com',
    'hoar.com',
    'structuretone.com',
    'hdcco.com',                // Hathaway Dinwiddie
    'hjrussell.com',
    'deangelisdiamond.com',
    'tellepsen.com',
    // Not-construction recipients flagged in BID-142:
    'equipmentshare.com',
    'legacysouth.com'
]);

// Out-of-ICP title fragments. Matched case-insensitive on the optional title field.
const REJECTED_TITLE_FRAGMENTS = [
    'general contractor',
    ' gc ', ' gc,', ' gc/', '/gc',  // "GC" as a standalone token, conservative
    'epc'
];

// Industries we consider in-ICP for specialty subs. If `industry` is provided,
// it must contain one of these fragments. Plain "construction" or "general
// contractor" without a specialty signal is treated as out-of-ICP.
const IN_ICP_INDUSTRY_FRAGMENTS = [
    'specialty', 'subcontract',
    'electrical', 'plumb', 'mechanical', 'hvac',
    'concrete', 'masonry', 'steel', 'structural',
    'drywall', 'framing', 'roofing', 'paint', 'flooring',
    'glaz', 'window', 'fire protection', 'sprinkler',
    'excavat', 'earthwork', 'grading', 'site work', 'sitework',
    'insulation', 'millwork', 'cabinet', 'door', 'curtain wall',
    'low voltage', 'controls', 'fire alarm', 'data cabling'
];

const OUT_ICP_INDUSTRY_FRAGMENTS = [
    'general contractor',
    'building construction',   // Apollo's GC bucket
    'real estate',
    'rental',
    'equipment rental',
    'consulting',
    'engineering services'     // EPC-leaning
];

const REVENUE_REJECT_THRESHOLD = 50_000_000;

// Parses Apollo-style revenue strings like "$5M", "10000000", "$2.5 million",
// returning a numeric USD value or null when no number is present.
function parseRevenue(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s) return null;
    const m = s.match(/([\d,.]+)\s*(b|billion|m|million|k|thousand)?/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) return null;
    const unit = m[2] || '';
    if (unit.startsWith('b')) return n * 1_000_000_000;
    if (unit.startsWith('m')) return n * 1_000_000;
    if (unit.startsWith('k') || unit.startsWith('t')) return n * 1_000;
    return n;
}

function checkIcpGate(p) {
    const reasons = [];
    const company = (p.company_name || '').toLowerCase();
    const email = (p.owner_email || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const industry = (p.industry || p.trade || '').toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1].trim() : '';

    for (const kw of GC_TIER_COMPANY_KEYWORDS) {
        if (company.includes(kw)) {
            reasons.push(`company_name matches GC-tier keyword "${kw}"`);
            break;
        }
    }

    if (domain && GC_TIER_DOMAINS.has(domain)) {
        reasons.push(`email domain "${domain}" on mega-GC blocklist`);
    }

    if (title) {
        // Pad with spaces so the " gc " token matches edge positions
        const paddedTitle = ` ${title} `;
        for (const frag of REJECTED_TITLE_FRAGMENTS) {
            if (paddedTitle.includes(frag)) {
                reasons.push(`title contains "${frag.trim()}"`);
                break;
            }
        }
    }

    const rev = parseRevenue(p.estimated_revenue);
    if (rev != null && rev > REVENUE_REJECT_THRESHOLD) {
        reasons.push(`estimated_revenue ${rev.toLocaleString('en-US')} above $${REVENUE_REJECT_THRESHOLD.toLocaleString('en-US')}`);
    }

    if (industry) {
        const outMatch = OUT_ICP_INDUSTRY_FRAGMENTS.find(f => industry.includes(f));
        const inMatch = IN_ICP_INDUSTRY_FRAGMENTS.find(f => industry.includes(f));
        if (outMatch && !inMatch) {
            reasons.push(`industry "${industry}" matches out-of-ICP fragment "${outMatch}"`);
        }
    }

    return reasons;
}
// ---------- end ICP gate ----------

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const raw = body.prospects;
    if (!Array.isArray(raw) || raw.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'prospects array required' }) };
    }

    const override = body.override_icp_gate === true;

    const valid = [];
    const validationErrors = [];
    const icpRejections = [];

    for (let i = 0; i < raw.length; i++) {
        const p = raw[i];
        const email = (p.owner_email || '').trim().toLowerCase();
        if (!email || !email.includes('@') || !email.includes('.')) {
            validationErrors.push(`Row ${i + 1}: invalid owner_email "${p.owner_email || ''}"`);
            continue;
        }
        const companyName = (p.company_name || '').trim();
        if (!companyName) {
            validationErrors.push(`Row ${i + 1}: missing company_name`);
            continue;
        }

        const icpReasons = checkIcpGate({
            company_name: companyName,
            owner_email: email,
            title: p.title,
            industry: p.industry,
            trade: p.trade,
            estimated_revenue: p.estimated_revenue
        });

        if (icpReasons.length > 0 && !override) {
            icpRejections.push({
                row: i + 1,
                company_name: companyName,
                owner_email: email,
                title: (p.title || '').trim() || null,
                reasons: icpReasons
            });
            continue;
        }

        valid.push({
            company_name: companyName,
            owner_email: email,
            trade: (p.trade || '').trim() || null,
            geography: (p.geography || '').trim() || null,
            estimated_revenue: (p.estimated_revenue || '').trim() || null,
            owner_name: (p.owner_name || '').trim() || null,
            _icp_reasons: icpReasons   // present only when override=true
        });
    }

    // BID-142: surface ICP rejections to Ryan; do not silently drop.
    // Reject the whole batch so the caller resubmits with a clean list
    // (or with override_icp_gate=true after explicit review).
    if (icpRejections.length > 0 && !override) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'ICP gate rejected one or more prospects',
                icp_rejected_count: icpRejections.length,
                icp_rejected: icpRejections,
                validation_errors: validationErrors,
                hint: 'Remove the rejected rows and retry, or pass override_icp_gate=true to bypass after explicit review.'
            })
        };
    }

    if (valid.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'No valid prospects after validation',
                validation_errors: validationErrors,
                icp_rejected: icpRejections
            })
        };
    }

    // Strip internal-only fields before insert
    const overrideAuditRows = [];
    const insertRows = valid.map(p => {
        const { _icp_reasons, ...row } = p;
        if (override && _icp_reasons && _icp_reasons.length > 0) {
            overrideAuditRows.push({
                owner_email: row.owner_email,
                company_name: row.company_name,
                bypassed_reasons: _icp_reasons
            });
        }
        return row;
    });

    // Skip emails already in the table to avoid restarting sequences
    const emails = insertRows.map(p => p.owner_email);
    const { data: existing } = await supabase
        .from('prospects')
        .select('owner_email')
        .in('owner_email', emails);

    const existingSet = new Set((existing || []).map(p => p.owner_email));
    const newProspects = insertRows.filter(p => !existingSet.has(p.owner_email));
    const skippedCount = insertRows.length - newProspects.length;

    if (newProspects.length > 0) {
        const { error: insertError } = await supabase.from('prospects').insert(newProspects);
        if (insertError) {
            console.error('Insert error:', insertError);
            return { statusCode: 500, body: JSON.stringify({ error: insertError.message }) };
        }
    }

    if (override && overrideAuditRows.length > 0) {
        console.log(`⚠️  ICP gate bypassed for ${overrideAuditRows.length} prospect(s):`, JSON.stringify(overrideAuditRows));
    }

    console.log(`✅ Uploaded ${newProspects.length} new prospects, ${skippedCount} already existed${override ? `, ${overrideAuditRows.length} ICP-overridden` : ''}`);
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            inserted: newProspects.length,
            skipped_existing: skippedCount,
            validation_errors: validationErrors,
            icp_overridden: override ? overrideAuditRows : []
        })
    };
};
