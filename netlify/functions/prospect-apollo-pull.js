// Prospect Apollo Pull - Netlify HTTP + Scheduled Function
// POST /api/prospect-apollo-pull  (admin auth required for HTTP; scheduled runs bypass auth)
// Scheduled: daily at 13:00 UTC (8am CDT) via netlify.toml
//
// Persona mode (preferred): set APOLLO_SAVED_SEARCH_IDS=id1,id2 in Netlify env.
//   Runs one search per saved-search ID, 50 contacts each (100/day total).
//   Persona IDs are visible in the Apollo UI URL when viewing a saved search.
//
// Fallback mode (if APOLLO_SAVED_SEARCH_IDS not set): uses hardcoded ICP criteria —
//   owner/president/estimator titles, specialty subcontractor industry, $2M–$20M revenue, US

const { createClient } = require('@supabase/supabase-js');
const { syncProspectToPipedrive } = require('./pipedrive-utils');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APOLLO_SEARCH_URL = 'https://api.apollo.io/v1/mixed_people/search';

// Fallback ICP criteria used when no saved search IDs are configured
const ICP_TITLES = ['owner', 'president', 'ceo', 'co-owner', 'principal', 'estimator'];
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

    // Determine search mode: saved-persona IDs or fallback ICP criteria
    const savedSearchIds = (process.env.APOLLO_SAVED_SEARCH_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean);

    const searches = savedSearchIds.length > 0
        ? savedSearchIds.map(id => ({ api_key: APOLLO_API_KEY, saved_search_id: id, per_page: perPage, page }))
        : [{ api_key: APOLLO_API_KEY, person_titles: ICP_TITLES, organization_industry_tag_names: ICP_INDUSTRIES, organization_annual_revenue_ranges: ICP_REVENUE_RANGES, person_locations: ['United States'], per_page: perPage, page }];

    const mode = savedSearchIds.length > 0 ? `${savedSearchIds.length} saved persona(s)` : 'fallback ICP criteria';
    console.log(`Apollo pull starting: ${mode}, page=${page}, per_page=${perPage}`);

    // Run all searches (sequential to avoid Apollo rate limits)
    const perSearchStats = [];
    const allPeople = [];
    for (const payload of searches) {
        try {
            const data = await callApollo(payload);
            const people = data.people || [];
            const label = payload.saved_search_id || 'fallback';
            console.log(`  ${label}: ${people.length} returned`);
            perSearchStats.push({ search: label, returned: people.length, pagination: data.pagination || null });
            allPeople.push(...people);
        } catch (err) {
            console.error(`Apollo search failed (${payload.saved_search_id || 'fallback'}):`, err.message);
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
