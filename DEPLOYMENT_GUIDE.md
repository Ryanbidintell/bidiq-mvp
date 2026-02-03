# 🚀 BidIQ MVP Deployment Guide

**Version:** 1.0  
**Date:** January 29, 2026  
**Status:** Ready for Beta Launch

---

## 📁 Files You Need

You have **5 files** ready for deployment:

| File | Purpose | Deploy To |
|------|---------|-----------|
| `BidIQ_MVP_v5_Supabase.html` | Main Application (Dashboard, Analysis, Outcomes) | app.bidintell.ai |
| `BidIQ_MVP_v6_Beta.html` | Landing Page + Beta Application + Login | bidintell.ai (root) |
| `BidIQ_Founder_Dashboard.html` | Your Admin Panel | admin.bidintell.ai (or private) |
| `supabase_schema_complete.sql` | Database Schema | Supabase SQL Editor |
| `roi-calculator.html` | Marketing Asset | bidintell.ai/roi (optional) |

**Supporting Files (for reference):**
- `BidIQ_Product_Bible_v1.4.md` - Product specs
- `BidIQ_Brand_Guide.md` - Brand guidelines
- `bidiq_email_templates.md` - Email templates for beta management

---

## 🔧 Step-by-Step Deployment

### Step 1: Set Up Supabase Database (15 minutes)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project (or create new: "bidiq-production")

2. **Run the Schema**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"
   - Copy/paste entire contents of `supabase_schema_complete.sql`
   - Click "Run" (or Cmd+Enter)
   - Verify you see: "5 rows" returned (the 5 tables)

3. **Verify Tables Created**
   - Click "Table Editor" in left sidebar
   - You should see these tables:
     - ✅ beta_applications
     - ✅ user_settings
     - ✅ user_keywords
     - ✅ general_contractors
     - ✅ projects

4. **Get Your Credentials**
   - Go to "Project Settings" → "API"
   - Copy these values:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon/public key**: `eyJhbGc...` (long string)
   - ⚠️ Keep your service_role key SECRET

### Step 2: Configure the HTML Files (10 minutes)

**In `BidIQ_MVP_v5_Supabase.html`:**

Find these lines (around line 732-734):
```javascript
const SUPABASE_URL = 'https://szifhqmrddmdkgschkkw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
const CLAUDE_API_KEY = 'sk-ant-api03-...';
```

Replace with YOUR credentials:
- Your Supabase Project URL
- Your Supabase Anon Key
- Your Claude API Key (from console.anthropic.com)

**In `BidIQ_MVP_v6_Beta.html`:**

Find the same configuration section (around line 545) and update:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

**In `BidIQ_Founder_Dashboard.html`:**

Find the configuration section and update with your Supabase credentials.

### Step 3: Set Up Admin Email (5 minutes)

In both v5 and v6 files, find the ADMIN_EMAIL constant:
```javascript
const ADMIN_EMAIL = 'ryan@bidintell.ai'; // Change to your email
```

This email gets admin access to the Founder Dashboard and beta application management.

### Step 4: Deploy to Hosting (15 minutes)

**Option A: Netlify (Recommended - Free)**

1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Create a folder structure:
   ```
   bidiq-site/
   ├── index.html        (rename v6 to this)
   ├── app.html          (rename v5 to this)
   ├── admin.html        (Founder Dashboard)
   └── roi.html          (ROI Calculator)
   ```
4. Drag the folder to Netlify
5. Get your URL: `something.netlify.app`
6. Add custom domain: `bidintell.ai`

**Option B: Vercel (Also Free)**

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import from folder or connect GitHub
4. Deploy
5. Add custom domain

**Option C: Simple File Hosting**

If you just want to test locally or on a simple host:
- Just open the HTML files in a browser
- They work as standalone files
- For production, upload to any web server

### Step 5: Configure Domain DNS (10 minutes)

If using bidintell.ai domain:

