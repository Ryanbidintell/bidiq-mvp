// Renders the roi_breakdown email by invoking the REAL notify.js handler with
// fetch stubbed — captures the exact HTML it would send, no emails or DB writes.
// Run: node scripts/preview-roi-email.js  ->  writes scripts/roi-email-preview.html
const fs = require('fs');
const realFetch = global.fetch;
let leadHtml = null;

global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('resend.com')) {
        const p = JSON.parse(opts.body);
        if (!p.to.includes('ryan@bidintell.ai')) leadHtml = p.html; // the lead email (has bcc, not internal-only)
        return { ok: true, status: 200, text: async () => 'ok' };
    }
    if (u.includes('admin_events')) return { ok: true, status: 201, text: async () => '' };
    return realFetch(url, opts);
};

const { handler } = require('../netlify/functions/notify.js');
const event = { httpMethod: 'POST', body: JSON.stringify({
    emailType: 'roi_breakdown', userEmail: 'preview@example.com',
    bids: 40, hours: 6, winRate: 20, avgValue: 250000, margin: 12,
    hoursSaved: 96, timeValue: 6240, hourlyRate: 65, addlMargin: 30000
}) };

(async () => {
    const res = await handler(event);
    console.log('handler status:', res.statusCode);
    if (!leadHtml) { console.error('❌ no lead HTML captured'); process.exit(1); }
    fs.writeFileSync(__dirname + '/roi-email-preview.html', leadHtml);
    console.log('✅ wrote scripts/roi-email-preview.html (' + leadHtml.length + ' chars)');
})();
