# BidIntell Complete Launch Guide

**Everything you need to launch your beta in one place.**

---

## 📋 Quick Overview

This guide combines all setup instructions, checklists, and detailed steps. Follow in order:

1. **Database Migrations** (5 min) - Run these first
2. **Google Analytics Setup** (10 min) - Get tracking working
3. **Google Search Console** (10 min) - Get indexed by Google
4. **SEO Assets** (30 min) - Create favicon and OG image
5. **Stripe Setup** (20 min) - Configure payment plans
6. **Pre-Launch Testing** (1-2 hours) - Test everything
7. **Launch Day** - Send invites and monitor

**Total Setup Time: 2-3 hours**

---

## 🗄️ STEP 1: Database Migrations (CRITICAL - Run First)

### Run All Migrations:
```bash
cd supabase
supabase migration up
```

### Migrations to Apply:
- [x] `20260206_add_full_text_column.sql` - Enables re-analysis with updated extraction prompts
- [ ] `20260207_add_api_usage_tracking.sql` - Tracks API costs for profitability analysis
- [ ] `20260207_add_client_types.sql` - Adds client type tracking (GCs, subs, developers, municipalities)

### Verify Migrations:
```bash
# Check that all tables exist
supabase db list

# Verify key tables:
# - projects (with full_text column)
# - api_usage (new)
# - user_revenue (new)
# - general_contractors (with client_type column)
# - user_settings (with client_types array)
```

---

## 📊 STEP 2: Google Analytics 4 Setup (REQUIRED)

### Create GA4 Property (10 min)

**Step 1: Create Property**
1. Go to https://analytics.google.com
2. Click "Admin" (bottom left)
3. Click "Create Property"
4. Name: "BidIntell"
5. Select your timezone and currency
6. Click "Create"

**Step 2: Get Measurement ID**
1. After creating property, go to "Data Streams"
2. Click "Add stream" → "Web"
3. URL: `https://bidintell.ai`
4. Stream name: "BidIntell Website"
5. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

**Step 3: Replace Placeholder in Code**

In all 3 HTML files, replace:
```javascript
gtag('config', 'G-XXXXXXXXXX');
```

With your actual Measurement ID:
```javascript
gtag('config', 'G-ABC123XYZ');
```

**Files to update:**
- [ ] `index_professional.html` (line ~37)
- [ ] `pricing.html` (line ~37)
- [ ] `roi-calculator-new.html` (line ~37)

**Step 4: Test It Works**
1. Open your site in a browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Reload page
5. Look for requests to `google-analytics.com/g/collect`
6. Check real-time reports in GA4 (should see yourself)

---

## 🔍 STEP 3: Google Search Console Setup (10 min)

### Verify Your Site

**Step 1: Add Property**
1. Go to https://search.google.com/search-console
2. Click "Add Property"
3. Enter: `https://bidintell.ai`
4. Choose verification method:
   - **HTML tag** (easiest): Add meta tag to `<head>` of all pages
   - **HTML file**: Upload verification file to root
   - **Google Analytics**: Auto-verify if GA is set up
   - **DNS**: Add TXT record to domain

**Recommended: HTML Tag Method**
1. Search Console gives you a tag like: `<meta name="google-site-verification" content="abc123...">`
2. Add it to `<head>` section of all 3 HTML files
3. Click "Verify" in Search Console

**Step 2: Submit Sitemap**
1. In Search Console, click "Sitemaps" (left menu)
2. Enter: `https://bidintell.ai/sitemap.xml`
3. Click "Submit"
4. Should show "Success" with number of discovered URLs

**Step 3: Request Indexing**
1. Use "URL Inspection" tool (top of Search Console)
2. Enter each page URL
3. Click "Request Indexing" (takes 1-2 days)

**Request indexing for:**
- [ ] `https://bidintell.ai/` (or `/index_professional.html`)
- [ ] `https://bidintell.ai/pricing.html`
- [ ] `https://bidintell.ai/roi-calculator-new.html`