1. **In your domain registrar (GoDaddy, Namecheap, etc.):**
   
   Add these DNS records:
   ```
   Type: A or CNAME
   Host: @
   Value: (your Netlify/Vercel IP or CNAME)
   
   Type: CNAME
   Host: www
   Value: (your Netlify/Vercel subdomain)
   
   Type: CNAME
   Host: app
   Value: (same as above, if using subdomain)
   ```

2. **In Netlify/Vercel:**
   - Add custom domain
   - Enable HTTPS (automatic with Let's Encrypt)

### Step 6: Test the Full Flow (15 minutes)

1. **Test Landing Page (v6)**
   - Visit bidintell.ai
   - Verify landing page loads
   - Test "Apply for Beta" form
   - Check that application saves to Supabase

2. **Test Beta Approval**
   - In Supabase Table Editor → beta_applications
   - Find your test application
   - Change status to 'approved'

3. **Test Sign Up/Login**
   - Go to Sign In page
   - Sign up with the approved email
   - Verify account creates

4. **Test Main App (v5)**
   - After login, verify dashboard loads
   - Go to Settings tab
   - Enter your office location (e.g., "Lenexa, Kansas")
   - Save settings

5. **Test Analysis**
   - Upload a test PDF (any construction bid document)
   - Select or add a GC
   - Click "Analyze Bid"
   - Verify score generates

6. **Test Outcome Tracking**
   - Save a project
   - Go to Projects tab
   - Click "Outcome" button
   - Record an outcome

7. **Test Founder Dashboard**
   - Visit admin.bidintell.ai
   - Login with admin email
   - Verify you see beta application stats

---

## 🔐 Security Checklist

Before going live:

- [ ] Supabase RLS policies are enabled (done in schema)
- [ ] API keys are not exposed in public repositories
- [ ] Claude API key is valid and has sufficient credits
- [ ] Admin email is correctly set
- [ ] HTTPS is enabled on your domain
- [ ] Tested with non-admin user to verify permissions

---

## 🐛 Troubleshooting

### "Could not locate your office"

**Cause:** Geocoding API (Nominatim) rate limit or format issue

**Fix:** 
1. Wait 1 second between geocoding requests (already implemented)
2. Enter city name more specifically: "Lenexa, KS, USA"
3. Check browser console for actual error message

### "Login failed"

**Cause:** Email not approved for beta, or password issue

**Fix:**
1. Check beta_applications table for email status
2. Ensure status = 'approved'
3. Try password reset if needed

### "Analysis Error"

**Cause:** Claude API key invalid or rate limited

**Fix:**
1. Check console.anthropic.com for API key status
2. Verify you have credits/usage remaining
3. Check browser console for specific error

### Projects not saving

**Cause:** Supabase RLS policy or connection issue

**Fix:**
1. Check browser console for Supabase errors
2. Verify user is authenticated
3. Check Table Editor to see if data exists

---

## 📊 Post-Launch Monitoring

### In Supabase:
- Table Editor → Check data is being saved
- Logs → Watch for errors
- Auth → Monitor user signups

### In Anthropic Console:
- Usage → Monitor API calls
- Check for rate limit issues

### In Your Email:
- Watch for beta applications
- Respond within 24-48 hours

---

## 🎯 Beta Launch Checklist

- [ ] Database schema deployed to Supabase
- [ ] HTML files updated with correct credentials
- [ ] Files deployed to hosting
- [ ] Domain DNS configured
- [ ] SSL/HTTPS working
- [ ] Full user flow tested (signup → analysis → outcome)
- [ ] Founder dashboard tested
- [ ] 10 beta user emails ready to send
- [ ] Email templates ready (see bidiq_email_templates.md)

---

## 📞 Support

If you hit issues:
1. Check browser console (F12 → Console tab)
2. Check Supabase logs
3. Check Anthropic usage dashboard
4. Review this guide's troubleshooting section

---

**You're ready to launch! 🚀**

Go get those 10 beta users.
