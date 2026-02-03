# 🚀 BidIQ Beta Launch Checklist

**Generated:** February 3, 2026
**Status:** Pre-Launch Preparation

---

## ✅ COMPLETED

- [x] Project files copied to repository
- [x] Git repository initialized
- [x] Initial commit created
- [x] .gitignore configured (credentials protected)
- [x] Documentation reviewed

---

## 🔧 TECHNICAL SETUP

### 1. Push to GitHub
- [ ] Authenticate with GitHub (may need personal access token or SSH key)
- [ ] Run: `git push -u origin main`
- [ ] Verify files appear on https://github.com/Ryanbidintell/bidiq-mvp

### 2. Set Up Supabase Database (15 min)
- [ ] Go to https://supabase.com/dashboard
- [ ] Create new project: "bidiq-production" (or use existing)
- [ ] Go to SQL Editor → New Query
- [ ] Copy/paste contents of `supabase_schema_complete.sql`
- [ ] Run the query
- [ ] Verify 5 tables created:
  - [ ] beta_applications
  - [ ] user_settings
  - [ ] user_keywords
  - [ ] general_contractors
  - [ ] projects
- [ ] Get credentials from Settings → API:
  - [ ] Copy Project URL
  - [ ] Copy anon/public key
  - [ ] Keep service_role key SECRET

### 3. Get Claude API Key (5 min)
- [ ] Go to https://console.anthropic.com
- [ ] Generate new API key
- [ ] Copy and save securely
- [ ] Add credits if needed

### 4. Update HTML Files with API Keys (10 min)

**Files to update:**
- [ ] `app.html` (around line 732-734)
- [ ] `index.html` (around line 545)
- [ ] `BidIQ_Founder_Dashboard.html`

