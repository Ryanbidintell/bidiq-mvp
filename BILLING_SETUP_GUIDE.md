# 💳 BidIntell Billing Setup Guide

Complete guide to setting up Stripe billing with beta period (free until April 1, 2026).

---

## 📋 Overview

**What's New:**
- ✅ User Profile fields (company name, user name, email, position)
- ✅ Stripe Billing integration
- ✅ Beta period logic (free until 4/1/26)
- ✅ Two subscription tiers: $49/mo Starter, $99/mo Professional
- ✅ Customer Portal for managing subscriptions
- ✅ Automated revenue tracking via webhooks

---

## 🗄️ Step 1: Run Database Migrations

Run these SQL files in your Supabase SQL Editor:

### 1.1 Add User Profile Fields

```sql
-- File: supabase/migrations/20260214_add_user_profile_fields.sql
-- Adds company_name, user_name, user_email, user_position columns
```

Run the migration:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `supabase/migrations/20260214_add_user_profile_fields.sql`
3. Click **Run**

### 1.2 Create Billing Tables

```sql
-- File: supabase/migrations/20260214_add_billing_tables.sql
-- Creates user_revenue and subscription_history tables
```

Run the migration:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `supabase/migrations/20260214_add_billing_tables.sql`
3. Click **Run**

### 1.3 Verify Tables Exist

Run this query to verify:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_revenue', 'subscription_history');
```

Should return both table names.

---

## 🔑 Step 2: Create Stripe Products & Prices

### 2.1 Login to Stripe Dashboard

Go to [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)

### 2.2 Create Starter Plan

1. Click **+ Add product**
2. Fill in:
   - **Name:** BidIntell Starter
   - **Description:** Unlimited bid analysis + AI recommendations
3. Pricing:
   - **Recurring:** Monthly
   - **Price:** $49.00 USD
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`)

### 2.3 Create Professional Plan

1. Click **+ Add product**
2. Fill in:
   - **Name:** BidIntell Professional
   - **Description:** Everything in Starter + advanced analytics and priority support
3. Pricing:
   - **Recurring:** Monthly
   - **Price:** $99.00 USD
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`)

### 2.4 Update Price IDs in Code

Edit `app.html` around line 10842:
```javascript
const STRIPE_PRICES = {
    starter: 'price_XXXXXXXXXXXXXXXX',  // Paste Starter price ID
    professional: 'price_YYYYYYYYYYYYYY'  // Paste Professional price ID
};
```

---

## 🔧 Step 3: Configure Netlify Functions

### 3.1 Add Environment Variables

Go to **Netlify Dashboard** → **Site settings** → **Environment variables**

Add these variables:

| Variable | Where to Find |
|----------|---------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 4 below |
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |

**Important:** Use the **service_role** key, NOT the anon key!

### 3.2 Deploy Functions

```bash
git add -A
git commit -m "Add Stripe billing integration"
git push origin main
```

Netlify will auto-deploy these new functions:
- `/.netlify/functions/stripe-create-checkout`
- `/.netlify/functions/stripe-create-portal`
- `/.netlify/functions/stripe-webhook` (already exists)

---

## 🪝 Step 4: Setup Stripe Webhook

### 4.1 Create Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL:** `https://bidintell.ai/.netlify/functions/stripe-webhook`
4. Select events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**

### 4.2 Get Webhook Secret

1. Click on your new webhook endpoint
2. Click **Reveal** under **Signing secret**
3. Copy the secret (starts with `whsec_...`)
4. Add it to Netlify as `STRIPE_WEBHOOK_SECRET`

### 4.3 Test Webhook

In Stripe Dashboard:
1. Click your webhook endpoint
2. Click **Send test webhook**
3. Select `customer.subscription.created`
4. Click **Send test webhook**

Check Netlify function logs to verify it worked:
- Netlify Dashboard → **Functions** → `stripe-webhook` → **Function log**

---

## 🧪 Step 5: Test Complete Flow

### 5.1 Test Beta Period (Before April 1, 2026)

1. Log into app.html
2. Go to **Settings** tab
3. Should see:
   - ✅ "Beta User - Free Until April 1, 2026" message
   - ✅ Current Plan: "Beta Access (Free)"
   - ✅ Status: "Active (Beta)"
   - ✅ No upgrade buttons shown

### 5.2 Test User Profile

1. Fill in:
   - Company Name
   - Your Name
   - Email
   - Position
2. Click **Save All Settings**
3. Reload page - fields should persist

### 5.3 Test Stripe Checkout (Test Mode)

**Option A: Fast Forward Time (Recommended)**

