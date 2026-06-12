// Signup E2E helper. Creates a throwaway user and prints a magic-link action URL
// (no email sent). Navigate it in a browser to trigger a real SIGNED_IN, then the
// app logs a 'signup' admin_event. Cleanup mode deletes the test user.
//   node --env-file=.env scripts/signup-e2e.js create
//   node --env-file=.env scripts/signup-e2e.js cleanup <userId>
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

(async () => {
    const mode = process.argv[2];
    if (mode === 'create') {
        const email = `signup-e2e-${Date.now()}@bidintell.ai`;
        const { data: created, error: cErr } = await sb.auth.admin.createUser({ email, email_confirm: true });
        if (cErr) { console.error('createUser failed:', cErr.message); process.exit(1); }
        const userId = created.user.id;
        const { data: link, error: lErr } = await sb.auth.admin.generateLink({
            type: 'magiclink', email,
            options: { redirectTo: 'https://bidintell.ai/app' }
        });
        if (lErr) { console.error('generateLink failed:', lErr.message); process.exit(1); }
        console.log('USER_ID=' + userId);
        console.log('EMAIL=' + email);
        console.log('ACTION_LINK=' + link.properties.action_link);
    } else if (mode === 'cleanup') {
        const userId = process.argv[3];
        const { error } = await sb.auth.admin.deleteUser(userId);
        console.log(error ? ('cleanup failed: ' + error.message) : 'deleted test user ' + userId);
        process.exit(error ? 1 : 0);
    } else {
        console.error('usage: create | cleanup <userId>'); process.exit(1);
    }
})();
