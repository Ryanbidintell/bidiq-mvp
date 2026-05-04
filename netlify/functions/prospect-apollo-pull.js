// Prospect Apollo Pull - Netlify HTTP + Scheduled Function
// POST /api/prospect-apollo-pull  (admin auth required for HTTP; scheduled runs bypass auth)
// Scheduled: daily at 13:00 UTC (8am CDT) via netlify.toml
//
// Runs two title-based persona searches per day (50 contacts each, 100/day total):
//   Persona 1: "Estimator"       — specialty sub/construction, $2M–$20M rev, US
//   Persona 2: "Chief Estimator" — same ICP filters
//
// Override: set APOLLO_SAVED_SEARCH_IDS=id1,id2 in Netlify env to use Apollo saved-search IDs instead.

const { createClient } = require('@supabase/supabase-js');
const { syncProspectToPipedrive } = require('./pipedrive-utils');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APOLLO_SEARCH_URL = 'https://api.apollo.io/v1/mixed_people/search';

const ICP_INDUSTRIES = [
    'construction',
    'specialty contractor',
    'subcontractor',
    'general contractor',
    'building construction',
    'mechanical contractor',
    'electrical contractor'
];
const ICP_REVENUE_RANGES = ['2000000,20000000'];

// Two title-based personas that map to Ryan's Apollo outreach lists
const DEFAULT_PERSONAS = [
    { label: 'Estimator', person_titles: ['estimator'] },
    { label: 'Chief Estimator', person_titles: ['chief estimator'] }
];

function normalizeTrade(industry) {
    if (!industry) return null;
    const s = industry.toLowerCase();
    if (s.includes('electric')) return 'Electrical';
    if (s.includes('plumb')) return 'Plumbing';
    if (s.includes('hvac') || s.includes('heating') || s.includes('cooling') || s.includes('mechanical')) return 'HVAC';
    if (s.includes('concrete') || s.includes('masonry')) return 'Concrete / Masonry';
    if (s.includes('steel') || s.includes('structural')) return 'Structural Steel';
    if (s.includes('drywall') || s.includes('framing')) return 'Drywall / Framing';
    if (s.includes('roofing')) return 'Roofing';
    if (s.includes('paint')) return 'Painting';
    if (s.includes('flooring')) return 'Flooring';
    if (s.includes('window') || s.includes('glazing')) return 'Glazing / Windows';
    if (s.includes('fire') || s.includes('sprinkler')) return 'Fire Protection';
    if (s.includes('excavat') || s.includes('earthwork') || s.includes('grading')) return 'Excavation / Earthwork';
    return industry;
}

async function callApollo(payload) {
    const res = await fetch(APOLLO_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Apollo ${res.status}: ${errText.slice(0, 200)}`);
    }
    return res.json();
}

function mapPerson(person) {
    const email = (person.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) return null;
    const companyName = (person.organization?.name || '').trim();
    if (!companyName) return null;
    const city = (person.city || '').trim();
    const state = (person.state || '').trim();
    return {
        company_name: companyName,
        owner_email: email,
        owner_name: [person.first_name, person.last_name].filter(Boolean).join(' ') || null,
        trade: normalizeTrade(person.organization?.industry),
        geography: city && state ? `${city}, ${state}` : city || state || null,
        estimated_revenue: person.organization?.estimated_annual_revenue || null
    };
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

exports.handler = async (event) => {
    const isScheduled = !!event.schedule;

    if (!isScheduled) {
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 204, headers: corsHeaders, body: '' };
        }
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method not allowed' };
        }
        const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
        }
        const token = authHeader.slice(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
            return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
        }
    }

    if (!APOLLO_API_KEY) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'APOLLO_API_KEY not configured in Netlify environment settings.' })
        };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch { /* use defaults */ }

    const perPage = Math.min(parseInt(body.per_page) || 50, 100);
    const page = parseInt(body.page) || 1;

    // Build searches: saved-search IDs override if set; otherwise use two named title personas
    const savedSearchIds = (process.env.APOLLO_SAVED_SEARCH_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean);

    let searches, mode;
    if (savedSearchIds.length > 0) {
        searches = savedSearchIds.map(id => ({ api_key: APOLLO_API_KEY, saved_search_id: id, per_page: perPage, page }));
        mode = `${savedSearchIds.length} saved search ID(s)`;
    } else {
        searches = DEFAULT_PERSONAS.map(p => ({
            api_key: APOLLO_API_KEY,
            person_titles: p.person_titles,
            organization_industry_tag_names: ICP_INDUSTRIES,
            organization_annual_revenue_ranges: ICP_REVENUE_RANGES,
            person_locations: ['United States'],
            per_page: perPage,
            page,
            _label: p.label
        }));
        mode = DEFAULT_PERSONAS.map(p => p.label).join(' + ');
    }
    console.log(`Apollo pull starting: ${mode}, page=${page}, per_page=${perPage}`);

    // Run all searches sequentially to stay within Apollo rate limits
    const perSearchStats = [];
    const allPeople = [];
    for (const payload of searches) {
        const label = payload._label || payload.saved_search_id || 'search';
        const { _label, ...apolloPayload } = payload;
        try {
            const data = await callApollo(apolloPayload);
            const people = data.people || [];
            console.log(`  [${label}]: ${people.length} returned`);
            perSearchStats.push({ search: label, returned: people.length, pagination: data.pagination || null });
            allPeople.push(...people);
        } catch (err) {
            console.error(`Apollo search failed [${label}]:`, err.message);
            return {
                statusCode: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: err.message })
            };
        }
    }

    // Map to prospects schema; dedup within this batch by email
    const seenEmails = new Set();
    const valid = [];
    let skippedNoEmail = 0;

    for (const person of allPeople) {
        const mapped = mapPerson(person);
        if (!mapped) { skippedNoEmail++; continue; }
        if (seenEmails.has(mapped.owner_email)) continue;
        seenEmails.add(mapped.owner_email);
        valid.push(mapped);
    }

    if (valid.length === 0) {
        console.log(`Apollo pull complete: 0 insertable contacts (${skippedNoEmail} skipped no-email/company)`);
        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, inserted: 0, skipped_existing: 0, skipped_no_email: skippedNoEmail, apollo_total: allPeople.length, searches: perSearchStats })
        };
    }

    // Deduplicate against existing prospects table
    const emails = valid.map(p => p.owner_email);
    const { data: existing } = await supabase.from('prospects').select('owner_email').in('owner_email', emails);
    const existingSet = new Set((existing || []).map(p => p.owner_email));
    const newProspects = valid.filter(p => !existingSet.has(p.owner_email));
    const skippedExisting = valid.length - newProspects.length;

    if (newProspects.length > 0) {
        const { error: insertError } = await supabase.from('prospects').insert(newProspects);
        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: insertError.message })
            };
        }

        let pipedriveCount = 0;
        for (const p of newProspects) {
            try {
                await syncProspectToPipedrive(p.owner_email, p.owner_name, p.company_name, p.trade, p.geography);
                pipedriveCount++;
            } catch (err) {
                console.error(`Pipedrive sync failed for ${p.owner_email}:`, err.message);
            }
        }
        if (pipedriveCount > 0) console.log(`Pipedrive: ${pipedriveCount} prospects synced`);
    }

    console.log(`Apollo pull done: ${newProspects.length} inserted, ${skippedExisting} existing dupes, ${skippedNoEmail} no-email`);

    return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: true,
            inserted: newProspects.length,
            skipped_existing: skippedExisting,
            skipped_no_email: skippedNoEmail,
            apollo_total: allPeople.length,
            searches: perSearchStats
        })
    };
};
