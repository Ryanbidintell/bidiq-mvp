# BidIQ Testing Checklist

**Last Updated:** February 9, 2026
**Version:** 1.5 (Beta Testing Phase)

---

## 🎯 Purpose

This checklist ensures critical features work before deploying changes. Run these tests after making significant code changes.

**When to test:**
- ✅ Before deploying to production
- ✅ After database schema changes
- ✅ After modifying scoring logic
- ✅ After UI changes to critical flows
- ✅ After updating backend functions

---

## ⚡ Quick Smoke Test (5 minutes)

**Run this after ANY change:**

- [ ] App loads without console errors
- [ ] Login/signup works
- [ ] Dashboard displays recent projects
- [ ] Can switch between tabs
- [ ] Can view a project report
- [ ] Settings save successfully

**If any fail, STOP and fix before proceeding.**

---

## 🔐 Authentication & Onboarding

### New User Signup Flow

**Steps:**
1. Open app in incognito window
2. Click "Sign Up" or trigger onboarding
3. Enter email and password
4. Complete onboarding wizard:
   - Step 1: Company info (name, type)
   - Step 2: Office location (address autocomplete)
   - Step 3: Service area (preferred/max radius)
   - Step 4: Keywords (add at least 2)
   - Step 5: GCs (add at least 1)
5. Click "Complete Setup"

**Expected Results:**
- [ ] Email/password accepted
- [ ] Google Maps autocomplete works
- [ ] Settings saved to database
- [ ] Keywords saved to database
- [ ] GCs saved to database
- [ ] User redirected to dashboard
- [ ] No console errors
- [ ] `onboarding_completed` = true in database

**Common Issues:**
- Google Maps API key restrictions
- decision_time type mismatch
- Missing user_id in database inserts

---

### Existing User Login Flow

**Steps:**
1. Open app
2. Enter existing credentials
3. Log in

**Expected Results:**
- [ ] User authenticated
- [ ] Dashboard loads with existing projects
- [ ] Settings populated in Settings tab
- [ ] No "onboarding" modal shown
- [ ] No console errors

---

## 📤 Upload & Analysis Flow

### Upload Single PDF

**Steps:**
1. Go to **Analyze** tab
2. Drop or select a bid PDF
3. Select at least 1 GC
4. Click "Analyze Bid"
5. Wait for extraction to complete
6. View report

**Expected Results:**
- [ ] PDF appears in file list
- [ ] File size shown correctly
- [ ] GC selector works (autocomplete dropdown)
- [ ] Selected GCs appear in "Selected GCs" box
- [ ] "Analyze Bid" button enabled
- [ ] Progress bar shows: "Extracting text..." → "AI analyzing..." → "Calculating score..."
- [ ] Extraction completes without errors
- [ ] Report displayed with:
  - Project name (not "Untitled Project")
  - Building type (not "Other")
  - Location (city, state)
  - Distance from office
  - GC name(s) shown (not "Unknown")
  - BidIndex score (0-100)
  - Recommendation (GO/REVIEW/PASS)
  - AI Analysis Summary
  - How to Improve Your Chances
- [ ] Project auto-saved to database
- [ ] Project appears in Dashboard > Recent Activity
- [ ] Project appears in Projects tab

**Common Issues:**
- Backend function not running (use Netlify Dev)
- Claude API key invalid (401 error)
- JSON parsing errors (markdown code blocks)
- GC showing "Unknown" (pulling from wrong field)
- Building type always "Other" (extraction failed)

---

### Upload Multiple PDFs

**Steps:**
1. Go to **Analyze** tab
2. Drop/select 2-3 PDFs at once
3. Select GCs
4. Click "Analyze Bid"

**Expected Results:**
- [ ] All PDFs listed
- [ ] Combined text from all PDFs analyzed
- [ ] Single project created (not multiple)
- [ ] Extraction pulls data from all PDFs

---

## 📊 Scoring Engine

### Verify Score Components

**Steps:**
1. Analyze a bid
2. View report
3. Check "AI Scoring Analysis" card

**Expected Results:**
- [ ] **Location Score** (0-100)
  - Distance calculated correctly
  - Score matches distance logic
  - User office and project location shown
- [ ] **Keywords Score** (0-100)
  - Good keywords detected
  - Bad keywords (risks) detected
  - Score reflects keyword matches
- [ ] **GC Score** (0-100)
  - GC rating factored in (1-5 stars)
  - Multiple GCs reduce score (competition)
