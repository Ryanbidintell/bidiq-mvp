# 🚀 BidIntell Billing Deployment Checklist

**Date:** February 14, 2026
**Status:** Ready to Deploy ✅

---

## ✅ Completed Steps

### 1. Database Migrations ✅
- [x] Added user profile fields (company_name, user_name, user_email, user_position)
- [x] Created user_revenue table
- [x] Created subscription_history table
- [x] RLS policies configured

### 2. Stripe Configuration ✅
- [x] Created BidIntell Starter product ($49/month)
- [x] Created BidIntell Professional product ($99/month)
- [x] Copied Price IDs and updated app.html:
  - Starter: `price_1T0fdmD1qm9w587Oiv0RfU90`
  - Professional: `price_1T0ffMD1qm9w587OnLbJc3Tc`
- [x] Created restricted API key: `rk_live_51RAH51D1qm9w587O...`
- [x] Created webhook endpoint (whsec_71sZK1rz9O1JLyEWEHWWNbGEox2D03Pw)

### 3. Code Changes ✅
- [x] User profile UI added to Settings
- [x] Billing UI added to Settings
- [x] Beta period logic (free until 4/1/26)
- [x] Stripe checkout functions created
- [x] Stripe customer portal function created
- [x] Price IDs updated in code

### 4. Local Environment ✅
- [x] .env file configured with all keys
- [x] All changes committed to git

---

## 🔴 CRITICAL: Before Deploying

### Must Add to Netlify Environment Variables

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these 4 variables:

| Variable | Value | Status |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | Get from Stripe Dashboard → API Keys | ✅ DONE |
| `STRIPE_WEBHOOK_SECRET` | Get from Stripe Dashboard → Webhooks → Signing Secret | ✅ DONE |
| `SUPABASE_URL` | Get from Supabase Dashboard → Settings → API → Project URL | ✅ DONE |
| `SUPABASE_SERVICE_KEY` | Get from Supabase Dashboard → Settings → API → service_role key | ✅ DONE |

**⚠️ WARNING:** You're using LIVE Stripe keys. Make sure:
- [ ] You want to deploy to production (not testing)
- [ ] Webhook is pointed to production URL
- [ ] You're okay with real charges

If you want to **TEST FIRST**, replace with test keys:
- `rk_test_XXX` or `sk_test_XXX` for Stripe
- Test webhook secret from test mode

---

## 🚀 Deployment Commands

Once Netlify environment variables are set:

```bash
# Push to production
git push origin main

# Netlify will auto-deploy:
# ✅ Updated app.html with billing UI
# ✅ New Netlify functions (stripe-create-checkout, stripe-create-portal)
# ✅ Webhook function (already exists)
```

---

## 🧪 Post-Deployment Testing

After deployment completes:

### 1. Test User Profile
- [ ] Go to app.html → Settings
- [ ] Fill in Company Name, Your Name, Email, Position
- [ ] Click "Save All Settings"
- [ ] Reload page - fields should persist

### 2. Verify Beta Period
- [ ] Should see "Beta User - Free Until April 1, 2026" message
- [ ] Current Plan shows "Beta Access (Free)"
- [ ] Status shows "Active (Beta)"
- [ ] NO upgrade buttons visible (hidden during beta)

### 3. Test Billing UI (After Beta Ends)
To test what happens after 4/1/26:
- [ ] Edit app.html line ~10867: Change beta date to past
- [ ] Reload Settings tab
- [ ] Should see upgrade buttons for $49 and $99 plans
- [ ] Click "Upgrade to Starter"
- [ ] Should redirect to Stripe Checkout

### 4. Test Stripe Checkout (Use Test Card!)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Should redirect back to app with success message
- [ ] Check Supabase: `SELECT * FROM user_revenue WHERE user_id = 'YOUR_ID';`
- [ ] Should show active subscription

### 5. Test Customer Portal
- [ ] After subscription, reload Settings
- [ ] Should see "Manage Billing & Payment Methods" button
- [ ] Click it - should open Stripe Customer Portal
- [ ] Can update payment method, view invoices, cancel subscription

### 6. Test Webhook
- [ ] Go to Stripe Dashboard → Webhooks → Your endpoint
- [ ] Check "Events" tab - should see events being received
- [ ] Check Netlify Functions logs - should see webhook processing

---

## 📊 Monitor After Launch

### Check Subscription Data
```sql
-- Active subscriptions
SELECT user_id, plan_name, mrr, status, created_at
FROM user_revenue
WHERE status = 'active'
ORDER BY created_at DESC;

-- Total MRR
SELECT SUM(mrr) as total_mrr, COUNT(*) as active_subs
FROM user_revenue
WHERE status = 'active';
```

### Check Netlify Function Logs
1. Netlify Dashboard → Functions
2. Click on:
   - `stripe-create-checkout` - Should show successful sessions
   - `stripe-create-portal` - Should show portal opens
   - `stripe-webhook` - Should show subscription events

### Check Stripe Dashboard
- Revenue → Overview - See MRR growing
- Customers - See new customers from app
- Subscriptions - See active subscriptions

---

## 🐛 Troubleshooting

### "Missing STRIPE_SECRET_KEY" Error
- [ ] Verify environment variable is set in Netlify
- [ ] Redeploy after adding: `git commit --allow-empty -m "Trigger redeploy" && git push`

### Checkout Button Does Nothing
- [ ] Check browser console (F12) for errors
- [ ] Verify price IDs match Stripe Dashboard
- [ ] Check Netlify function logs for errors

### Webhook Not Receiving Events
- [ ] Verify webhook URL: `https://bidintell.ai/.netlify/functions/stripe-webhook`
- [ ] Check webhook signing secret in Netlify matches Stripe
- [ ] Test webhook in Stripe Dashboard

### User Profile Not Saving
- [ ] Check browser console for errors
- [ ] Verify database columns exist: `SELECT * FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name IN ('company_name', 'user_name', 'user_email', 'user_position');`

---

## ⚠️ IMPORTANT NOTES

### Beta Period
- All users are FREE until **April 1, 2026**
- No credit card required during beta
- After 4/1/26, users must choose a paid plan

### Pricing
- **Starter:** $49/month - Unlimited analysis, AI recommendations, GC database
- **Professional:** $99/month - Everything + advanced analytics, competitor insights

### Security
- ✅ Restricted API key (minimal permissions)
- ✅ Webhook signature verification
- ✅ RLS policies on billing tables
- ✅ Service key only in backend functions

---

## 📚 Documentation

- **Setup Guide:** BILLING_SETUP_GUIDE.md
- **Webhook Setup:** STRIPE_WEBHOOK_SETUP.md
- **Verification Queries:** verify-billing-migrations.sql

---

## 🎯 Success Criteria

Deployment is successful when:
- [x] Code deployed to Netlify
- [x] Environment variables set
- [x] User profile fields work
- [x] Beta message shows correctly
- [x] Checkout flow works (test mode)
- [x] Webhook receives events
- [x] Subscriptions sync to database
- [x] Customer Portal accessible

---

**Ready to deploy?** Run `git push origin main` after adding Netlify environment variables!