---

## 🎨 STEP 4: Create SEO Assets (30 min)

### Favicon (5 min)

**Option 1: Quick Emoji Favicon**
```bash
curl "https://emojicdn.elk.sh/🎯" -o favicon.png
```

**Option 2: Custom Favicon**
1. Go to https://favicon.io or use Canva
2. Upload your logo or create icon
3. Download favicon pack
4. Place `favicon.png` in root directory

**Verify:**
- [ ] File exists at `/favicon.png`
- [ ] File size < 100KB
- [ ] Appears in browser tab when you visit site

### Open Graph Image (30 min)

**Create OG Image (1200x630px):**
1. Design in Canva or Figma
2. Include:
   - BidIntell logo (top left or center)
   - Tagline: "AI Decision Intelligence for Construction Bidding"
   - Visual: Screenshot of app or mockup
   - Background: Professional (construction theme)
3. Export as `og-image.png`
4. Optimize: Go to https://tinypng.com and compress
5. Place in root directory

**Test OG Tags:**
- [ ] Facebook: https://developers.facebook.com/tools/debug/
- [ ] Twitter: https://cards-dev.twitter.com/validator
- [ ] LinkedIn: https://www.linkedin.com/post-inspector/

Enter your URL and verify:
- Image appears correctly
- Title and description look good
- No errors

---

## ✅ STEP 5: Verify SEO Implementation

### All Pages Should Have:
- [ ] Unique title tags with keywords
- [ ] Meta descriptions (150-160 characters)
- [ ] Canonical URLs
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data (JSON-LD)

### Test Tools:
1. **Rich Results Test**: https://search.google.com/test/rich-results
   - Enter each page URL
   - Should show valid SoftwareApplication, Product, or WebApplication schema
2. **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
   - All pages should pass
3. **PageSpeed Insights**: https://pagespeed.web.dev
   - Check performance scores (aim for 80+)

### Files Should Be Accessible:
- [ ] `https://bidintell.ai/robots.txt` - Opens and shows sitemap URL
- [ ] `https://bidintell.ai/sitemap.xml` - Opens and shows all 4 URLs
- [ ] `https://bidintell.ai/favicon.png` - Image loads
- [ ] `https://bidintell.ai/og-image.png` - Image loads (1200x630px)

---

## 💳 STEP 6: Stripe Integration Setup

### 1. Create Stripe Account (5 min)
- [ ] Sign up at https://stripe.com
- [ ] Complete business profile
- [ ] Get API keys from Dashboard → Developers → API keys
  - Publishable key: `pk_live_...` or `pk_test_...`
  - Secret key: `sk_live_...` or `sk_test_...`

**Use Test Mode for Beta!** Switch to live mode after validating everything works.

### 2. Create Products & Pricing (10 min)

Go to Products → Add Product. Create these 4 plans:

**Beta Plan (Manual for first 20 users)**
- Name: "BidIntell Beta"
- Description: "FREE 60 days, then $39/month locked rate"
- Pricing: $39/month recurring
- Note: Manually apply 60-day free trial or use Stripe coupon

**Starter Plan**
- [ ] Name: "BidIntell Starter"
- [ ] Description: "Perfect for solo operators"
- [ ] Pricing: $49/month recurring
- [ ] Features: "20 bid analyses/month, additional bids $3 each"

**Professional Plan**
- [ ] Name: "BidIntell Professional"
- [ ] Description: "For growing contractors"
- [ ] Pricing: $99/month recurring
- [ ] Features: "50 bid analyses/month, client type profitability tracking"

**Team Plan**
- [ ] Name: "BidIntell Team"
- [ ] Description: "For teams and larger operations"
- [ ] Pricing: $299/month recurring
- [ ] Features: "Unlimited bid analyses, up to 5 team members"

### 3. Add Stripe Keys to Environment (5 min)

