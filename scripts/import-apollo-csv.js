#!/usr/bin/env node
// One-shot Apollo CSV → Supabase importer
// Usage: node scripts/import-apollo-csv.js <path-to-csv>
// Reads .env from project root for SUPABASE_URL / SUPABASE_SERVICE_KEY

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_]+)=(.+)$/);
        if (m) process.env[m[1]] = m[2].trim();
    });
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Minimal RFC-4180 CSV parser — handles quoted fields with embedded commas/newlines
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuote) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQuote = false;
            else field += c;
        } else if (c === '"') {
            inQuote = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n') {
            row.push(field); field = '';
            rows.push(row); row = [];
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
}

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
    if (s.includes('construction') || s.includes('contractor') || s.includes('subcontractor')) return 'General Construction';
    return industry;
}

async function main() {
    const csvPath = process.argv[2];
    if (!csvPath) {
        console.error('Usage: node scripts/import-apollo-csv.js <path-to-csv>');
        process.exit(1);
    }

    const text = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(text);
    if (rows.length < 2) { console.error('Empty CSV'); process.exit(1); }

    // Build column index from header row
    const headers = rows[0].map(h => h.trim());
    const col = name => headers.indexOf(name);

    const iFirstName = col('First Name');
    const iLastName = col('Last Name');
    const iCompany = col('Company Name');
    const iEmail = col('Email');
    const iEmailStatus = col('Email Status');
    const iIndustry = col('Industry');
    const iCity = col('City');
    const iState = col('State');
    const iRevenue = col('Annual Revenue');
    const iQualify = col('Qualify Contact');

    const SKIP_STATUSES = new Set(['Bounced', 'Invalid', 'Unsubscribed']);

    const prospects = [];
    let skippedNoEmail = 0, skippedDisqualified = 0, skippedBadEmail = 0;

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < 5) continue;

        const qualify = iQualify >= 0 ? (r[iQualify] || '').trim() : '';
        if (qualify === 'Disqualified') { skippedDisqualified++; continue; }

        const emailStatus = iEmailStatus >= 0 ? (r[iEmailStatus] || '').trim() : '';
        if (SKIP_STATUSES.has(emailStatus)) { skippedBadEmail++; continue; }

        const email = (r[iEmail] || '').trim().toLowerCase();
        if (!email || !email.includes('@') || !email.includes('.')) { skippedNoEmail++; continue; }

        const company = (r[iCompany] || '').trim();
        if (!company) { skippedNoEmail++; continue; }

        const city = (r[iCity] || '').trim();
        const state = (r[iState] || '').trim();
        const revenueRaw = (r[iRevenue] || '').trim();

        prospects.push({
            company_name: company,
            owner_email: email,
            owner_name: [r[iFirstName], r[iLastName]].map(s => (s || '').trim()).filter(Boolean).join(' ') || null,
            trade: normalizeTrade(r[iIndustry] || ''),
            geography: city && state ? `${city}, ${state}` : city || state || null,
            estimated_revenue: revenueRaw || null
        });
    }

    console.log(`Parsed ${rows.length - 1} data rows → ${prospects.length} valid (skipped: ${skippedDisqualified} disqualified, ${skippedBadEmail} bad email status, ${skippedNoEmail} no email/company)`);

    if (prospects.length === 0) {
        console.log('Nothing to insert.');
        return;
    }

    // Deduplicate against existing prospects
    const emails = prospects.map(p => p.owner_email);
    const { data: existing, error: fetchErr } = await supabase.from('prospects').select('owner_email').in('owner_email', emails);
    if (fetchErr) { console.error('Supabase fetch error:', fetchErr.message); process.exit(1); }

    const existingSet = new Set((existing || []).map(p => p.owner_email));
    const newProspects = prospects.filter(p => !existingSet.has(p.owner_email));
    const skippedExisting = prospects.length - newProspects.length;

    console.log(`Dedup: ${newProspects.length} new, ${skippedExisting} already in table`);

    if (newProspects.length === 0) {
        console.log('All contacts already exist — nothing inserted.');
        return;
    }

    const { error: insertErr } = await supabase.from('prospects').insert(newProspects);
    if (insertErr) { console.error('Insert error:', insertErr.message); process.exit(1); }

    console.log(`✅ Inserted ${newProspects.length} prospects into Supabase`);
    newProspects.forEach(p => console.log(`  + ${p.owner_email} (${p.company_name})`));
}

main().catch(err => { console.error(err); process.exit(1); });
