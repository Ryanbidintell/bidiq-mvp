// Create Stripe Checkout Session for subscription
// Handles both $49/mo Starter and $99/mo Professional plans

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
 * Get or create Stripe customer for user
 */
async function getOrCreateCustomer(userId, email, name, companyName) {
    // Check if user already has a Stripe customer ID
    const { data: revenueData } = await supabase
        .from('user_revenue')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (revenueData?.stripe_customer_id) {
        return revenueData.stripe_customer_id;
    }

    // Create new Stripe customer
    const stripe = getStripe();
    const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
            user_id: userId,
            company_name: companyName || ''
        }
    });

    // Save customer ID to database
    await supabase
        .from('user_revenue')
        .upsert({
            user_id: userId,
            stripe_customer_id: customer.id,
            status: 'inactive'
        }, {
            onConflict: 'user_id'
        });

    return customer.id;
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
        const { userId, email, name, companyName, priceId, planName } = body;

        // Validate required fields
        if (!userId || !email || !priceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: userId, email, priceId'
                })
            };
        }

        // Get or create Stripe customer
        const customerId = await getOrCreateCustomer(userId, email, name, companyName);

        // Create checkout session
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: `${process.env.URL}/app.html?checkout=success`,
            cancel_url: `${process.env.URL}/app.html?checkout=cancelled`,
            metadata: {
                user_id: userId,
                plan_name: planName || 'Unknown'
            },
            subscription_data: {
                metadata: {
                    user_id: userId,
                    plan_name: planName || 'Unknown'
                }
            }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('❌ Checkout creation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create checkout session',
                message: error.message
            })
        };
    }
};
