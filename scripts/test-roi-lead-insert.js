// Validates the notify.js roi_lead logging fix: reads the SAME env var the fixed
// code reads (SUPABASE_SERVICE_KEY) and performs the SAME admin_events REST insert.
// Run: node --env-file=.env scripts/test-roi-lead-insert.js
const sbUrl = process.env.SUPABASE_URL || 'https://szifhqmrddmdkgschkkw.supabase.co';
const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
    console.log('SUPABASE_SERVICE_KEY present:', !!process.env.SUPABASE_SERVICE_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!sbKey) { console.log('❌ No service key resolved — insert would be skipped (this was the bug).'); process.exit(1); }

    const res = await fetch(`${sbUrl}/rest/v1/admin_events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            event_type: 'roi_lead',
            user_id: null,
            event_data: { email: 'TEST-DELETE-ME@example.com', bids: 100, hours: 2, winRate: 20, avgValue: 250000, margin: 12, hoursSaved: 25, addlMargin: 31250, _test: true }
        })
    });
    const body = await res.text();
    console.log('HTTP status:', res.status);
    console.log('Response:', body);
    console.log(res.status === 201 ? '✅ roi_lead insert authorized and accepted' : '❌ insert rejected');
    process.exit(res.status === 201 ? 0 : 1);
})();
