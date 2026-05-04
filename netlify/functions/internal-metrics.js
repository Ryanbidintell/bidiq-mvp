// Internal Metrics API — CEO visibility endpoint
// GET /.netlify/functions/internal-metrics
// Auth: Authorization: Bearer <INTERNAL_METRICS_SECRET>  OR  ?secret=<token>
// Returns live business metrics pulled from Supabase.

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const INTERNAL_METRICS_SECRET = process.env.INTERNAL_METRICS_SECRET;

let _supabase = null;
function getSupabase() {
    if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return _supabase;
}

function authenticate(event) {
    if (!INTERNAL_METRICS_SECRET) return false; // secret not configured — deny
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const queryToken = (event.queryStringParameters || {}).secret;
    return bearerToken === INTERNAL_METRICS_SECRET || queryToken === INTERNAL_METRICS_SECRET;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!authenticate(event)) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    const supabase = getSupabase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // Run independent queries in parallel for speed
        const [
            totalUsersResult,
            paidUsersResult,
            revenueResult,
            activeUsersResult,
            totalOutcomesResult,
            usersWithOutcomesResult,
            trialsResult,
        ] = await Promise.all([
            // 1. Total registered users
            supabase
                .from('user_settings')
                .select('*', { count: 'exact', head: true }),

            // 2. Paying customers (active subscription, not beta)
            supabase
                .from('user_settings')
                .select('user_id', { count: 'exact' })
                .eq('subscription_status', 'active')
                .neq('subscription_tier', 'beta'),

            // 3. MRR from user_revenue
            supabase
                .from('user_revenue')
                .select('mrr')
                .eq('status', 'active'),

            // 4. Active accounts: users who created or updated a project in last 30 days
            supabase
                .from('projects')
                .select('user_id')
                .gte('updated_at', thirtyDaysAgo.toISOString()),

            // 5. Total outcomes logged (non-pending)
            supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .neq('outcome', 'pending'),

            // 6. Users who have logged at least one outcome (for rate calc)
            supabase
                .from('projects')
                .select('user_id')
                .neq('outcome', 'pending'),

            // 7. Trial users (signed up, no active paid subscription yet)
            supabase
                .from('user_settings')
                .select('user_id', { count: 'exact' })
                .or('subscription_status.is.null,subscription_status.neq.active'),
        ]);

        // ── Compute derived metrics ───────────────────────────────────────────

        // Paying customers
        const payingCount = paidUsersResult.count || 0;

        // MRR in dollars (stored in cents)
        const mrrCents = (revenueResult.data || []).reduce((sum, r) => sum + (r.mrr || 0), 0);
        const mrrDollars = (mrrCents / 100).toFixed(2);

        // Active accounts (deduplicated user IDs)
        const activeUserIds = new Set((activeUsersResult.data || []).map(r => r.user_id));
        const activeCount = activeUserIds.size;

        // Outcome logging rate: unique users with >=1 outcome / active users
        const usersWithOutcomes = new Set((usersWithOutcomesResult.data || []).map(r => r.user_id));
        const activeUsersWithOutcomes = [...usersWithOutcomes].filter(id => activeUserIds.has(id)).length;
        const outcomeLoggingRate = activeCount > 0
            ? ((activeUsersWithOutcomes / activeCount) * 100).toFixed(1) + '%'
            : 'N/A';

        // Trial-to-paid conversion rate
        const totalUsers = totalUsersResult.count || 0;
        const trialUsers = trialsResult.count || 0;
        const conversionRate = totalUsers > 0
            ? ((payingCount / totalUsers) * 100).toFixed(1) + '%'
            : 'N/A';

        const metrics = {
            as_of: now.toISOString(),
            users: {
                total_registered: totalUsers,
                paying_customers: payingCount,
                trial_users: trialUsers,
                active_last_30d: activeCount,
            },
            revenue: {
                mrr_dollars: parseFloat(mrrDollars),
                mrr_cents: mrrCents,
            },
            engagement: {
                total_outcomes_logged: totalOutcomesResult.count || 0,
                outcome_logging_rate: outcomeLoggingRate,
                active_users_with_outcomes: activeUsersWithOutcomes,
            },
            conversion: {
                trial_to_paid_rate: conversionRate,
            },
        };

        console.log('📊 internal-metrics:', JSON.stringify(metrics));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metrics, null, 2),
        };

    } catch (err) {
        console.error('internal-metrics error:', err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message }),
        };
    }
};