**If using .env file:**
```bash
# Add to .env in root directory
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**If using Supabase secrets:**
```bash
# Add via Supabase dashboard or CLI
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_...
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### 4. Set Up Webhook (Optional - Build Later)

For beta, you can manually track revenue:
```sql
-- Add revenue records manually during beta
INSERT INTO user_revenue (user_id, plan_name, mrr, status)
VALUES ('user-uuid-here', 'starter', 49.00, 'active');
```

**After Beta**: Build webhook to automatically sync Stripe → Supabase
- Webhook URL: `https://your-domain.com/api/stripe-webhook`
- Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 🧪 STEP 7: Pre-Launch Testing (Test Everything!)

### Core Features (30 min)
- [ ] User signup/login works
- [ ] Onboarding completes all 10 steps (including client types)
- [ ] Document upload and analysis works
- [ ] AI recommendations show correct scores (not 0/100)
- [ ] Re-analysis re-extracts with updated prompts
- [ ] Print report works in both analysis and report views
- [ ] Building type shows correctly in subtitle
- [ ] GC relationship tracking works

### NEW Features to Test (30 min)
- [ ] Client types onboarding step (Step 8) shows all 4 options
- [ ] Can select multiple client types
- [ ] Client type dropdown when adding clients works
- [ ] Client Type Performance analytics table displays
- [ ] API usage tracking logs calls (check `api_usage` table)
- [ ] Admin profitability dashboard loads and shows costs

### Test User Journey (15 min)
1. Create fresh account
2. Complete onboarding from start to finish
3. Upload a test bid document
4. Analyze it
5. Add outcome (won/lost)
6. View analytics page
7. Check profitability by client type
8. Print report

### Browser Testing (15 min)
- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 📧 STEP 8: Beta User Communication

### Email Template

**Send this to your interested testers:**

```
Subject: You're in! BidIntell Beta Access 🎯

Hey [Name],

You're officially in the BidIntell beta! Here's everything you need to get started.

🚀 Get Started:
1. Sign up at https://bidintell.ai
2. Complete the quick onboarding (~5 min)
3. Analyze your first bid

📊 What We Need From You:
- Use it on real bids for 2-4 weeks
- Report any bugs or issues (just reply to this email)
- Share honest feedback about what works and what doesn't

🎁 Your Beta Perks:
✓ Free access during beta period (60 days)
✓ $39/month locked rate when we launch (vs. $49-99 regular pricing)
✓ Direct line to me for support and feature requests
✓ Shape the product with your feedback

The app analyzes bid documents, scores opportunities, and helps you track which clients are actually profitable. It's built specifically for construction subcontractors and trades.

Reply with any questions or issues!

Thanks for being an early supporter,
Ryan

P.S. - If you know other contractors who might benefit, feel free to share: https://bidintell.ai
```

### Follow-Up Email (Send after 3 days)

```
Subject: How's BidIntell working for you?

Hey [Name],

Just checking in! Have you had a chance to analyze any bids yet?

Quick questions:
- Did you complete onboarding okay?
- Any confusion or roadblocks?
- What would make it more useful?

No pressure - just want to make sure it's actually helpful.

Reply anytime,
Ryan
```

---

## 🚀 STEP 9: Launch Day Checklist

### Day Before Launch
- [ ] Run database migrations: `supabase migration up`
- [ ] Test full workflow one more time
- [ ] Verify Google Analytics is tracking (test on staging or localhost)
- [ ] Confirm sitemap submitted to Search Console
- [ ] Prepare beta invite emails with personalized names
- [ ] Double-check all links work on live site

### Launch Day Morning
- [ ] Send beta invites (in batches of 5-10 to manage support load)
- [ ] Post launch announcement on LinkedIn with link
- [ ] Post on Twitter/X with link
- [ ] Check Google Analytics for first traffic (refresh every hour)
- [ ] Request indexing in Search Console for all pages

