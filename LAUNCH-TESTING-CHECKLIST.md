# 🚀 BidIntell Launch Testing Checklist

**Date:** February 14, 2026 (Updated with Billing Tests)
**Goal:** Validate product is ready for beta users + billing launch
**Time Estimate:** 2.5 hours

---

## ✅ Pre-Launch Testing Status

### 1. CRITICAL PATH: User Journey (Must Test)

**Test as a new user from scratch:**

#### A. Signup & Authentication
- [ ] Go to https://bidintell.ai (or localhost)
- [ ] Click "Get Started Free — Unlimited Bids During Beta"
- [ ] Sign up with test email
- [ ] Verify email confirmation works
- [ ] Log in successfully
- [ ] Redirects to app.html

#### B. Onboarding Flow (All 10 Steps)
- [ ] **Step 1:** Welcome screen shows
- [ ] **Step 2:** Company name input works
- [ ] **Step 3:** Trade selection works
- [ ] **Step 4:** Office location (address autocomplete)
- [ ] **Step 5:** Service radius sliders work
- [ ] **Step 6:** Capacity selection works
- [ ] **Step 7:** Decision time selection works
- [ ] **Step 8:** Client types (multi-select checkboxes work)
- [ ] **Step 9:** AI advisor personalization
- [ ] **Step 10:** Summary screen shows all data
- [ ] **Submit:** Onboarding completes, dashboard loads

#### C. Core Feature: Bid Analysis
- [ ] Upload a PDF bid document (any construction bid)
- [ ] AI extraction starts (shows loading state)
- [ ] Project details extracted correctly:
  - [ ] Project name
  - [ ] Location (city, state)
  - [ ] Building type
  - [ ] GC name(s)
- [ ] **Step 1:** Project details screen populated
- [ ] **Step 2:** Client selector shows (can add new GCs)
- [ ] **Step 3:** Trade confirmation works
- [ ] BidIndex score calculates (not 0/100)
- [ ] Score shows with GO/REVIEW/PASS badge
- [ ] Recommendation shows reasoning

#### D. GC/Client Management
- [ ] GC Manager tab loads
- [ ] Can add new client manually
- [ ] Can edit existing client
- [ ] Can rate client (1-5 stars)
- [ ] Client types filter works (7 types)
- [ ] Search/filter functions work

#### E. Outcomes Tracking
- [ ] Click "Add Outcome" on a project
- [ ] Outcome modal opens
- [ ] Can select: Won / Lost / Passed / Ghosted
- [ ] For "Won": Can add contract value
- [ ] For "Won": Can add multiple alternates
- [ ] For "Lost": Can add who won
- [ ] For "Ghosted": Can select which GCs
- [ ] Outcome saves successfully
- [ ] Dashboard stats update (win rate, etc.)

#### F. Analytics Dashboard
- [ ] Dashboard stats load:
  - [ ] Total projects analyzed
  - [ ] Win rate percentage
  - [ ] AI Learning Progress
  - [ ] Average score
- [ ] Projects table loads with data
- [ ] Can filter by status (All/Won/Lost/etc.)
- [ ] Can sort table columns
- [ ] Client Performance table shows data

#### G. Report Printing
- [ ] Open a project with score
- [ ] Click "Print Report" button
- [ ] Print preview opens
- [ ] Report shows:
  - [ ] BidIndex score with color
  - [ ] GO/REVIEW/PASS recommendation
  - [ ] All score components
  - [ ] Contract risks (if any)
  - [ ] GC information
- [ ] Print/PDF works from browser

---

### 2. BROWSER COMPATIBILITY (Quick Check)

Test critical path in each browser:

#### Chrome (Primary)
- [ ] Signup works
- [ ] Upload & analysis works
- [ ] Dashboard loads
- [ ] No console errors (F12)

#### Safari (Mac/iOS)
- [ ] Signup works
- [ ] Upload works
- [ ] Dashboard loads
- [ ] Mobile responsive (if on iOS)

#### Edge (Windows)
- [ ] Basic functionality works

---

### 3. MOBILE RESPONSIVE (Quick Check)

Test on actual phone or browser dev tools (F12 → Toggle Device Toolbar):

- [ ] Landing page readable on mobile
- [ ] Can sign up on mobile
- [ ] Dashboard navigable on mobile
- [ ] Can upload on mobile
- [ ] Buttons/links are tappable (44px min)

---

### 4. ERROR HANDLING

Test edge cases:

- [ ] Upload non-PDF file → Shows error message
- [ ] Upload empty PDF → Shows error or handles gracefully
- [ ] Try to submit onboarding with missing fields → Validation works
- [ ] Navigate back button during analysis → Doesn't break
- [ ] Refresh page mid-analysis → Can resume or restart

---

### 5. DATA PERSISTENCE

- [ ] Complete onboarding → Log out → Log back in
- [ ] Settings are saved (company name, trade, location)
- [ ] Projects list persists after logout/login
- [ ] GC list persists after logout/login
- [ ] Outcomes persist after logout/login

---

### 6. PERFORMANCE CHECK

- [ ] Landing page loads in < 3 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] PDF upload starts processing immediately
- [ ] AI analysis completes in < 90 seconds
- [ ] No frozen/hanging states

---

### 7. CONSOLE ERRORS (Critical)

Open browser console (F12) during testing:

