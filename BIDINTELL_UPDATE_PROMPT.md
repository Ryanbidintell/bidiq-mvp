# BidIntell Full Update Prompt — Landing Page + App UX
# Paste this into Claude Code with both index_professional.html AND app.html

---

## PART 1: LANDING PAGE REBUILD (index_professional.html)

### WHAT WE'RE DOING
Rebuilding the landing page by combining the best elements from our old dark-theme page (better content, better calculator, better demos) with the current live light-theme page (better theme, better pricing, better CTAs). The goal is the definitive landing page.

### CRITICAL: NO EMOJIS. PROFESSIONAL ICONS & IMAGERY ONLY.
- **ZERO emojis anywhere on the page.** No 🎯, no 🏗️, no ✅, no ⚠️, no ❌, no 🤫, none.
- Use **Lucide Icons** (available via CDN: https://unpkg.com/lucide@latest) for all iconography.
- Suggested icon mappings:
  - Logo: `<i data-lucide="crosshair"></i>` or clean text wordmark "BidIntell"
  - Checkmark/success: `<i data-lucide="check-circle"></i>` (green)
  - Warning: `<i data-lucide="alert-triangle"></i>` (amber)
  - Error/fail: `<i data-lucide="x-circle"></i>` (red)
  - Shield/privacy: `<i data-lucide="shield-check"></i>`
  - Building/construction: `<i data-lucide="building-2"></i>`
  - Package/distributor: `<i data-lucide="package"></i>`
  - Wrench/mfg rep: `<i data-lucide="wrench"></i>`
  - Upload: `<i data-lucide="upload"></i>`
  - Chart/score: `<i data-lucide="bar-chart-3"></i>`
  - Map pin: `<i data-lucide="map-pin"></i>`
  - Clock/time: `<i data-lucide="clock"></i>`
  - Dollar/cost: `<i data-lucide="dollar-sign"></i>`
  - Zap/electrical: `<i data-lucide="zap"></i>`
- Import Lucide via CDN in `<head>`:
  ```html
  <script src="https://unpkg.com/lucide@latest"></script>
  ```
  Then call `lucide.createIcons()` at end of `<body>`.
- Icons: 20-24px inline, 32-40px feature cards, 48px section headers
- Icon color matches context: green=positive, red=negative, blue=brand, amber=warning, gray=decorative

### BRAND GUIDELINES (NON-NEGOTIABLE)
- **Typography:** Plus Jakarta Sans (700-800 headlines, 400-500 body), Space Mono for technical/mono elements
- **Colors:** Primary = `#3b82f6` (Blue). Blue-to-purple gradient for brand identity. Amber (`#F59E0B`) ONLY for warnings
- **Logo:** Lucide crosshair icon + "BidIntell" wordmark. Tagline: "Decision Intelligence for Construction Bidding"
- **Tone:** "Confidently Boring" — Professional, direct, warm, no hype
- **NEVER use:** "instant," "magic," "never lose," "revolutionary," or any salesy language
- **Footer:** "© 2026 BidIntell, LLC · Decision Intelligence for Construction Professionals"

### KEEP FROM CURRENT LIVE SITE
- Light theme (cream/white backgrounds) — DO NOT go dark
- Plus Jakarta Sans typography (NOT DM Sans)
- Blue primary (#3b82f6), NOT amber/orange as primary
- Supabase auth integration (login/signup flow)
- Privacy/Terms/Contact page navigation (showPage function)
- Netlify deployment compatibility

### CURRENT PRICING MODEL (Use EXACTLY)

**Beta Phase (NOW):**
- Free during beta — unlimited bids, no credit card required
- Beta users get lifetime 30% off when paid plans launch

**Post-Beta Tiers:**

**STARTER — $49/month** (Beta alumni: $34.30/mo forever)
- 30 bid analyses per month
- AI-powered BidIndex scoring
- Personalized GO / REVIEW / PASS recommendations
- Contract risk detection
- GC relationship tracking
- Outcome tracking
- Per-bid cost: ~$1.63/analysis

**PROFESSIONAL — $99/month** ← "Most Popular" (Beta alumni: $69.30/mo forever)
- 50 bid analyses per month
- Everything in Starter PLUS:
- Priority email support
- Advanced bid reporting
- Market and region insights
- Priority updates
- Per-bid cost: ~$1.98/analysis

**Need more?** → "Analyzing 50+ bids/month? Contact us for Enterprise pricing."

**Pricing UX:**
- Side-by-side cards, Professional elevated with "Most Popular" badge
- Both CTAs: "Start Free Beta"
- Banner below: "Beta Special: First 100 users get FREE access during beta, then lifetime 30% off. Starter at $34.30/mo, Professional at $69.30/mo. No credit card required."
- Show per-analysis cost on each card ("$1.63 per analysis" vs "typical estimating cost: $100-150 per bid")

---

### LANDING PAGE SECTION ORDER (Top to Bottom)

#### 1. NAVIGATION (Fixed Top)
- Lucide crosshair icon + "BidIntell" wordmark + tagline
- Nav links: Explore → Pricing → Contact
- Right side: Sign In | **Start Free Beta** (primary CTA)

#### 2. HERO
- Headline: "Stop guessing **which bids to pursue**"
- Increase whitespace between headline and BidIndex Score mockup
- Primary CTA: "Get My First 3 Bids Analyzed Free" (not "Start Free Trial")
- Secondary CTA: "See How It Works" (smooth scroll)
- Keep BidIndex Score mockup showing "85 / GO"
- Trust line: "No credit card required · Setup takes 5 minutes · Cancel anytime"
- Hero note: "Free during beta · Unlimited bids"
- REMOVE the fake "1,247 bids analyzed" counter

#### 3. PAIN POINTS — "Your estimating team is drowning in bids that aren't worth the paper they're on."
Subtitle: "You already know this. Every week, the same cycle repeats."

**4 cards (not 6):**
- Card 01: "15+ hours per week on dead-end bids" — "Your best estimators are buried in documents for projects that were never a fit — wrong location, wrong size, wrong GC. By the time you realize it, the time is already gone." Stat (red): "~$39,000/yr in wasted estimating labor"
- Card 02: "GCs that ghost you every single time" — "You submitted. You followed up. You heard nothing. Three months later you're bidding the same GC again because you forgot — or hoped it would be different this time." Stat (amber): "Avg sub gets ghosted on 40%+ of bids"
- Card 03: "Risky contract terms buried in fine print" — "Pay-if-paid clauses. Broad indemnification. Liquidated damages. They're hidden in 200-page bid packages and your team doesn't have time to read every line." Stat (red): "1 bad contract can cost $50K+"
- Card 04: "No memory of what happened last time" — "Who won that Turner project? How high were you on McCarthy's last job? Who keeps beating you on hospitals? Right now, the answer lives in someone's head — or nowhere." Stat (amber): "Critical decisions made on gut feeling"

**Minimum card text: 15px.** Construction estimators are 40-60 year olds on laptops.

#### 4. THREE BRAND PILLARS — "Why BidIntell Is Different"
Subtitle: "Estimating tools help you price work. BidIntell helps you decide which work is worth pricing."

1. **Clarity Over Speed** — "We'd rather give you a thought that took 90 seconds and was right than a guess that took 10 seconds and was wrong." Every score links to the exact page, clause, or data point.
2. **Trust Over Black-Box AI** — "If we can't show you why we scored it that way, we won't show you the score." Every component visible and adjustable.
3. **Learning Over One-Off Analysis** — "The more you use BidIntell, the smarter it gets about your business specifically." Outcomes and overrides refine your model.

#### 5. HOW IT WORKS — "Three steps. About a minute. A decision you can defend."
3-step flow with Lucide icons (no emojis):
1. Upload Your Bid Package — "Drop in the invite, specs, drawings. Select which GCs are bidding. AI reads every page, extracts details, finds your scope, flags risks." Time: ~30 seconds
2. Get Your BidIndex Score — "Personalized 0–100 score based on your business: distance, trade match, GC history, contract risk. Plain-English reasoning for every point." Time: ~30 seconds
3. Bid Smart or Move On — "GO / REVIEW / PASS. Every score links to the exact page and line. No black box." Time: Decision in hand

#### 6. SAME BID, DIFFERENT SCORE — "Same bid. Different score. Because your business isn't the same as theirs."
Banner: "Both contractors received the same bid invite: **Wilson Medical Center — Denver, CO — $4.2M — Turner Construction**"

Side-by-side cards (use Lucide check-circle/alert-triangle/x-circle icons, NOT emojis):

**Card 1 (GO):** HVAC Contractor • Denver, CO | 50-mile radius • $2–5M sweet spot
- Score: 87 (green) — "GO — Strong Fit"
- [check-circle] Location: 23 miles from office (100/100)
- [check-circle] Trade Match: Div 23 + 14 M-sheets (95/100)
- [check-circle] GC History: Won 2 of 3 with Turner (85/100)
- [alert-triangle] Contract: Standard terms, 10% retainage (72/100)

**Card 2 (PASS):** Electrical Contractor • Phoenix, AZ | 75-mile radius • $500K–$2M sweet spot
- Score: 38 (red) — "PASS — Poor Fit"
- [x-circle] Location: 780 miles away (15/100)
- [alert-triangle] Trade Match: Div 26 found but $4.2M over sweet spot (55/100)
- [x-circle] GC History: No relationship with Turner (40/100)
- [x-circle] Contract: Pay-if-paid detected, Pg 12 (28/100)

#### 7. ROI CALCULATOR — "The Math Behind Smarter Bidding"
Subtitle: "Your numbers. Real savings. No hand-waving."

This calculator must feel like it was built by someone who understands estimating departments — not a marketing team. Show the work. Let them verify every number.

**INPUTS (Left Side) — 6 fields with sliders + editable number inputs:**

**Section A: "Your Estimating Department"**
1. **Bid invitations per year** (range: 50-500, step 10, default: 150)
   - Helper: "Total invites received, including ones you pass on"
2. **Hours per bid to evaluate** (range: 1-8, step 0.5, default: 3)
   - Helper: "Time to review docs, check scope, discuss, decide GO/NO-GO"
3. **Estimator loaded hourly cost** (range: $35-$150, step $5, default: $65)
   - Helper: "Salary + benefits + overhead. Not just wages."

**Section B: "Your Current Performance"**
4. **% of bids that are a poor fit** (range: 20%-70%, step 5%, default: 40%)
   - Helper: "Bids you'd pass on if you knew in 60 seconds what takes 3 hours to figure out"
5. **Average project value you pursue** (range: $250K-$20M, step varies, default: $1.5M)
   - Helper: "Typical contract value for bids you submit"
6. **Current win rate** (range: 5%-40%, step 1%, default: 22%)
   - Helper: "Wins ÷ bids submitted. Industry avg: 20-25%"
   - Show tick marks at 10% | 20% | 30% | 40%

**OUTPUTS (Right Side) — Show the full breakdown, not just results:**

**Section 1: "Time Recovery" (hard savings)**
```
Your current estimating spend:
  150 bids × 3 hrs × $65/hr = $29,250/year

BidIntell identifies 40% as PASS in under 60 seconds:
  60 bad-fit bids × 3 hrs = 180 hours recovered

Time saved: 180 hours/year
Dollar value: 180 hrs × $65 = $11,700/year
```

Display as:
- **Hours Recovered:** 180 hrs/year (big green number)
- **Estimating Cost Saved:** $11,700/year (big green number)
- Subtext: "That's [X] hours per week your estimators get back"

**Section 2: "Revenue Impact" (the bigger number)**
```
Current: 150 bids × (1 - 40% bad) = 90 bids submitted × 22% win rate = 19.8 wins
With BidIntell: Focus on 90 quality bids with better intel
  → Win rate improves to ~25% (conservative +3% from better targeting)
  → 90 bids × 25% = 22.5 wins
  → 2.7 additional wins × $1.5M avg = $4,050,000 additional revenue opportunity

Even at 1 additional win: +$1,500,000 in revenue
```

Display as:
- **Projected Win Rate:** 25% (up from 22%) — show with arrow indicator
- **Additional Wins:** +2.7 projects/year
- **Revenue Opportunity:** $4,050,000/year (big green number, but with disclaimer)
- Subtext: "Based on +3% win rate improvement from better bid selection. Conservative estimate — users targeting only strong-fit bids typically see 5-8% improvement."

**Section 3: "Your Investment" (the payback)**
```
BidIntell Starter: $49/month = $588/year
Time savings alone: $11,700/year
ROI on time savings: 19.9x

Payback period: $49 ÷ ($11,700 ÷ 12 months) = 0.05 months
= 1.5 days to pay for itself on time savings alone
(Revenue impact not included in payback calculation)
```

Display as:
- **BidIntell Cost:** $49/mo ($588/yr) — with plan toggle for $99/mo
- **ROI (time savings only):** 19.9x return
- **Payback Period:** 1.5 days (big accent number)
- Subtext: "Pays for itself in under 2 days based on time savings alone. Revenue impact is additional upside."
- Note: "We calculate payback on hard time savings only — not projected revenue — because we believe in conservative claims."

**Plan toggle:**
Two buttons: "Starter ($49/mo)" | "Professional ($99/mo)" — default Starter
When toggled, recalculates the Investment section only. Both show payback under a week.

**CALCULATOR LOGIC (JavaScript):**
```javascript
let selectedPlan = 'starter';
const planCosts = { starter: 49, professional: 99 };

function updateROI() {
  // Inputs
  const bidsYear = parseFloat(inputs.bidsPerYear.value);
  const hoursPerBid = parseFloat(inputs.hoursPerBid.value);
  const hourlyRate = parseFloat(inputs.hourlyRate.value);
  const badFitPct = parseFloat(inputs.badFitPct.value) / 100;
  const avgProjectSize = parseFloat(inputs.avgProjectSize.value);
  const currentWinRate = parseFloat(inputs.currentWinRate.value) / 100;

  // --- SECTION 1: Time Recovery ---
  const totalEstimatingCost = bidsYear * hoursPerBid * hourlyRate;
  const badFitBids = Math.round(bidsYear * badFitPct);
  const hoursRecovered = badFitBids * hoursPerBid;
  const dollarsSaved = hoursRecovered * hourlyRate;
  const hoursPerWeekSaved = (hoursRecovered / 52).toFixed(1);

  // --- SECTION 2: Revenue Impact ---
  const goodBids = bidsYear - badFitBids; // Bids actually worth submitting
  const currentWins = Math.round(bidsYear * (1 - badFitPct) * currentWinRate * 10) / 10;
  
  // Win rate improvement: focusing on quality bids improves rate by 3-5%
  const winRateBoost = 0.03; // Conservative 3%
  const newWinRate = currentWinRate + winRateBoost;
  const newWins = Math.round(goodBids * newWinRate * 10) / 10;
  const additionalWins = Math.round((newWins - currentWins) * 10) / 10;
  const revenueOpportunity = Math.round(additionalWins * avgProjectSize);

  // --- SECTION 3: Investment & Payback ---
  const annualCost = planCosts[selectedPlan] * 12;
  const monthlySavings = dollarsSaved / 12;
  const roiMultiple = (dollarsSaved / annualCost).toFixed(1);
  const paybackDays = ((planCosts[selectedPlan] / monthlySavings) * 30).toFixed(1);

  // Update all displays...
}
```

**DESIGN NOTES:**
- Show the math steps visually, not just final numbers. Use light gray calculation lines like a spreadsheet breakdown. This builds trust with detail-oriented estimators.
- Green for savings/gains, red for current waste, blue for BidIntell cost
- Space Mono font for all numbers and calculations
- Plus Jakarta Sans for labels and descriptions
- Results cards: white bg, subtle shadow, generous padding
- "Revenue Opportunity" number should have a subtle asterisk: "Based on conservative +3% win rate improvement"
- The "We calculate payback on hard time savings only" note is a TRUST SIGNAL — it shows you're not inflating numbers
- Slider track: #e5e7eb, thumb: #3b82f6
- Each input should have both a slider AND an editable number field (so power users can type exact values)

#### 8. WHO IT'S FOR — "Built for the people who actually decide what to bid."
3 cards (Lucide icons, not emojis):
- [building-2] **Subcontractors** — "HVAC, electrical, plumbing, fire protection, finishes — BidIntell scores bids based on your trades, territory, and GC history." Tag: "Trade Match scoring"
- [package] **Distributors** — "Supply houses and equipment distributors — scans specs for your brands, tells you if products are specified, approved, or not in the picture." Tag: "Product Match scoring"
- [wrench] **Manufacturer Reps** — "Rep agencies covering lighting, controls, security, mechanical — know instantly if your product lines are specified." Tag: "Product Match scoring"

#### 9. PRICING — $49/$99 tiers (see CURRENT PRICING MODEL above)

#### 10. SECRET WEAPON — "Your Secret Weapon. Not Theirs."
[shield-check icon] "GCs never know BidIntell exists. You're running **their documents** through **your filter**. Every bid decision stays between you and your team. No data shared with GCs, ever."

#### 11. RISK-FREE GUARANTEE — "100% Risk-Free Guarantee"
30-day money-back promise. Keep as-is.

#### 12. FINAL CTA — "Stop Guessing. Start Winning."
- CTA: "Get My First 3 Bids Analyzed Free"
- Below: "Setup takes 5 minutes · Your first 3 bids are free"

#### 13. FOOTER
Links: Explore | Pricing | Contact | Privacy | Terms
"© 2026 BidIntell, LLC · Decision Intelligence for Construction Professionals"

### WHAT TO REMOVE FROM LANDING PAGE
- ❌ Bid ticker — fake data, visual noise
- ❌ "See BidIntell in Action" with generic icons — replaced by "Same Bid, Different Score"
- ❌ Animated bid counter in hero ("1,247 bids analyzed") — fake data
- ❌ All emojis everywhere

### LANDING PAGE TECHNICAL NOTES
- Single HTML file (index_professional.html)
- Don't break Supabase auth (login/signup)
- After login, redirect to app.html
- Netlify hosting — self-contained or CDN assets
- Google Fonts CDN for Plus Jakarta Sans and Space Mono
- Lucide Icons CDN
- Privacy/Terms/Contact pages must still work (showPage function)

---

## PART 2: APP UX IMPROVEMENTS (app.html)

### CONTEXT
app.html is an 11,000+ line single-page application with tab-based navigation (Dashboard, Analyze, Projects, Settings). It's functional but needs UX polish for beta user onboarding. The app uses vanilla JS/CSS with Supabase integration.

### CRITICAL APP UX FIXES

#### 1. LOGIN → APP REDIRECT (MUST FIX)
After a user logs in on index_professional.html, they should automatically redirect to app.html. Currently they see a placeholder "Welcome to BidIQ!" message.

**Implementation:**
In index_professional.html's auth state change handler:
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    window.location.href = '/app.html';
  }
});
```

#### 2. ONBOARDING FLOW — FIRST VALUE IN UNDER 5 MINUTES
The entire path from signup → first BidIndex Score must complete in under 5 minutes. This is the #1 SaaS UX metric for BidIntell.

**Onboarding steps (streamlined):**
1. Company name + type (Subcontractor/Distributor/Mfg Rep) — 30 sec
2. Office location (Google Maps autocomplete) — 30 sec
3. Service radius (slider with smart default: 50 miles preferred, 100 miles max) — 15 sec
4. Keywords (pre-populate based on company type selection, let user edit) — 60 sec
5. Add at least 1 GC (autocomplete from master list) — 30 sec
6. **"Upload Your First Bid"** — immediately prompt to analyze — 60 sec
7. See BidIndex Score — 60 sec for AI processing

**Smart defaults to reduce friction:**
- Service radius: 50 miles preferred, 100 max (pre-set, just confirm)
- Capacity: "Moderate" (default)
- Decision time: 45 minutes (default)
- Default GC rating: 3 stars (default)
- Keywords: Pre-populate common trade keywords when user selects company type:
  - HVAC → "HVAC, mechanical, Division 23, ductwork, piping"
  - Electrical → "electrical, Division 26, conduit, switchgear, panels"
  - Plumbing → "plumbing, Division 22, piping, fixtures, drainage"
  - (etc. for each trade)

#### 3. ANALYSIS PROGRESS FEEDBACK (CRITICAL)
When user clicks "Analyze Bid," the 30-60 second Claude processing time MUST show visible progress. Construction users will assume it's broken if nothing moves.

**Replace static "Analyzing..." with stepped progress:**
```
Step 1: "Extracting text from your documents..." (0-10 sec)
Step 2: "AI is reading project details..." (10-25 sec)
Step 3: "Identifying your trade scope..." (25-35 sec)
Step 4: "Checking contract risk clauses..." (35-45 sec)
Step 5: "Calculating your personalized BidIndex Score..." (45-55 sec)
Step 6: "Generating your report..." (55-60 sec)
```

Show a progress bar or step indicator that advances through these stages. Even if the timing is approximate, movement = trust.

#### 4. DASHBOARD — ONE CLEAR ACTION
When user lands on Dashboard, the single most obvious action should be "Analyze a Bid."

**Changes:**
- If user has 0 projects: Show large "Upload Your First Bid" card with upload icon and clear CTA
- If user has projects: Show "Analyze New Bid" button prominently at top + recent activity below
- Stats cards (Projects Analyzed, Avg Score, Win Rate, Data Moat) should be compact, not dominant
- Recent Activity list: show project name, GC, score badge, outcome, "View Report" link

#### 5. PROJECTS TAB — CLEAR NEXT ACTIONS
- Each project row should have visible action buttons: "View Report" | "Add Outcome"
- Pending outcomes should be highlighted (amber border or badge)
- GC names must show correctly (not "Unknown") — pull from `project.gcs` array, not `extracted.gc_name`
- Sorting by date, score, or outcome should work
- Date column: show bid_deadline if available, otherwise analysis date

#### 6. REPORT VIEW — READABLE AND ACTIONABLE
- Score breakdown must be clearly visible with 4 components (Location, Keywords, GC, Trade)
- Each component shows its individual score (0-100) and weight
- "How to Improve Your Chances" section should be prominent
- "Record Outcome" button should be visible and easy to find
- Print report should generate clean, professional PDF-style output
- Editable fields (project name, building type, GCs) with "Save Changes" button

#### 7. SETTINGS — SIMPLE AND COMPLETE
- Office location with Google Maps autocomplete
- Service radius sliders (preferred + max)
- Keywords management (add/remove, categorized as good/bad)
- GC management (add/remove, star ratings, notes)
- Capacity selector (Low/Moderate/High)
- All changes save immediately with success feedback

#### 8. GEOLOCATION BUG FIX
There's a persistent "Could not locate your office" error for users in Overland Park, KS. Debug and fix the geocoding flow:
- Check if OpenStreetMap Nominatim API is being called correctly
- Verify lat/lng are being saved to user_settings
- Test with "Overland Park, KS" as input
- Ensure the address autocomplete saves both the display address AND coordinates

---

## PART 3: GLOBAL UX RULES (Apply to BOTH files)

### Typography & Readability
- Minimum body text: 15px everywhere
- Minimum card descriptions: 14px
- Headlines: Plus Jakarta Sans 700-800 weight
- Technical/mono elements: Space Mono

### Visual Consistency
- Primary blue: #3b82f6
- Success green: #22c55e
- Warning amber: #f59e0b
- Danger red: #ef4444
- All CTA buttons: consistent blue color and size
- GO badge = green, REVIEW badge = amber, PASS badge = red

### Interaction Feedback
- Every button click shows immediate feedback (loading state, color change, or animation)
- Every save operation shows success/error message
- Every form submission disables the button during processing
- Hover effects on all clickable elements

### Mobile Responsive
- Test all breakpoints (320px, 375px, 768px, 1024px, 1440px)
- Sliders and interactive elements must work on touch
- Tables should scroll horizontally on mobile
- Modals should be full-screen on mobile

### Performance
- Smooth scroll on all anchor links
- Intersection Observer fade-in animations on landing page sections
- Lazy load dashboard data (load tab content when clicked)
- PDF.js worker thread (don't block UI during parsing)

---

## PART 4: TECHNICAL CONSTRAINTS

### Files
- `index_professional.html` — Landing page (single file)
- `app.html` — Main application (single file, ~11,000 lines)
- `netlify/functions/analyze.js` — AI extraction backend
- `netlify/functions/notify.js` — Email notifications

### Stack
- Vanilla JavaScript/CSS (no React, no build tools)
- Supabase (PostgreSQL, auth, storage)
- Claude API via Netlify Functions (backend proxy)
- Google Maps Places API (address autocomplete)
- OpenStreetMap Nominatim (geocoding for distance calc)
- PDF.js (document parsing)
- Lucide Icons (CDN)

### Database (Supabase with RLS)
- `user_settings` — preferences, office location, capacity
- `projects` — analyzed bids, scores, outcomes
- `keywords` — user trade terms (good/bad)
- `general_contractors` — GC database with ratings
- All tables use `user_id = auth.uid()` RLS policies

### Environment
- Netlify hosting + Netlify Functions
- `.env` for API keys (CLAUDE_API_KEY, OPENAI_API_KEY, POSTMARK_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)

---

## SUCCESS CRITERIA

### Landing Page
A construction estimator should:
1. Understand what BidIntell does within 10 seconds (hero)
2. Feel their daily pain within 30 seconds (pain section)
3. Understand WHY it's different within 60 seconds (pillars)
4. See how it works within 90 seconds (how it works + demo)
5. Calculate personal ROI within 2 minutes (calculator)
6. See pricing as a no-brainer within 2.5 minutes (pricing)
7. Click "Start Free Beta" with zero objections (guarantee + CTA)

### App
A beta user should:
1. Complete onboarding in under 3 minutes
2. Upload and analyze their first bid in under 2 minutes
3. See their BidIndex Score with clear reasoning
4. Understand what to do next (bid or pass) immediately
5. Record outcomes without confusion
6. Return 3+ times per week to check new bids
