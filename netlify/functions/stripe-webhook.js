// Stripe webhook handler for subscription events
// Automatically syncs subscription data to user_revenue table

const { createClient } = require('@supabase/supabase-js');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client with service key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Stripe API (lazy load only when needed)
let stripe = null;
function getStripe() {
    if (!stripe) {
        const Stripe = require('stripe');
        stripe = new Stripe(STRIPE_SECRET_KEY);
    }
    return stripe;
}

/**
 * Verify Stripe webhook signature
 */
function verifyWebhook(body, signature) {
    try {
        const stripe = getStripe();
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
        return event;
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return null;
    }
}

/**
 * Get user ID from Stripe customer ID
 */
async function getUserFromStripeCustomer(stripeCustomerId) {
    const { data, error } = await supabase
        .from('user_revenue')
        .select('user_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

    if (error || !data) {
        console.warn(`User not found for Stripe customer ${stripeCustomerId}`);
        return null;
    }

    return data.user_id;
}

/**
 * Handle subscription created/updated
 */
async function handleSubscription(subscription) {
    const userId = await getUserFromStripeCustomer(subscription.customer);

    if (!userId) {
        // Create new user_revenue record with placeholder user_id
        // (will be linked when user signs up with this Stripe customer ID)
        console.log('Creating revenue record for new customer:', subscription.customer);
    }

    const mrr = subscription.items.data.reduce((total, item) => {
        return total + (item.plan.amount / 100); // Convert cents to dollars
    }, 0);

    const planName = subscription.items.data[0]?.plan.nickname ||
                     subscription.items.data[0]?.plan.id ||
                     'Unknown';

    const status = subscription.status === 'active' || subscription.status === 'trialing'
        ? 'active'
        : 'inactive';

    // Upsert revenue record
    const { error } = await supabase
        .from('user_revenue')
        .upsert({
            user_id: userId || '00000000-0000-0000-0000-000000000000', // Placeholder if no user yet
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            plan_name: planName,
            mrr: mrr,
            status: status,
            billing_cycle_anchor: new Date(subscription.current_period_end * 1000).toISOString()
        }, {
            onConflict: 'stripe_subscription_id'
        });

    if (error) {
        console.error('Failed to upsert revenue record:', error);
        throw error;
    }

    console.log(`✅ Synced subscription ${subscription.id}: $${mrr}/mo (${status})`);
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription) {
    const { error } = await supabase
        .from('user_revenue')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', subscription.id);

    if (error) {
        console.error('Failed to cancel subscription:', error);
        throw error;
    }

    console.log(`✅ Cancelled subscription ${subscription.id}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
    // Update last payment date
    if (invoice.subscription) {
        const { error } = await supabase
            .from('user_revenue')
            .update({
                updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);

        if (error) {
            console.error('Failed to update payment timestamp:', error);
        } else {
            console.log(`✅ Payment succeeded for subscription ${invoice.subscription}`);
        }
    }
}

/**
 * Main webhook handler
 */
exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
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
        // Verify webhook signature
        const signature = event.headers['stripe-signature'];
        if (!signature) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing stripe-signature header' })
            };
        }

        const stripeEvent = verifyWebhook(event.body, signature);
        if (!stripeEvent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }

        console.log(`📥 Webhook received: ${stripeEvent.type}`);

        // Handle different event types
        switch (stripeEvent.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscription(stripeEvent.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(stripeEvent.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;

            case 'invoice.payment_failed':
                console.log(`⚠️ Payment failed for customer ${stripeEvent.data.object.customer}`);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Webhook processing failed',
                message: error.message
            })
        };
    }
};