- [ ] **Trade Match Score** (0-100)
  - CSI divisions detected
  - Trade keywords found
- [ ] **Final Score** = Weighted average
  - Location: 30%
  - Keywords: 25%
  - GC: 25%
  - Trade: 20%
- [ ] **Recommendation** matches score:
  - 80+ = GO (green)
  - 60-79 = REVIEW (yellow)
  - <60 = PASS (red)

**Test Cases:**
- Close project (5 miles) = high location score
- Far project (100+ miles) = low location score
- 5-star GC = high GC score
- 1-star GC or unknown GC = low GC score
- Multiple GCs = lower GC score than single GC

---

## 🗂️ Projects Management

### Projects Table

**Steps:**
1. Go to **Projects** tab
2. Verify projects list

**Expected Results:**
- [ ] All projects shown
- [ ] Columns display correctly:
  - **Project:** Name + building type
  - **GC:** GC name(s), not "Unknown"
  - **Location:** City, State
  - **Score:** Number + Recommendation badge
  - **Outcome:** PENDING/WON/LOST/GHOST badge
  - **Date:** Bid deadline (if available) or analysis date
- [ ] Sorting works (Date, Score, Outcome)
- [ ] Filtering works:
  - Search by project name
  - Filter by outcome
  - Filter by score range
- [ ] "View" button opens report
- [ ] "Outcome" button opens outcome modal
- [ ] "Delete" button deletes project

---

### Add Outcome

**Steps:**
1. Go to **Projects** tab
2. Click "Outcome" on a pending project
3. Select outcome (Won, Lost, Ghost, Declined)
4. Fill in details:
   - Outcome date
   - Contract amount (if won)
   - Margin % (if won)
   - Confidence (1-5)
   - Notes
5. Save

**Expected Results:**
- [ ] Modal opens
- [ ] Fields shown based on outcome type
- [ ] Date picker works
- [ ] Outcome saved to database
- [ ] Outcome badge updated in projects table
- [ ] Dashboard stats updated (win rate, data moat)

---

### Export CSV

**Steps:**
1. Go to **Projects** tab
2. Click "Export CSV"

**Expected Results:**
- [ ] CSV file downloaded
- [ ] Contains all projects
- [ ] Columns: Project, GC, Location, Score, Outcome, Date

---

## 📱 Dashboard

### Recent Activity

**Steps:**
1. Go to **Dashboard** tab
2. Check "Recent Activity" card

**Expected Results:**
- [ ] Shows 5 most recent projects
- [ ] Columns: Project, GC, Score, Outcome, View button
- [ ] GC names shown (not "Unknown")
- [ ] Clicking "View" opens report
- [ ] Empty state shown if no projects

---

### Stats Cards

**Steps:**
1. Go to **Dashboard** tab
2. Check stats at top

**Expected Results:**
- [ ] **Projects Analyzed:** Total count
- [ ] **Avg Score:** Average of all project scores
- [ ] **Win Rate:** (Wins / Total outcomes) * 100
- [ ] **Data Moat:** (Projects with outcomes / Total) * 100
- [ ] Stats update after adding outcome

---

## 📄 Report View

### Full Report Display

**Steps:**
1. View a project report (from Dashboard or Projects tab)
2. Review all sections

**Expected Results:**
- [ ] **Project Details Card**
  - All fields populated (name, type, city, state, GCs)
  - Fields editable
  - "Save Changes" button works
- [ ] **AI Scoring Analysis Card**
  - Final score + recommendation badge
  - All 4 component scores shown
  - Score breakdown visible
- [ ] **AI Recommendations Card**
  - AI Analysis Summary paragraph (plain English)
  - "How to Improve Your Chances" bullet list
  - "Ask Sam a Question" section
- [ ] **Extracted Data Card**
  - Project name, location, GCs, building size
  - Owner, architect info
  - Bid deadline
  - Contract risk clauses (if detected)
- [ ] "Back" button returns to previous screen
- [ ] "Print Report" opens printable version
- [ ] "Re-analyze" button works (if applicable)

---

### Print Report

**Steps:**
1. View project report
2. Click "Print Report"
3. Review printable version

**Expected Results:**
- [ ] New window/tab opens
- [ ] Professional formatting
- [ ] Company name in header
- [ ] Report ID and date
- [ ] All sections present:
  - Executive summary
  - AI Analysis Summary
  - How to Improve Your Chances
  - Score breakdown
  - Project details
  - Risk analysis
- [ ] Print dialog opens (or Ctrl+P works)

