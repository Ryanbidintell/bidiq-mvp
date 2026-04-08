// Stripe webhook handler for subscription events
// Automatically syncs subscription data to user_revenue table

const { createClient } = require('@supabase/supabase-js');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

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
 * Send step-1 welcome email and log subscription_created event
 */
async function sendWelcomeEmail(subscription) {
    try {
        const userId = await getUserFromStripeCustomer(subscription.customer);
        if (!userId) { console.warn('sendWelcomeEmail: no user_id found'); return; }

        // Get user email from auth
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authData?.user?.email;
        if (!userEmail) { console.warn('sendWelcomeEmail: no email for user', userId); return; }

        // Avoid resending if webhook fires multiple times
        const { data: existing } = await supabase
            .from('admin_events')
            .select('id')
            .eq('user_id', userId)
            .eq('event_type', 'welcome_email_step_1')
            .limit(1);
        if (existing && existing.length > 0) { console.log('Welcome email already sent for', userId); return; }

        const firstName = userEmail.split('@')[0].split('.')[0];
        const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null;
        const planName = subscription.items?.data[0]?.plan?.nickname || 'BidIntell';
        const trialLine = trialEnd
            ? `<p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">Your 7-day free trial runs through <strong>${trialEnd}</strong>. Your card won't be charged until then — cancel anytime before that if it's not for you.</p>`
            : '';

        const htmlBody = `
<div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
    </div>
    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">Welcome to BidIntell, ${name}.</h2>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
        You're in. Here's how to get your first bid score in about 5 minutes:
    </p>
    <ol style="font-size:15px; line-height:1.8; color:#374151; margin:0 0 24px; padding-left:20px;">
        <li><strong>Complete your Settings</strong> — add your CSI spec sections, service area, and keywords. This is what makes your scores accurate.</li>
        <li><strong>Upload a bid PDF</strong> — drawings, specs, or both. Drop it in the Analyze tab.</li>
        <li><strong>Read your BidIndex score</strong> — GO, REVIEW, or PASS with a breakdown of why.</li>
    </ol>
    ${trialLine}
    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
        Open BidIntell →
    </a>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
    <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell · Reply to this email with any questions</span></p>
</div>`;

        await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': POSTMARK_API_KEY },
            body: JSON.stringify({
                From: 'Ryan at BidIntell <hello@bidintell.ai>',
                To: userEmail,
                Bcc: 'ryan@bidintell.ai',
                Subject: `Welcome to BidIntell — you're in`,
                HtmlBody: htmlBody,
                MessageStream: 'outbound'
            })
        });

        // Log the send + record subscribed_at for day-2/7 sequence
        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'welcome_email_step_1',
            event_data: { email: userEmail, plan: planName, sent_at: new Date().toISOString() }
        });
        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'subscription_created',
            event_data: { email: userEmail, plan: planName, subscribed_at: new Date().toISOString() }
        });

        console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (err) {
        console.error('❌ sendWelcomeEmail failed:', err.message);
        // Never throw — don't block the webhook response
    }
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
 * Send trial-ending reminder (fires 3 days before trial ends via customer.subscription.trial_will_end)
 */
async function sendTrialEndingEmail(subscription) {
    try {
        const userId = await getUserFromStripeCustomer(subscription.customer);
        if (!userId) { console.warn('sendTrialEndingEmail: no user_id found'); return; }

        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authData?.user?.email;
        if (!userEmail) { console.warn('sendTrialEndingEmail: no email for user', userId); return; }

        // Dedup — only send once
        const { data: existing } = await supabase
            .from('admin_events')
            .select('id')
            .eq('user_id', userId)
            .eq('event_type', 'trial_ending_email')
            .limit(1);
        if (existing && existing.length > 0) { console.log('Trial ending email already sent for', userId); return; }

        const firstName = userEmail.split('@')[0].split('.')[0];
        const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : 'in 3 days';
        const planName = subscription.items?.data[0]?.plan?.nickname || 'BidIntell';

        const htmlBody = `
<div style="background:#ffffff; font-family:'Helvetica Neue',sans-serif; max-width:560px; margin:0 auto; padding:40px 32px; color:#0B0F14;">
    <div style="margin-bottom:28px;">
        <span style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL</span>
    </div>
    <h2 style="font-size:22px; font-weight:700; margin:0 0 16px;">Your free trial ends ${trialEnd}, ${name}.</h2>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 16px;">
        Your card will be charged on ${trialEnd} for your ${planName} subscription. Nothing you need to do if you want to keep going.
    </p>
    <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 24px;">
        If BidIntell hasn't clicked yet — reply to this email and tell me what's missing. I read every response personally and I'd rather fix it than lose you.
    </p>
    <div style="background:#f9fafb; border-left:3px solid #F26522; padding:16px 20px; margin:0 0 24px; border-radius:4px;">
        <p style="margin:0 0 6px; font-size:14px; font-weight:700; color:#0B0F14;">To get the most out of BidIntell before your trial ends:</p>
        <p style="margin:0 0 4px; font-size:14px; color:#374151;">1. Score at least one real bid — upload a PDF in the Analyze tab</p>
        <p style="margin:0 0 4px; font-size:14px; color:#374151;">2. Rate your top 3 clients in the Clients tab</p>
        <p style="margin:0; font-size:14px; color:#374151;">3. Log the outcome on any past bid — even a quick win/loss teaches the AI</p>
    </div>
    <p style="font-size:14px; line-height:1.6; color:#6b7280; margin:0 0 24px;">
        To cancel before ${trialEnd}: Settings → Subscription &amp; Billing → Manage Billing.
    </p>
    <a href="https://bidintell.ai/app" style="display:inline-block; background:#F26522; color:#ffffff; font-weight:700; font-size:15px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:28px;">
        Open BidIntell →
    </a>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;">
    <p style="font-size:14px; color:#6b7280; margin:0;">— Ryan<br><span style="color:#9ca3af;">Founder, BidIntell · Reply any time</span></p>
</div>`;

        await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': POSTMARK_API_KEY },
            body: JSON.stringify({
                From: 'Ryan at BidIntell <hello@bidintell.ai>',
                To: userEmail,
                Bcc: 'ryan@bidintell.ai',
                Subject: `Your BidIntell trial ends ${trialEnd}`,
                HtmlBody: htmlBody,
                MessageStream: 'outbound'
            })
        });

        await supabase.from('admin_events').insert({
            user_id: userId,
            event_type: 'trial_ending_email',
            event_data: { email: userEmail, plan: planName, trial_end: trialEnd, sent_at: new Date().toISOString() }
        });

        console.log(`✅ Trial ending email sent to ${userEmail}`);
    } catch (err) {
        console.error('❌ sendTrialEndingEmail failed:', err.message);
    }
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
                await handleSubscription(stripeEvent.data.object);
                await sendWelcomeEmail(stripeEvent.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscription(stripeEvent.data.object);
                break;

            case 'customer.subscription.trial_will_end':
                await sendTrialEndingEmail(stripeEvent.data.object);
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