- [ ] **Landing page:** No red errors
- [ ] **App dashboard:** No red errors
- [ ] **During upload:** No red errors
- [ ] **During analysis:** No red errors
- [ ] **Yellow warnings:** Note but OK if minor

**If you see red errors, note them:**
```
Error: [exact error text]
File: [which page]
When: [what action triggered it]
```

---

### 8. BILLING SYSTEM (Critical for April 1 Launch)

**Beta Period Verification:**
- [ ] Go to Settings → Billing section
- [ ] Verify message: "Beta User - Free Until April 1, 2026"
- [ ] Current Plan shows: "Beta Access (Free)"
- [ ] Status shows: "Active (Beta)"
- [ ] Upgrade buttons are HIDDEN (beta users shouldn't see them)
- [ ] No credit card required

**User Profile Fields:**
- [ ] Settings → User Profile section exists
- [ ] Can enter: Company Name, Your Name, Email, Position
- [ ] Click "Save All Settings"
- [ ] Reload page → Fields persist correctly
- [ ] Check database: `SELECT company_name, user_name, user_email, user_position FROM user_settings WHERE user_id = 'YOUR_ID';`

**Test Billing Flow (After Beta - Change Date in Code):**
To test what happens after April 1, 2026:
- [ ] Edit app.html line ~10867: Change `new Date('2026-04-01')` to past date
- [ ] Reload Settings → Billing section
- [ ] Should now see upgrade buttons:
  - [ ] "Upgrade to Starter - $49/month"
  - [ ] "Upgrade to Professional - $99/month"

**Test Stripe Checkout (Use Test Mode!):**
- [ ] Click "Upgrade to Starter" button
- [ ] Redirects to Stripe Checkout page
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Any future date, any CVC
- [ ] Complete checkout
- [ ] Redirects back to app with success message
- [ ] Settings page shows:
  - [ ] "Current Plan: Starter"
  - [ ] "Status: Active"
  - [ ] "Billing Period: [dates]"
  - [ ] "Manage Billing & Payment Methods" button visible

**Test Customer Portal:**
- [ ] After subscribing, click "Manage Billing & Payment Methods"
- [ ] Opens Stripe Customer Portal
- [ ] Can view invoices
- [ ] Can update payment method
- [ ] Can cancel subscription

**Verify Webhook Sync:**
- [ ] After checkout, check Supabase:
  ```sql
  SELECT * FROM user_revenue WHERE user_id = 'YOUR_ID';
  ```
- [ ] Should show:
  - [ ] stripe_customer_id populated
  - [ ] stripe_subscription_id populated
  - [ ] plan_name = 'Starter' or 'Professional'
  - [ ] mrr = 49 or 99
  - [ ] status = 'active'
  - [ ] billing_period_start and billing_period_end dates correct

**Monitor Webhook Delivery:**
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Find webhook endpoint: `https://bidintell.ai/.netlify/functions/stripe-webhook`
- [ ] Check "Events" tab → Should see subscription.created event
- [ ] Status should be "Succeeded" (200 response)
- [ ] Go to Netlify Dashboard → Functions → stripe-webhook logs
- [ ] Should see webhook processing logs with no errors

**Test Subscription Cancellation:**
- [ ] In Customer Portal, click "Cancel subscription"
- [ ] Confirm cancellation
- [ ] Check Supabase: Status should update to 'cancelled'
- [ ] Check webhook logs: Should receive subscription.deleted event

---

### 9. GOOGLE ANALYTICS (Verify Tracking)

- [ ] Open Google Analytics → Reports → Realtime
- [ ] Visit https://bidintell.ai
- [ ] See yourself appear in realtime visitors
- [ ] Click a button → Event tracked (if configured)

---

### 10. DATABASE VERIFICATION

Quick check that new migrations worked:

- [ ] Create a new client → Check client_type is saved
- [ ] Complete onboarding → Check all new columns saved
- [ ] Upload bid → Check full_text column populated

---

## 🐛 BUGS FOUND

**Log any bugs here:**

### Bug #1: [Title]
- **Severity:** P0 (blocks launch) / P1 (breaks feature) / P2 (minor UX) / P3 (nice to fix)
- **What happened:** [description]
- **Steps to reproduce:**
  1. Step 1
  2. Step 2
- **Expected:** [what should happen]
- **Actual:** [what actually happened]
- **Screenshot/Error:** [if applicable]

---

## ✅ LAUNCH READY CRITERIA

**Can launch BETA when:**
- [ ] All "Critical Path" items pass
- [ ] No P0 or P1 bugs remain
- [ ] Chrome + Safari work
- [ ] Mobile is usable
- [ ] Console has no red errors
- [ ] Google Analytics tracking works
- [ ] Beta period displays correctly (free until 4/1/26)
- [ ] User profile fields save properly

**Can launch PAID (April 1, 2026) when:**
- [ ] All above BETA criteria pass
- [ ] Stripe checkout flow works (test mode)
- [ ] Webhook events sync to database
- [ ] Customer Portal accessible
- [ ] Subscription status updates correctly
- [ ] Cancellation flow works
- [ ] MRR tracking accurate in Supabase

**P2/P3 bugs:** Document in KNOWN_BUGS.md, fix post-launch

---

## 📝 NOTES

Add any observations, feedback, or concerns here:

---

**Tester:** Ryan Elder
**Started:** [timestamp]
**Completed:** [timestamp]
**Status:** [ ] PASS / [ ] FAIL (needs fixes)
