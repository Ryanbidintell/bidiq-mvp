// Daily Metrics Snapshot - Netlify Scheduled Function
// Runs daily at midnight UTC to capture key metrics
// Stores in admin_metrics_snapshots table for trend analysis

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Calculate daily metrics and save snapshot
 */
exports.handler = async (event, context) => {
    console.log('🕐 Daily snapshot started:', new Date().toISOString());

    try {
        // Get today's date (YYYY-MM-DD format)
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today + 'T00:00:00Z');
        const todayEnd = new Date(today + 'T23:59:59Z');

        // ========================================
        // 1. USER METRICS
        // ========================================

        // Total users from user_settings
        const { count: totalUsers, error: totalUsersError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true });

        if (totalUsersError) {
            console.error('Error counting total users:', totalUsersError);
            throw totalUsersError;
        }

        // Paid users (active subscription, not beta)
        const { count: paidUsers, error: paidUsersError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .neq('subscription_tier', 'beta');

        if (paidUsersError) {
            console.error('Error counting paid users:', paidUsersError);
            throw paidUsersError;
        }

        // Beta users
        const { count: betaUsers, error: betaUsersError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true })
            .eq('is_beta_user', true);

        if (betaUsersError) {
            console.error('Error counting beta users:', betaUsersError);
            throw betaUsersError;
        }

        // Starter plan users
        const { count: starterUsers, error: starterUsersError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_tier', 'starter')
            .eq('subscription_status', 'active');

        if (starterUsersError) {
            console.error('Error counting starter users:', starterUsersError);
            throw starterUsersError;
        }

        // Professional plan users
        const { count: professionalUsers, error: professionalUsersError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_tier', 'professional')
            .eq('subscription_status', 'active');

        if (professionalUsersError) {
            console.error('Error counting professional users:', professionalUsersError);
            throw professionalUsersError;
        }

        // ========================================
        // 2. REVENUE METRICS
        // ========================================

        // MRR (sum from user_revenue table where status = 'active')
        const { data: revenueData, error: revenueError } = await supabase
            .from('user_revenue')
            .select('mrr')
            .eq('status', 'active');

        if (revenueError) {
            console.error('Error calculating MRR:', revenueError);
            throw revenueError;
        }

        const mrrCents = revenueData.reduce((sum, row) => sum + (row.mrr || 0), 0);

        // ========================================
        // 3. ACTIVITY METRICS (TODAY ONLY)
        // ========================================

        // New signups today
        const { count: newSignupsToday, error: signupsError } = await supabase
            .from('user_settings')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString());

        if (signupsError) {
            console.error('Error counting signups:', signupsError);
            throw signupsError;
        }

        // Cancellations today
        const { count: cancellationsToday, error: cancellationsError } = await supabase
            .from('user_revenue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'canceled')
            .gte('billing_period_end', todayStart.toISOString())
            .lte('billing_period_end', todayEnd.toISOString());

        if (cancellationsError) {
            console.error('Error counting cancellations:', cancellationsError);
            throw cancellationsError;
        }

        // Bids analyzed today
        const { count: bidsAnalyzedToday, error: bidsError } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString());

        if (bidsError) {
            console.error('Error counting bids:', bidsError);
            throw bidsError;
        }

        // Outcomes recorded today
        const { count: outcomesRecordedToday, error: outcomesError } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .neq('outcome', 'pending')
            .gte('outcome_date', todayStart.toISOString())
            .lte('outcome_date', todayEnd.toISOString());

        if (outcomesError) {
            console.error('Error counting outcomes:', outcomesError);
            throw outcomesError;
        }

        // ========================================
        // 4. SAVE SNAPSHOT
        // ========================================

        const snapshot = {
            snapshot_date: today,
            total_users: totalUsers || 0,
            paid_users: paidUsers || 0,
            beta_users: betaUsers || 0,
            starter_users: starterUsers || 0,
            professional_users: professionalUsers || 0,
            mrr_cents: mrrCents,
            new_signups_today: newSignupsToday || 0,
            cancellations_today: cancellationsToday || 0,
            bids_analyzed_today: bidsAnalyzedToday || 0,
            outcomes_recorded_today: outcomesRecordedToday || 0
        };

        console.log('📊 Snapshot metrics:', snapshot);

        // Insert or update snapshot (upsert on snapshot_date)
        const { data: insertedSnapshot, error: insertError } = await supabase
            .from('admin_metrics_snapshots')
            .upsert(snapshot, {
                onConflict: 'snapshot_date',
                ignoreDuplicates: false
            })
            .select();

        if (insertError) {
            console.error('Error saving snapshot:', insertError);
            throw insertError;
        }

        console.log('✅ Daily snapshot saved successfully:', insertedSnapshot);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                snapshot: snapshot,
                message: `Daily snapshot for ${today} saved successfully`
            })
        };

    } catch (error) {
        console.error('❌ Daily snapshot failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
