// Create Stripe Customer Portal Session
// Allows users to manage their subscription, update payment method, view invoices

const { createClient } = require('@supabase/supabase-js');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Lazy load Stripe
let stripe = null;
function getStripe() {
    if (!stripe) {
        const Stripe = require('stripe');
        stripe = new Stripe(STRIPE_SECRET_KEY);
    }
    return stripe;
}

/**
 * Get Stripe customer ID for user
 */
async function getStripeCustomerId(userId) {
    const { data, error } = await supabase
        .from('user_revenue')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (error || !data?.stripe_customer_id) {
        throw new Error('No Stripe customer found for this user');
    }

    return data.stripe_customer_id;
}

/**
 * Main handler
 */
exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Require a valid Supabase session and derive userId from the verified JWT.
    // NEVER trust a userId from the request body — doing so was an IDOR that let any
    // unauthenticated caller open (and cancel) any customer's Stripe billing portal.
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    let userId;
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('invalid token');
        userId = user.id;
    } catch (e) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
    }

    try {
        // Get Stripe customer ID from database (for the authenticated user only)
        const customerId = await getStripeCustomerId(userId);

        // Create portal session
        const stripe = getStripe();
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.URL}/app.html?tab=settings`
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                url: session.url
            })
        };

    } catch (error) {
        console.error('❌ Portal creation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create portal session',
                message: error.message
            })
        };
    }
};
