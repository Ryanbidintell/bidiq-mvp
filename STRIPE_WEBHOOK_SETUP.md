# Stripe Webhook Setup Guide

This guide explains how to set up automatic revenue tracking from Stripe subscriptions.

## What It Does

The Stripe webhook automatically syncs subscription data to your `user_revenue` table:
- **New subscriptions** → Creates revenue record with MRR
- **Subscription updates** → Updates MRR, plan, status
- **Cancellations** → Marks subscription as cancelled
- **Successful payments** → Updates payment timestamp

## Setup Steps

### 1. Add Environment Variables to Netlify

Go to **Netlify Dashboard** → **Site settings** → **Environment variables** and add:

```
STRIPE_SECRET_KEY=sk_test_...your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_signing_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your_service_role_key
```

**Where to find these:**
- `STRIPE_SECRET_KEY`: Stripe Dashboard → Developers → API keys → Secret key
- `SUPABASE_URL`: Supabase Dashboard → Project Settings → API → Project URL
- `SUPABASE_SERVICE_KEY`: Supabase Dashboard → Project Settings → API → service_role key (NOT anon key!)
- `STRIPE_WEBHOOK_SECRET`: Created in step 2

### 2. Create Stripe Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://bidintell.ai/.netlify/functions/stripe-webhook`
4. Select events to listen for:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to Netlify as `STRIPE_WEBHOOK_SECRET`

### 3. Install Dependencies

```bash
npm install
```

This installs:
- `stripe` - Official Stripe Node.js library
- `@supabase/supabase-js` - For database writes

### 4. Deploy to Netlify

```bash
git add .
git commit -m "Add Stripe webhook for revenue tracking"
git push origin main
```

Netlify will auto-deploy the new webhook function at:
`https://bidintell.ai/.netlify/functions/stripe-webhook`

### 5. Test the Webhook

#### Using Stripe CLI (Recommended):

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # Mac
# or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhook events to local dev
stripe listen --forward-to https://bidintell.ai/.netlify/functions/stripe-webhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

#### Using Stripe Dashboard:

1. Go to **Webhooks** → Click your endpoint
2. Click **Send test webhook**
3. Select `customer.subscription.created`
4. Click **Send test webhook**

### 6. Verify It's Working

Check Netlify function logs:
1. Netlify Dashboard → **Functions** → `stripe-webhook`
2. Look for logs like:
```
📥 Webhook received: customer.subscription.created
✅ Synced subscription sub_abc123: $49/mo (active)
```

Check your Supabase database:
```sql
SELECT * FROM user_revenue ORDER BY created_at DESC LIMIT 5;
```

You should see new revenue records with:
- `stripe_customer_id`
- `stripe_subscription_id`
- `mrr` (monthly recurring revenue)
- `plan_name`
- `status` ('active' or 'cancelled')

## How It Links Users to Revenue

The webhook uses `stripe_customer_id` to link subscriptions to users:

1. **When user signs up with Stripe Checkout**, save their `customer.id` in your `user_revenue` table
2. **When webhook receives subscription events**, it looks up the user by `stripe_customer_id`
3. **If no user found yet**, it creates a placeholder record that will be linked when the user completes signup

### Example: Creating user_revenue record on signup

```javascript
// After successful Stripe Checkout session
const { data, error } = await supabase
    .from('user_revenue')
    .insert({
        user_id: currentUser.id,
        stripe_customer_id: checkoutSession.customer,
        stripe_subscription_id: checkoutSession.subscription,
        status: 'active'
    });
```

## Monitored Events

| Stripe Event | Action |
|---|---|
| `customer.subscription.created` | Create revenue record with MRR |
| `customer.subscription.updated` | Update MRR, plan, status |
| `customer.subscription.deleted` | Set status to 'cancelled' |
| `invoice.payment_succeeded` | Update payment timestamp |
| `invoice.payment_failed` | Log warning (no DB change) |

## Profitability Dashboard

Once revenue is synced, your admin dashboard will show:
- **Monthly Revenue**: Sum of all active MRR
- **Per-User Profitability**: Revenue - API costs per user
- **Profit Margin**: (Revenue - Costs) / Revenue
- **Revenue by Plan**: Breakdown by Starter/Professional

## Troubleshooting

### Webhook returns 400 Invalid Signature
- Make sure `STRIPE_WEBHOOK_SECRET` is correct
- Copy the signing secret from **Stripe Dashboard → Webhooks → Your endpoint**

### Webhook returns 500 Database Error
- Check `SUPABASE_SERVICE_KEY` is set (NOT the anon key)
- Verify the `user_revenue` table exists: `SELECT * FROM user_revenue LIMIT 1;`

### Revenue not showing in dashboard
- Check Supabase for actual data: `SELECT * FROM user_revenue;`
- Verify webhook is receiving events: Check Netlify function logs
- Make sure profitability section is loading: Check browser console for errors

### Test Subscription Not Appearing
- Stripe test mode and production mode are separate
- Make sure your webhook endpoint URL is correct
- Check that selected events include subscription events

## Security Notes

- ✅ Webhook signature verification prevents spoofing
- ✅ Uses service key (bypasses RLS) for reliable writes
- ✅ HTTPS only (enforced by Netlify)
- ✅ No sensitive data in client-side code

## Next Steps

After webhook is set up:
1. Create Stripe Checkout integration for user signups
2. Link Stripe customer IDs to user accounts
3. Build subscription management UI in settings
4. Add upgrade/downgrade flows
5. Implement usage-based billing if needed

---

**Questions?** Check [Stripe Webhook Docs](https://stripe.com/docs/webhooks) or [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