### Launch Day - Stay Available
- [ ] Monitor email for user questions
- [ ] Watch for errors in Supabase logs
- [ ] Respond to feedback within 1-2 hours
- [ ] Check Stripe dashboard for any payment issues
- [ ] Monitor API usage costs in real-time

### First Week Post-Launch
- [ ] Check in with each user individually via email
- [ ] Track key metrics:
  - Signups (target: 10-20)
  - Projects analyzed per user (target: 5+)
  - Bugs reported
  - Feature requests
- [ ] Monitor costs:
  - API costs per user (target: <$5/month)
  - Total infrastructure costs
- [ ] SEO monitoring:
  - Check Search Console for indexing status
  - Monitor keyword rankings
  - Set up Google Alerts for "BidIntell"
- [ ] Share early wins on LinkedIn (with permission)

---

## 📊 Success Metrics & Targets

### Beta Phase (Month 1)
- **Signups**: 10-20 beta users
- **Engagement**: 5+ projects per user
- **Retention**: 70%+ weekly active users
- **API Costs**: <$5 per user/month
- **Gross Margin**: 95%+ at $49-99/month pricing
- **Support**: <2 hour response time

### SEO Metrics (Week 1)
- **Indexing**: All 3 pages indexed by Google
- **Brand Searches**: Appearing for "BidIntell" searches
- **Traffic**: 10-50 organic visits from launch posts
- **Social**: 500+ impressions on LinkedIn/Twitter posts

### SEO Metrics (Month 1-2)
- **Keywords**: Ranking for long-tail keywords (page 3-5)
  - "construction bid analysis software"
  - "subcontractor bidding tool"
  - "GC relationship tracking"
- **Traffic**: 50-100 organic visits/month
- **Backlinks**: Listed in 2-3 construction software directories

### SEO Metrics (Month 3-6)
- **Keywords**: Primary keywords move to page 2-3
  - "construction bid software"
  - "subcontractor software"
  - "bid scoring software"
- **Traffic**: 200-500 organic visits/month
- **Backlinks**: 10+ quality backlinks from construction sites

---

## 🎯 SEO Keywords Strategy

### Primary Keywords (High Priority)
Target these in your content and meta tags:
1. **construction bid software** (500 searches/mo)
2. **subcontractor bidding software** (200 searches/mo)
3. **construction estimating software** (1,000 searches/mo)
4. **AI construction software** (150 searches/mo)
5. **bid analysis software** (100 searches/mo)

### Long-Tail Keywords (Easy Wins)
These are easier to rank for quickly:
- "how to analyze construction bids"
- "construction bid scoring software"
- "GC relationship tracking"
- "construction contract risk detection"
- "subcontractor bid management"
- "should I bid this construction project"

### Content Ideas for Future Blog:
1. "How to Analyze a Construction Bid: 10-Point Checklist"
2. "Red Flags in Construction Contracts Every Sub Should Know"
3. "Tracking GC Relationships: Why It Matters for Win Rate"
4. "Construction Bid Scoring: The Data-Driven Approach"

---

## 📈 What's Already Done ✅

You don't need to do these - they're already implemented:

### Meta Tags (All Pages) ✅
- Title tags optimized with keywords
- Meta descriptions (150-160 chars) with call-to-action
- Keywords meta tags
- Canonical URLs
- Open Graph tags for Facebook/LinkedIn
- Twitter Card tags
- Viewport meta for mobile

### Structured Data (JSON-LD) ✅
- Landing page: SoftwareApplication + Organization schema
- Pricing page: Product with multiple Offer schemas
- ROI Calculator: WebApplication schema
- Helps Google show rich snippets

### SEO Files ✅
- robots.txt: Allows all crawlers, blocks /app.html
- sitemap.xml: Lists all public pages with priority

### Analytics Integration ✅
- Google Analytics 4 tracking code on all pages
- Event tracking for ROI calculator interactions
- Ready for custom conversion events

---

## 🔗 Helpful Tools & Resources

### Free SEO Tools
- **Google Search Console**: https://search.google.com/search-console
  - Monitor indexing and keyword rankings