---

### Edit & Save Report

**Steps:**
1. View project report
2. Edit fields:
   - Project name
   - Building type
   - City/State
   - Add/remove GCs
3. Click "Save Changes"

**Expected Results:**
- [ ] Changes saved to database
- [ ] Success message shown
- [ ] Changes reflected in Projects table
- [ ] Changes reflected in Dashboard

---

## ⚙️ Settings

### Edit Settings

**Steps:**
1. Go to **Settings** tab
2. Edit fields:
   - Company name
   - Office address (use autocomplete)
   - Service area radii
   - Capacity
   - Keywords (add/remove)
   - GCs (add/remove, edit ratings)
3. Click "Save Settings"

**Expected Results:**
- [ ] All fields editable
- [ ] Google Maps autocomplete works for address
- [ ] Keywords saved to database
- [ ] GCs saved to database
- [ ] Settings saved to database
- [ ] Success message shown
- [ ] No console errors

---

### GC Management

**Steps:**
1. Go to **Settings** tab → "Manage GCs" section
2. Add new GC:
   - Enter name
   - Set rating (1-5 stars)
   - Add notes
   - Save
3. Edit existing GC:
   - Change rating
   - Update notes
   - Save
4. Delete GC

**Expected Results:**
- [ ] New GC appears in list
- [ ] GC saved to database
- [ ] Star rating displays correctly
- [ ] Changes saved immediately
- [ ] Deleted GC removed from list

---

## 🐛 Error Handling

### Backend Unavailable

**Steps:**
1. Stop Netlify Dev server
2. Try to analyze a bid

**Expected Results:**
- [ ] Error message shown to user
- [ ] Console shows 404 or network error
- [ ] App doesn't crash
- [ ] User can try again after starting server

---

### Invalid API Key

**Steps:**
1. Edit `.env` and corrupt Claude API key
2. Restart Netlify Dev
3. Try to analyze a bid

**Expected Results:**
- [ ] Error message: "Claude API key is invalid"
- [ ] Fallback to basic extraction (if implemented)
- [ ] Founder receives error email (if implemented)
- [ ] Console shows 401 error

---

### Large PDF

**Steps:**
1. Upload a 50MB PDF

**Expected Results:**
- [ ] File rejected if >50MB
- [ ] Or file accepted but text truncated to 100K chars
- [ ] Extraction still works on truncated text

---

### No GCs Selected

**Steps:**
1. Go to **Analyze** tab
2. Upload PDF
3. Don't select any GCs
4. Try to click "Analyze Bid"

**Expected Results:**
- [ ] "Analyze Bid" button disabled
- [ ] Helpful message shown: "Select at least one GC"

---

## 📊 Data Integrity

### Projects Saved Correctly

**Steps:**
1. Analyze a bid
2. Open Supabase dashboard
3. Check `projects` table
4. Find the project by ID (shown in console or report)

**Expected Results:**
- [ ] Project exists in database
- [ ] `user_id` matches current user
- [ ] `extracted_data` JSONB populated
- [ ] `scores` JSONB populated
- [ ] `gcs` JSONB array populated
- [ ] `created_at` timestamp correct

---

### Settings Saved Correctly

**Steps:**
1. Edit settings
2. Save
3. Open Supabase dashboard
4. Check `user_settings` table

**Expected Results:**
- [ ] Settings updated in database
- [ ] `user_id` matches current user
- [ ] All fields saved correctly
- [ ] `updated_at` timestamp updated

---

### RLS Policies Working

**Steps:**
1. Create two user accounts
2. Log in as User A, create projects
3. Log out, log in as User B
4. Check if User B can see User A's projects

**Expected Results:**
- [ ] User B CANNOT see User A's projects
- [ ] User B CANNOT edit User A's settings
- [ ] User B CANNOT delete User A's GCs
- [ ] Each user only sees their own data

---

## 🔄 Regression Tests

**Run these after ANY change to prevent breaking existing features:**

### After Scoring Logic Changes
- [ ] Re-run all **Scoring Engine** tests
- [ ] Verify scores match expected values
- [ ] Check that recommendations are correct

### After Database Schema Changes
- [ ] Re-run all **Data Integrity** tests
- [ ] Verify old projects still load
- [ ] Check that new columns have defaults

### After UI Changes
- [ ] Re-run all **Upload & Analysis** tests
- [ ] Verify layout not broken on mobile
- [ ] Check that buttons still work