**Update these constants:**
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const CLAUDE_API_KEY = 'YOUR_CLAUDE_KEY';
const ADMIN_EMAIL = 'ryan@bidintell.ai'; // Your email
```

### 5. Commit Updated Files
- [ ] Run: `git add app.html index.html BidIQ_Founder_Dashboard.html`
- [ ] Run: `git commit -m "Configure API credentials for production"`
- [ ] Run: `git push`

### 6. Deploy to Hosting (15 min)

**Option A: Netlify (Recommended)**
- [ ] Go to https://app.netlify.com
- [ ] Click "Add new site" → "Deploy manually"
- [ ] Drag the entire bidiq-mvp folder
- [ ] Get your URL (e.g., something.netlify.app)
- [ ] Note URL for DNS setup

**Option B: Vercel**
- [ ] Go to https://vercel.com
- [ ] Import from GitHub
- [ ] Connect Ryanbidintell/bidiq-mvp repository
- [ ] Deploy

### 7. Configure Domain (10 min)
- [ ] Purchase domain (if needed): bidintell.ai
- [ ] In domain registrar (GoDaddy, Namecheap, etc.):
  - [ ] Add A or CNAME record pointing @ to Netlify/Vercel
  - [ ] Add CNAME for www subdomain
  - [ ] (Optional) Add CNAME for app subdomain
- [ ] In Netlify/Vercel:
  - [ ] Add custom domain: bidintell.ai
  - [ ] Enable HTTPS (automatic)
  - [ ] Wait for DNS propagation (can take up to 24 hours)

---

## 🧪 TESTING (15 min each)

### 8. Test Landing Page & Beta Application
- [ ] Visit https://bidintell.ai (or your URL)
- [ ] Verify landing page loads correctly
- [ ] Click "Apply for Beta"
- [ ] Fill out beta application form
- [ ] Submit application
- [ ] Check Supabase Table Editor → beta_applications
- [ ] Verify application saved with status 'pending'

### 9. Test Beta Approval Process
- [ ] In Supabase beta_applications table
- [ ] Find your test application
- [ ] Change status to 'approved'
- [ ] Note: Manual email sending for now (use bidiq_email_templates.md)

### 10. Test Signup/Login
- [ ] Go to Sign In page
- [ ] Sign up with approved email
- [ ] Verify account creates successfully
- [ ] Check Supabase Auth → Users for new user

### 11. Test Main App - Settings
- [ ] After login, verify app.html loads
- [ ] Go to Settings tab
- [ ] Enter office location (e.g., "Lenexa, Kansas")
- [ ] Select trades (CSI divisions)
- [ ] Set risk tolerance
- [ ] Adjust score weights (optional)
- [ ] Click "Save Settings"
- [ ] Verify success message
- [ ] Check Supabase user_settings table

### 12. Test Keywords Management
- [ ] Go to Keywords tab
- [ ] Add "I WANT" keywords (e.g., "fixed price", "lump sum")
- [ ] Add "I DON'T WANT" keywords (e.g., "pay if paid", "waive lien")
- [ ] Add "MUST HAVE" keywords (optional)
- [ ] Save keywords
- [ ] Check Supabase user_keywords table

### 13. Test GC Database
- [ ] Go to GCs tab
- [ ] Click "Add GC"
- [ ] Enter GC name (e.g., "Turner Construction")
- [ ] Give star rating (1-5)
- [ ] Add risk tags (optional: slow_pay, bid_shopping, etc.)
- [ ] Save GC
- [ ] Verify GC appears in list
- [ ] Check Supabase general_contractors table

### 14. Test Bid Analysis (Critical)
- [ ] Go to Analyze tab
- [ ] Upload a test PDF (any construction bid document)
- [ ] Select or add a GC from dropdown
- [ ] Click "Analyze Bid"
- [ ] Wait for AI analysis
- [ ] Verify score generates (0-100)
- [ ] Check all 4 score components:
  - [ ] Location Fit
  - [ ] Keywords & Contract Terms
  - [ ] GC Relationship & Competition
  - [ ] Trade Match
- [ ] Review GO/REVIEW/PASS recommendation
- [ ] Test confidence feedback (agree/too high/too low)
- [ ] Click "Save Project"
- [ ] Verify project saves

### 15. Test Projects View
- [ ] Go to Projects tab
- [ ] Verify saved project appears
- [ ] Click "View Report"
- [ ] Review full analysis
- [ ] Test "Print Report" functionality

### 16. Test Outcome Tracking
- [ ] In Projects tab, find a project
- [ ] Click "Outcome" button
- [ ] Test each outcome type:
  - [ ] Won (enter contract amount, margin, responsiveness)
  - [ ] Lost (enter how high, winner, competitors)
  - [ ] Ghosted (enter days since submission)
  - [ ] Didn't Bid (select reasons - required)
- [ ] Save outcome
- [ ] Check Supabase projects table for outcome_data

### 17. Test Dashboard
- [ ] Go to Dashboard tab
- [ ] Verify stats display:
  - [ ] Total bids analyzed
  - [ ] Win rate
  - [ ] Average score
  - [ ] Recent projects list
- [ ] Check that data updates after adding more projects

### 18. Test Founder Dashboard
- [ ] Visit https://bidintell.ai/admin.html
- [ ] Login with ADMIN_EMAIL
- [ ] Verify beta application stats display
- [ ] Check user activity metrics
- [ ] Test approve/reject application functionality
- [ ] Verify overall platform stats

---

## 🔐 SECURITY CHECK

### 19. Security Verification
- [ ] Verify .gitignore excludes BidIQ_Credentials.txt
- [ ] Confirm credentials file NOT in GitHub repository
- [ ] Check Supabase RLS (Row Level Security) is enabled
- [ ] Verify HTTPS is working on domain
- [ ] Test that non-admin users can't access admin dashboard
- [ ] Confirm users can only see their own data
- [ ] Verify Claude API key has usage limits set

---

## 📧 BETA USER PREPARATION

### 20. Prepare Beta User List (30 min)
- [ ] Identify 10-15 target beta users
- [ ] Collect email addresses
- [ ] Prepare personalized outreach (use bidiq_email_templates.md)
- [ ] Draft follow-up schedule
- [ ] Create feedback form/survey

### 21. Email Templates Ready
- [ ] Review bidiq_email_templates.md
- [ ] Customize beta invitation email
- [ ] Customize approval email with login link
- [ ] Prepare welcome/onboarding email
- [ ] Set up feedback request email (1 week after)

---

## 🎯 LAUNCH DAY

### 22. Final Pre-Launch Check
- [ ] All tests passing
- [ ] DNS fully propagated
- [ ] All credentials working
- [ ] Backup Supabase database
- [ ] Monitor Anthropic API usage dashboard
- [ ] Monitor Supabase logs

### 23. Send Beta Invitations
- [ ] Send first batch (3-5 users)
- [ ] Monitor for signups and issues
- [ ] Be available for support
- [ ] Send next batch after confirming stability

### 24. Post-Launch Monitoring (First 48 Hours)
- [ ] Check Supabase logs every 4-6 hours
- [ ] Monitor Anthropic API usage
- [ ] Watch for error messages
- [ ] Respond to beta user questions within 4 hours
- [ ] Track: signups, analyses completed, outcomes recorded

---

## 📊 SUCCESS METRICS

Track these in the first 2 weeks:
- [ ] 10+ beta users signed up
- [ ] 50+ bids analyzed total
- [ ] 30%+ of bids have outcomes recorded
- [ ] User feedback collected from 7+ users
- [ ] 7/10 would pay $99/month (target validation)

---

## 🐛 COMMON ISSUES TO WATCH FOR

**"Could not locate your office"**
- Issue: Geocoding API rate limit or bad format
- Fix: Enter as "City, State, USA"

**"Login failed"**
- Issue: Email not approved for beta
- Fix: Check beta_applications status = 'approved'

**"Analysis Error"**
- Issue: Claude API key or rate limit
- Fix: Check console.anthropic.com usage

**Projects not saving**
- Issue: Supabase RLS or auth issue
- Fix: Check browser console, verify user authenticated

---

## 📞 SUPPORT RESOURCES

- Supabase Dashboard: https://supabase.com/dashboard
- Anthropic Console: https://console.anthropic.com
- Netlify/Vercel Dashboard: (your URL)
- Browser Console: F12 → Console tab for debugging

---

## 🎉 LAUNCH DECISION

**Ready to launch when:**
- [ ] All technical setup complete (items 1-7)
- [ ] All tests passing (items 8-18)
- [ ] Security verified (item 19)
- [ ] Beta users identified (item 20)
- [ ] You're confident in the product

**Estimated time to launch:** 2-4 hours of focused work

---

**Next Steps:**
1. Start with Technical Setup section
2. Update API credentials
3. Deploy to hosting
4. Run all tests
5. Send to first 3 beta users
6. Monitor and iterate

**You've got this! 🚀**
