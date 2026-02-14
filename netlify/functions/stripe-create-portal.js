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

    try {
        const body = JSON.parse(event.body);
        const { userId } = body;

        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing userId' })
            };
        }

        // Get Stripe customer ID from database
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