To test what happens after beta ends:
1. Edit `app.html` line ~10867:
   ```javascript
   const betaEndDate = new Date('2024-01-01T00:00:00Z'); // Past date for testing
   ```
2. Reload Settings tab
3. Should now show upgrade options

**Option B: Wait Until April 1, 2026** (Not recommended 😄)

**After Beta Period Ends:**
1. Reload Settings tab
2. Should see:
   - ❌ "Free Trial Ended" message
   - ✅ Upgrade buttons for $49 and $99 plans
3. Click **Upgrade to Starter**
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect back to app with `?checkout=success`

### 5.4 Verify Subscription Created

Check Supabase:
```sql
SELECT * FROM user_revenue ORDER BY created_at DESC LIMIT 5;
```

Should show:
- ✅ `stripe_customer_id`
- ✅ `stripe_subscription_id`
- ✅ `plan_name` = "Starter" or "Professional"
- ✅ `mrr` = 49 or 99
- ✅ `status` = "active"

### 5.5 Test Customer Portal

1. Reload Settings tab
2. Should now show:
   - ✅ Current Plan: "Starter" or "Professional"
   - ✅ Status: "● Active"
   - ✅ "Manage Billing & Payment Methods" button
3. Click **Manage Billing**
4. Should redirect to Stripe Customer Portal
5. Can:
   - Update payment method
   - View invoices
   - Cancel subscription

---

## 🚀 Step 6: Go Live with Production

### 6.1 Switch Stripe to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Create products again (repeat Step 2)
3. Update `STRIPE_SECRET_KEY` in Netlify with **live** key
4. Update `STRIPE_WEBHOOK_SECRET` with **live** webhook secret
5. Update `STRIPE_PRICES` in app.html with **live** price IDs

### 6.2 Update Beta End Date

In `app.html` around line 10867:
```javascript
const betaEndDate = new Date('2026-04-01T00:00:00Z'); // Keep as April 1, 2026
```

Make sure this is correct!

---

## 📊 Step 7: Monitor Revenue

### 7.1 Check Subscription Status

Query user revenue:
```sql
SELECT
    user_id,
    plan_name,
    mrr,
    status,
    created_at
FROM user_revenue
WHERE status = 'active'
ORDER BY created_at DESC;
```

### 7.2 Calculate MRR

```sql
SELECT
    SUM(mrr) as total_mrr,
    COUNT(*) as active_subscriptions,
    plan_name
FROM user_revenue
WHERE status = 'active'
GROUP BY plan_name;
```

### 7.3 Track Subscription Changes

```sql
SELECT
    event_type,
    old_plan,
    new_plan,
    new_mrr,
    created_at
FROM subscription_history
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### "Missing STRIPE_SECRET_KEY"
- Go to Netlify → Site settings → Environment variables
- Verify `STRIPE_SECRET_KEY` is set
- Redeploy: `git commit --allow-empty -m "Trigger redeploy" && git push`

### Webhook Returns 400 Invalid Signature
- Double-check `STRIPE_WEBHOOK_SECRET` in Netlify
- Make sure you copied the **signing secret** from webhook endpoint, not the API key

### Checkout Button Does Nothing
- Open browser console (F12)
- Look for errors
- Verify `STRIPE_PRICES` in app.html match your actual Stripe price IDs

### User Not Showing as Beta User
- Check `user_revenue` table:
  ```sql
  SELECT beta_user, beta_end_date FROM user_revenue WHERE user_id = 'USER_ID_HERE';
  ```
- Should be: `beta_user = true`, `beta_end_date = 2026-04-01`

### Billing Card Not Showing
- Make sure migrations ran successfully
- Check browser console for errors
- Verify `loadBillingStatus()` is being called in `loadSettings()`

---

## 📚 Additional Resources

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal Docs](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhook Docs](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)

---

## ✅ Final Checklist

Before launching billing to production:

- [ ] Database migrations run successfully
- [ ] User profile fields working (save + reload)
- [ ] Beta message shows for beta users
- [ ] Upgrade buttons hidden during beta period
- [ ] Stripe products created (Starter $49, Professional $99)
- [ ] Price IDs updated in app.html
- [ ] All Netlify environment variables set
- [ ] Webhook endpoint created and tested
- [ ] Test checkout works with test card
- [ ] Customer portal accessible for subscribed users
- [ ] Revenue data syncing to user_revenue table
- [ ] Stripe switched to live mode for production
- [ ] Live price IDs updated in app.html
- [ ] Beta end date is April 1, 2026

---

**Questions?** Check STRIPE_WEBHOOK_SETUP.md for more details on webhook setup.
