// Prospect Apollo Pull - Netlify HTTP + Scheduled Function
// POST /api/prospect-apollo-pull  (admin auth required)
// Scheduled: daily at 15:00 UTC (10am CDT) via netlify.toml
// Calls Apollo.io People Search API to pull ICP-matched contacts into the prospects table.
//
// ICP filter: owner/president/estimator titles, specialty subcontractor industry,
// $2M–$20M revenue, United States

const { createClient } = require('@supabase/supabase-js');
const { syncProspectToPipedrive } = require('./pipedrive-utils');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const ADMIN_EMAILS = ['ryan@fsikc.com', 'ryan@bidintell.ai'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APOLLO_SEARCH_URL = 'https://api.apollo.io/v1/mixed_people/search';

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

// Normalize Apollo industry strings to readable trade labels
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

        // Verify admin session first — auth before revealing env config state
        const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        const token = authHeader.slice(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user || !ADMIN_EMAILS.includes(user.email)) {
            return {
                statusCode: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Forbidden' })
            };
        }
    }

    // Fail gracefully if Apollo key not configured — clear error, not a 500
    if (!APOLLO_API_KEY) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'APOLLO_API_KEY environment variable is not configured. Add it to Netlify environment settings.' })
        };
    }

    // Optional params: page and per_page from request body
    let body = {};
    try {
        body = JSON.parse(event.body || '{}');
    } catch { /* use defaults */ }

    const perPage = Math.min(parseInt(body.per_page) || 50, 100);
    const page = parseInt(body.page) || 1;

    // Call Apollo People Search
    const apolloPayload = {
        api_key: APOLLO_API_KEY,
        person_titles: ICP_TITLES,
        organization_industry_tag_names: ICP_INDUSTRIES,
        organization_annual_revenue_ranges: ICP_REVENUE_RANGES,
        person_locations: ['United States'],
        per_page: perPage,
        page
    };

    let apolloData;
    try {
        const res = await fetch(APOLLO_SEARCH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify(apolloPayload)
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error('Apollo API error:', res.status, errText);
            return {
                statusCode: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: `Apollo API returned ${res.status}: ${errText.slice(0, 200)}` })
            };
        }
        apolloData = await res.json();
    } catch (err) {
        console.error('Apollo fetch error:', err);
        return {
            statusCode: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: `Failed to reach Apollo API: ${err.message}` })
        };
    }

    const people = apolloData.people || [];
    console.log(`Apollo returned ${people.length} contacts (page ${page}, per_page ${perPage})`);

    // Map Apollo fields to prospects schema; skip records without usable email
    const valid = [];
    let skippedNoEmail = 0;

    for (const person of people) {
        const email = (person.email || '').trim().toLowerCase();
        if (!email || !email.includes('@') || !email.includes('.')) {
            // Apollo free tier gates/obscures many emails — skip gracefully, no crash
            skippedNoEmail++;
            console.log(`Skipped (no email): ${person.first_name || ''} ${person.last_name || ''} @ ${person.organization?.name || 'unknown'}`);
            continue;
        }

        const companyName = (person.organization?.name || '').trim();
        if (!companyName) {
            skippedNoEmail++;
            console.log(`Skipped (no company): ${email}`);
            continue;
        }

        const city = (person.city || '').trim();
        const state = (person.state || '').trim();
        const geography = city && state ? `${city}, ${state}` : city || state || null;

        valid.push({
            company_name: companyName,
            owner_email: email,
            owner_name: [person.first_name, person.last_name].filter(Boolean).join(' ') || null,
            trade: normalizeTrade(person.organization?.industry),
            geography,
            estimated_revenue: person.organization?.estimated_annual_revenue || null
        });
    }

    if (valid.length === 0) {
        console.log(`Apollo pull complete: 0 insertable contacts (${skippedNoEmail} skipped, no email/company)`);
        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                inserted: 0,
                skipped_existing: 0,
                skipped_no_email: skippedNoEmail,
                apollo_total: people.length,
                pagination: apolloData.pagination || null
            })
        };
    }

    // Deduplicate against existing prospects — same logic as prospect-upload.js
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

        // Sync new prospects to Pipedrive — non-fatal, email sequence is not blocked
        let pipedriveCount = 0;
        for (const p of newProspects) {
            try {
                await syncProspectToPipedrive(p.owner_email, p.owner_name, p.company_name, p.trade, p.geography);
                pipedriveCount++;
            } catch (err) {
                console.error(`Pipedrive sync failed for ${p.owner_email}:`, err.message);
            }
        }
        if (pipedriveCount > 0) console.log(`🔗 Pipedrive: ${pipedriveCount} prospects synced`);
    }

    console.log(`✅ Apollo pull: ${newProspects.length} inserted, ${skippedExisting} existing dupes skipped, ${skippedNoEmail} no-email skipped`);

    return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: true,
            inserted: newProspects.length,
            skipped_existing: skippedExisting,
            skipped_no_email: skippedNoEmail,
            apollo_total: people.length,
            pagination: apolloData.pagination || null
        })
    };
};