- **Google Analytics 4**: https://analytics.google.com
  - Track traffic and conversions
- **Google PageSpeed Insights**: https://pagespeed.web.dev
  - Check site performance
- **Bing Webmaster Tools**: https://www.bing.com/webmasters
  - Get indexed on Bing (often overlooked)
- **Ubersuggest**: https://neilpatel.com/ubersuggest/
  - Free keyword research (3 searches/day)

### Social Sharing Validators
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

### Image & Asset Tools
- **Favicon Generator**: https://favicon.io
- **Image Compression**: https://tinypng.com
- **OG Image Creator**: https://www.canva.com (free)

### Paid SEO Tools (Optional)
**Not needed for beta, but useful later:**
- Ahrefs ($99/mo) - Best for backlinks and keyword research
- SEMrush ($119/mo) - All-in-one SEO suite
- Moz ($99/mo) - Good for local SEO

---

## 🆘 Troubleshooting

### Google Analytics Not Tracking
1. Check browser console for errors
2. Verify Measurement ID is correct (starts with G-)
3. Check Network tab for requests to `google-analytics.com`
4. Try in incognito mode (ad blockers can interfere)
5. Wait 24 hours - sometimes takes time to appear in reports

### Sitemap Not Submitting
1. Verify sitemap accessible at `https://bidintell.ai/sitemap.xml`
2. Check XML format is valid (use https://www.xml-sitemaps.com/validate-xml-sitemap.html)
3. Ensure all URLs start with `https://` not `http://`
4. Try submitting directly in robots.txt (already done)

### Pages Not Indexing
1. Check robots.txt isn't blocking Google
2. Verify site is live and accessible publicly
3. Request indexing manually in Search Console
4. Wait 3-7 days - indexing takes time
5. Check for crawl errors in Search Console

### OG Image Not Showing
1. Verify image is exactly 1200x630px
2. File size should be < 1MB (ideally < 300KB)
3. Clear cache on social media debuggers
4. Wait 24 hours for cache to refresh
5. Make sure image URL is absolute (not relative)

### Stripe Test Payments Failing
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any ZIP code
5. Check Stripe Dashboard → Logs for errors

---

## ✅ Final Pre-Launch Checklist

Print this and check off as you go:

**Database & Backend**
- [ ] Migrations run successfully
- [ ] All tables exist and have correct columns
- [ ] RLS policies allow users to access their own data
- [ ] API usage tracking logs properly

**Analytics & SEO**
- [ ] GA4 Measurement ID replaced in all 3 HTML files
- [ ] Real-time tracking works in GA4
- [ ] Search Console verified
- [ ] Sitemap submitted
- [ ] Favicon exists and displays
- [ ] OG image exists and displays on social validators
- [ ] All meta tags correct on all pages

**Stripe & Payments**
- [ ] Stripe account created
- [ ] All 4 pricing plans created
- [ ] API keys added to environment
- [ ] Test payment works

**Testing**
- [ ] Full user journey tested
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Works in Chrome, Safari, mobile browsers
- [ ] All new features work (client types, API tracking, etc.)

**Communication**
- [ ] Beta invite emails drafted
- [ ] Follow-up emails scheduled
- [ ] Support email monitored

**Launch Day**
- [ ] Beta invites sent
- [ ] LinkedIn post published
- [ ] Twitter post published
- [ ] Monitoring for errors
- [ ] Responding to users quickly

---

## 🎉 You're Ready to Launch!

If you've completed all the above steps, you're ready to go live with your beta.

**Remember:**
- Beta is about learning, not perfection
- Respond to users quickly (within 2 hours)
- Track everything (signups, costs, feedback)
- Iterate based on real user feedback
- SEO takes 1-3 months to show results

**Good luck with your launch! 🚀**

---

**Document created**: February 7, 2026
**Last updated**: February 7, 2026
**Status**: Ready for Beta Launch