### After Backend Changes
- [ ] Re-run all **Upload & Analysis** tests
- [ ] Verify API responses correct format
- [ ] Check error handling still works

---

## 🚨 Critical User Flows

**These flows must ALWAYS work:**

### Flow 1: New User → First Analysis
1. Sign up → Onboarding → Upload PDF → Analyze → View Report

**Must work end-to-end with no errors.**

### Flow 2: Existing User → Add Outcome
1. Login → Projects → Select project → Add outcome → Check stats updated

**Must work end-to-end with no errors.**

### Flow 3: Edit Settings → Re-analyze Project
1. Login → Settings → Change service area → Save → Re-analyze old project → Verify score changed

**Must work end-to-end with no errors.**

---

## 📝 Test Data

### Sample Test Cases

**Good Bid (Should Score High 80+):**
- Project 5 miles from office
- Contains user's keywords (HVAC, mechanical, etc.)
- 5-star GC
- Matches user's trade (CSI divisions)

**Bad Bid (Should Score Low <60):**
- Project 150 miles from office
- No matching keywords
- Unknown GC or 1-star GC
- Doesn't match user's trade
- Contains contract risks

**Medium Bid (Should Score 60-79):**
- Project 40 miles from office
- Some keyword matches
- 3-star GC
- Partial trade match

---

## ✅ Pre-Deployment Checklist

**Before deploying to production:**

- [ ] All smoke tests pass
- [ ] All critical user flows work
- [ ] No console errors on any page
- [ ] Database schema matches code expectations
- [ ] Environment variables set in Netlify
- [ ] Git commits clean and descriptive
- [ ] MEMORY.md updated with any gotchas
- [ ] Test on Chrome, Safari, Firefox
- [ ] Test on mobile device
- [ ] Backup database (Supabase manual backup)

---

## 📱 Mobile Testing

**Test on mobile device or Chrome DevTools mobile emulation:**

- [ ] Dashboard displays correctly
- [ ] Projects table scrolls horizontally
- [ ] Upload zone works on touch
- [ ] GC selector works on touch
- [ ] Report view readable on small screen
- [ ] Settings form usable on mobile
- [ ] Modals display correctly

---

## 🐞 Known Issues to Watch For

### Issue 1: GC Shows "Unknown"
**Symptom:** Projects table shows "Unknown" in GC column
**Cause:** Code pulling from `extracted.gc_name` instead of `p.gcs` array
**Fix Applied:** Feb 9, 2026 (commit 5697ca0)
**Test:** Verify GC names display correctly

### Issue 2: Date Column Shows "No date"
**Symptom:** All projects show "No date" in DATE column
**Cause:** Test data missing `created_at` or `bid_deadline`
**Fix Applied:** Feb 9, 2026 (commit 5697ca0) - now shows bid_deadline
**Test:** Verify dates display when available

### Issue 3: Building Type Always "Other"
**Symptom:** Extraction sets building_type to "Other" for all projects
**Cause:** AI returning markdown-wrapped JSON, parse error
**Fix Applied:** Feb 9, 2026 (commit b1bff82)
**Test:** Verify building type detected correctly

### Issue 4: Data Loss
**Symptom:** Projects disappeared from database
**Date:** Feb 7, 2026
**Prevention:** See DATA_SAFETY_PROTOCOL.md and CLAUDE.md
**Test:** Verify daily backups enabled

---

## 📊 Performance Testing

**Check page load times:**

- [ ] Dashboard loads in <2 seconds
- [ ] Projects table with 100+ projects loads in <3 seconds
- [ ] PDF analysis completes in <30 seconds
- [ ] Report view loads in <1 second

**If slow:**
- Check network tab for slow API calls
- Check console for errors causing retries
- Verify database indexes exist
- Check PDF size (>10MB may be slow)

---

## 🔐 Security Testing

**Verify security measures:**

- [ ] API keys not exposed in frontend
- [ ] RLS policies prevent cross-user data access
- [ ] SQL injection not possible (using Supabase client)
- [ ] XSS not possible (React-like escaping in template literals)
- [ ] CORS headers correct for Netlify Functions

---

## 📖 Documentation Testing

**After making changes:**

- [ ] Update ARCHITECTURE.md if code structure changed
- [ ] Update SCHEMA.md if database changed
- [ ] Update this file if new tests needed
- [ ] Update MEMORY.md with lessons learned
- [ ] Update CLAUDE.md if new rules discovered

---

**Last Updated:** February 9, 2026 by Claude Code
**Version:** 1.0
