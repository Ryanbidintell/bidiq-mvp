// One-shot script: pull ICP contacts from Apollo and insert into Supabase prospects table.
// Run: node scripts/apollo-bulk-pull.js
// Uses credentials from .env in project root.

const fs = require('fs');
const path = require('path');

// Load .env manually — no dotenv dependency needed
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
}

const { createClient } = require('@supabase/supabase-js');

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || 'Jim-mn6t6iPaNKQ_Ur-0vQ';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PIPEDRIVE_API_KEY = process.env.PIPEDRIVE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APOLLO_SEARCH_URL = 'https://api.apollo.io/v1/people/search';

const ICP_TITLES = ['owner', 'president', 'ceo', 'co-owner', 'principal'];
const ICP_INDUSTRIES = [
    'construction',
    'specialty contractor',
    'subcontractor',
    'general contractor',
    'building construction',
    'mechanical contractor',
    'electrical contractor'
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

async function syncToPipedrive(email, name, company) {
    if (!PIPEDRIVE_API_KEY) return;
    try {
        // Find or create person
        const searchRes = await fetch(
            `https://api.pipedrive.com/v1/persons/search?term=${encodeURIComponent(email)}&fields=email&api_token=${PIPEDRIVE_API_KEY}`
        );
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.items && searchData.data.items.length > 0) return; // already exists

        await fetch(`https://api.pipedrive.com/v1/persons?api_token=${PIPEDRIVE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name || company, email: [{ value: email, primary: true }], org_name: company })
        });
    } catch (err) {
        console.error(`Pipedrive sync failed for ${email}:`, err.message);
    }
}

async function pullPage(page, perPage = 100) {
    const payload = {
        person_titles: ICP_TITLES,
        organization_industry_tag_names: ICP_INDUSTRIES,
        organization_num_employees_ranges: ['10,100'],
        person_locations: ['United States'],
        per_page: perPage,
        page
    };

    const res = await fetch(APOLLO_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': APOLLO_API_KEY },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Apollo API ${res.status}: ${txt.slice(0, 200)}`);
    }

    return res.json();
}

async function main() {
    const PAGES = 5; // pull up to 5 pages × 100 = 500 contacts
    const PER_PAGE = 100;

    let totalInserted = 0;
    let totalSkippedExisting = 0;
    let totalSkippedNoEmail = 0;
    let totalApollo = 0;

    for (let page = 1; page <= PAGES; page++) {
        console.log(`\nFetching Apollo page ${page}/${PAGES}...`);
        let apolloData;
        try {
            apolloData = await pullPage(page, PER_PAGE);
        } catch (err) {
            console.error(`Page ${page} failed:`, err.message);
            break;
        }

        const people = apolloData.people || [];
        totalApollo += people.length;
        console.log(`  Apollo returned ${people.length} contacts`);

        if (people.length === 0) {
            console.log('  No more results, stopping.');
            break;
        }

        const valid = [];
        let skippedNoEmail = 0;

        for (const person of people) {
            const email = (person.email || '').trim().toLowerCase();
            if (!email || !email.includes('@') || !email.includes('.')) {
                skippedNoEmail++;
                continue;
            }
            const companyName = (person.organization?.name || '').trim();
            if (!companyName) { skippedNoEmail++; continue; }

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

        totalSkippedNoEmail += skippedNoEmail;
        console.log(`  Valid (have email): ${valid.length}, no-email skipped: ${skippedNoEmail}`);

        if (valid.length === 0) continue;

        // Deduplicate against existing prospects
        const emails = valid.map(p => p.owner_email);
        const { data: existing } = await supabase.from('prospects').select('owner_email').in('owner_email', emails);
        const existingSet = new Set((existing || []).map(p => p.owner_email));
        const newProspects = valid.filter(p => !existingSet.has(p.owner_email));
        const skippedExisting = valid.length - newProspects.length;
        totalSkippedExisting += skippedExisting;

        console.log(`  New (not in DB): ${newProspects.length}, already existing: ${skippedExisting}`);

        if (newProspects.length > 0) {
            const { error: insertError } = await supabase.from('prospects').insert(newProspects);
            if (insertError) {
                console.error(`  Insert error on page ${page}:`, insertError.message);
            } else {
                totalInserted += newProspects.length;
                console.log(`  Inserted ${newProspects.length} prospects`);

                // Pipedrive sync
                for (const p of newProspects) {
                    await syncToPipedrive(p.owner_email, p.owner_name, p.company_name);
                }
            }
        }

        // Apollo rate limit — brief pause between pages
        if (page < PAGES) await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n=== Summary ===');
    console.log(`Apollo contacts fetched: ${totalApollo}`);
    console.log(`Inserted into prospects: ${totalInserted}`);
    console.log(`Skipped (already in DB): ${totalSkippedExisting}`);
    console.log(`Skipped (no email):      ${totalSkippedNoEmail}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
