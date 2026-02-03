# 🚀 Founder Dashboard Enhancement Integration Guide

This guide shows you exactly how to add the 4 new features to your founder dashboard.

---

## STEP 1: Run the Beta Invites Database Schema

**File:** `beta_invites_schema.sql`

1. Open Supabase SQL Editor
2. Copy the entire contents of `beta_invites_schema.sql`
3. Run it
4. This creates the `beta_invites` table and adds your founder code: **FOUNDER2026**

---

## STEP 2: Update the Login Form HTML

**Location:** Find the login form in `BidIQ_Founder_Dashboard.html` (around line 405-425)

**Replace this:**
```html
<input type="password" class="form-input" id="adminPassword" placeholder="Admin Password">
```

**With this:**
```html
<input type="email" class="form-input" id="adminEmail" placeholder="Your Email">
<input type="text" class="form-input" id="inviteCode" placeholder="Invite Code (e.g., FOUNDER2026)">
```

---

## STEP 3: Replace the login() Function

**Location:** Find `function login()` in the JavaScript section (around line 496)

**Replace entire function with:**
See `founder_dashboard_enhancements.js` lines 1-55

Or copy this shortened version:
```javascript
async function login() {
    const code = document.getElementById('inviteCode').value.trim().toUpperCase();
    const email = document.getElementById('adminEmail').value.trim();

    if (!code || !email) {
        document.getElementById('loginError').textContent = 'Please enter both email and invite code';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    try {
        const { data: invite, error } = await supabaseClient
            .from('beta_invites')
            .select('*')
            .eq('invite_code', code)
            .eq('is_active', true)
            .single();

        if (error || !invite) {
            document.getElementById('loginError').textContent = 'Invalid or inactive invite code';
            document.getElementById('loginError').style.display = 'block';
            return;
        }

        const now = new Date().toISOString();
        await supabaseClient
            .from('beta_invites')
            .update({
                email: email,
                first_used_at: invite.first_used_at || now,
                last_active_at: now,
                usage_count: (invite.usage_count || 0) + 1
            })
            .eq('invite_code', code);

        sessionStorage.setItem('bidiq_admin', 'true');
        sessionStorage.setItem('bidiq_invite_code', code);
        sessionStorage.setItem('bidiq_admin_email', email);

        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        refreshData();
    } catch (e) {
        console.error('Login error:', e);
        document.getElementById('loginError').textContent = 'Login failed: ' + e.message;
        document.getElementById('loginError').style.display = 'block';
    }
}
```

---

## STEP 4: Add New Dashboard Sections HTML

**Location:** Find where dashboard content sections are (after the header, before the closing dashboard div)

**Add these 3 new sections:**

```html
<!-- AI Score Accuracy Section -->
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🎯 AI Score Accuracy</h2>
        <button class="refresh-btn" onclick="loadScoreAccuracy()">↻ Refresh</button>
    </div>
    <div id="scoreAccuracyContent">
        <p style="text-align:center;color:var(--text-muted);padding:40px;">Loading...</p>
    </div>
</div>

<!-- User Cohort Analysis Section -->
<div class="section">
    <div class="section-header">
        <h2 class="section-title">👥 User Cohort Retention</h2>
        <button class="refresh-btn" onclick="loadCohortAnalysis()">↻ Refresh</button>
    </div>
    <div id="cohortContent">
        <p style="text-align:center;color:var(--text-muted);padding:40px;">Loading...</p>
    </div>
</div>

<!-- Feature Usage Heatmap Section -->
<div class="section">
    <div class="section-header">
        <h2 class="section-title">📊 Feature Usage & Data Moat Health</h2>
        <button class="refresh-btn" onclick="loadFeatureUsage()">↻ Refresh</button>
    </div>
    <div id="featureUsageContent">
        <p style="text-align:center;color:var(--text-muted);padding:40px;">Loading...</p>
    </div>
</div>
```

---

## STEP 5: Add the New JavaScript Functions

**Location:** In the `<script>` section, before the `</script>` tag

**Add all 3 functions from:** `founder_dashboard_enhancements.js`

1. `loadScoreAccuracy()` - lines 58-155
2. `loadCohortAnalysis()` - lines 160-245
3. `loadFeatureUsage()` - lines 250-340

---

## STEP 6: Update refreshData() Function

**Location:** Find `async function refreshData()` (around line 524)

**Add these 3 calls to the Promise.all array:**

```javascript
await Promise.all([
    loadCoreMetrics(),
    loadScoringValidation(),
    loadOutcomes(),
    loadDeclineReasons(),
    loadGCIntelligence(),
    loadRecentActivity(),
    loadUserActivity(),
    loadScoreAccuracy(),      // NEW
    loadCohortAnalysis(),     // NEW
    loadFeatureUsage()        // NEW
]);
```

---

## TESTING THE CHANGES

1. **Test Login:**
   - Email: `ryan@bidintell.ai`
   - Code: `FOUNDER2026`
   - Should log you in successfully

2. **Test New Sections:**
   - AI Score Accuracy should show false positives/negatives
   - Cohort Analysis should group users by week
   - Feature Usage should show % of projects with feedback, outcomes, etc.

3. **Test Invite Management:**
   - In Supabase Table Editor, open `beta_invites`
   - You can add new codes, deactivate codes
   - Track usage per invite

---

## CREATING NEW BETA INVITES

**Option 1: SQL Insert**
```sql
INSERT INTO beta_invites (invite_code, email, notes)
VALUES ('BETA001', 'user@company.com', 'Beta tester from referral');
```

**Option 2: Add UI (Future Enhancement)**
Create an "Invite Management" section in the dashboard with:
- Generate random invite code button
- Revoke access button
- View usage stats

---

## FILE SUMMARY

- `beta_invites_schema.sql` - Database table for invite codes
- `founder_dashboard_enhancements.js` - All the new JavaScript functions
- `DASHBOARD_INTEGRATION_GUIDE.md` - This file (step-by-step instructions)

---

## WHAT EACH FEATURE DOES

### 1. Beta Invite System
- ✅ Replaces hardcoded password with secure invite codes
- ✅ Tracks who's accessing and when
- ✅ Can revoke access by setting `is_active = false`
- ✅ Email + code authentication

### 2. AI Score Accuracy
- ✅ Shows false positives (AI said GO but lost/declined)
- ✅ Shows false negatives (AI said PASS but won)
- ✅ Identifies systematic scoring errors
- ✅ Provides algorithm improvement suggestions

### 3. User Cohort Analysis
- ✅ Groups users by signup week
- ✅ Shows retention rate (% still using app)
- ✅ Tracks bids per user
- ✅ Identifies if product is "sticky"

### 4. Feature Usage Heatmap
- ✅ Shows % using score feedback
- ✅ Shows % recording outcomes
- ✅ Shows % using risk tags
- ✅ Calculates "Data Moat Health Score"

---

## QUICK START (15 MINUTES)

1. Run `beta_invites_schema.sql` in Supabase → 2 min
2. Update login form HTML → 1 min
3. Replace login() function → 2 min
4. Add 3 new dashboard section HTML → 3 min
5. Copy/paste 3 new JavaScript functions → 5 min
6. Update refreshData() call → 1 min
7. Test with FOUNDER2026 code → 1 min

**Total: ~15 minutes to full enhancement!**

---

## NEED HELP?

If you get stuck:
1. Check browser console for errors (F12)
2. Verify beta_invites table exists in Supabase
3. Make sure all function names match exactly
4. Ensure HTML element IDs match (scoreAccuracyContent, cohortContent, featureUsageContent)
