# 🎯 BidIntell v1.6 Implementation Game Plan

**Created:** February 5, 2026
**Target:** Complete Phase 1 MVP + Enhancements
**Status:** Ready to Build

---

## 📋 EXECUTIVE SUMMARY

### What's Already Done ✅
From our recent bug fixes:
- ✅ All 9 critical bugs fixed
- ✅ Claude API extraction with structured prompts
- ✅ Location geocoding with progressive fallbacks + KC metro detection
- ✅ Auto-save to database after analysis
- ✅ Company name in reports
- ✅ Professional print reports
- ✅ Enhanced keyword validation
- ✅ Building type extraction
- ✅ Contract risk detection (basic)
- ✅ Onboarding flow
- ✅ Multi-GC selection
- ✅ GC database with risk tags
- ✅ Outcome tracking
- ✅ Dashboard with stats

### What's Missing from v1.6 Bible ❌
**Critical Features:**
1. Company Type selection (Sub / Distributor / Mfg Rep)
2. Product Match scoring for distributors
3. Multi-signal trade detection (drawing prefixes, material keywords)
4. Duplicate project detection (fingerprinting)
5. Contract risk confidence weighting
6. Score data lineage (PDF source linking)
7. Beta feedback widget
8. Passive ghost trigger
9. GC alias system
10. Master GC database admin dashboard

**Enhancement Features:**
11. Analytics dashboard improvements
12. Bulk upload
13. Export to CSV
14. Advanced filtering
15. Dark mode polish
16. Mobile responsiveness
17. Email notifications

---

## 🚀 IMPLEMENTATION PHASES

### PHASE 1: Critical Bible v1.6 Features (Week 1-2)
**Goal:** Complete all missing Phase 1 MVP features from Product Bible

#### Sprint 1.1: Company Types & Product Match (Days 1-3)
- [ ] Add company_type field to user preferences schema
- [ ] Add onboarding Step 0: "What type of company are you?"
- [ ] Add product_lines and product_categories fields
- [ ] Build Product Match scoring component (replaces Trade Match for distributors)
- [ ] Adjust default score weights per company type
- [ ] Update report language per company type
- [ ] Test full flow for each company type

**Database Changes:**
```sql
ALTER TABLE user_preferences ADD COLUMN company_type TEXT DEFAULT 'subcontractor';
ALTER TABLE user_preferences ADD COLUMN provides_installation BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN product_lines TEXT[];
ALTER TABLE user_preferences ADD COLUMN product_categories TEXT[];
```

#### Sprint 1.2: Multi-Signal Trade Detection (Days 4-5)
- [ ] Implement drawing sheet prefix detection (M-, E-, P-, FP-, etc.)
- [ ] Build material evidence keyword matcher (ductwork, conduit, piping, etc.)
- [ ] Add drawing title block parsing
- [ ] Combine signals with priority logic (CSI > Drawing Prefix > Title > Materials)
- [ ] Update report to explain which signal triggered match
- [ ] Test with real bid packages (with/without CSI divisions)

**File Changes:** `lib/tradeDetection.js` (new file)

#### Sprint 1.3: Duplicate Project Detection (Days 6-7)
- [ ] Add project_fingerprint field to projects table
- [ ] Build fingerprint generator (normalized project name + city + state)
- [ ] Create project_gc_scores join table
- [ ] Update analysis flow to check for existing fingerprints
- [ ] Show "This looks like [Project] you already analyzed" UI
- [ ] Allow user to link or create new
- [ ] Test with same project from multiple GCs

**Database Changes:**
```sql
ALTER TABLE projects ADD COLUMN project_fingerprint TEXT;
CREATE INDEX idx_project_fingerprint ON projects(project_fingerprint, user_id);

CREATE TABLE project_gc_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gc_id UUID REFERENCES gc_master(id),
  gc_score INTEGER,
  competition_penalty INTEGER,
  final_bidindex_score INTEGER,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Sprint 1.4: Contract Risk Confidence Weighting (Days 8-9)
- [ ] Update Claude API prompt to return confidence scores per risk
- [ ] Build confidence tier logic (High ≥0.80, Medium 0.50-0.79, Low <0.50)
- [ ] Apply penalties only for high confidence
- [ ] Show "Manual Review" flag for medium confidence
- [ ] Hide low confidence risks
- [ ] Test with various contract documents

**File Changes:** `lib/contractRiskDetection.js` enhancement

#### Sprint 1.5: Score Data Lineage (Days 10-11)
- [ ] Update Claude extraction to include page numbers and text snippets
- [ ] Store source references in score_components JSONB
- [ ] Add "View Source" UI elements in report
- [ ] Display extracted text snippets for each penalty/bonus
- [ ] Format: "⚠️ Risk detected (Page 12, Lines 3-7): [snippet]"
- [ ] Test visibility and trust improvements

#### Sprint 1.6: Beta Feedback Widget (Days 12-13)
- [ ] Create beta_feedback table
- [ ] Build feedback form UI (floating button or footer)
- [ ] Capture feedback type, message, page context, screenshot
- [ ] Send email notification to hello@bidintell.ai
- [ ] Add Beta Feedback section to Founder Dashboard
- [ ] Add status tracking (New → Reviewed → In Progress → Resolved)
- [ ] Test submission and email flow

**Database Changes:**
```sql
CREATE TABLE beta_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'feature', 'ux', 'praise', 'confusion')),
  message TEXT NOT NULL,
  page_context TEXT,
  screenshot_url TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### Sprint 1.7: Passive Ghost Trigger (Day 14)
- [ ] Add ghost_threshold_days to user preferences (default 60)
- [ ] Build daily cron job to check stale "Submitted" projects
- [ ] Auto-update to "Ghosted (Auto)" status
- [ ] Send user notification with override options
- [ ] Add "Still waiting" / "Actually won" / "Actually lost" actions
- [ ] Test with various timelines

---

### PHASE 2: Admin Dashboard & GC Management (Week 3)
**Goal:** Complete Master GC database and admin tools

#### Sprint 2.1: Master GC Database Schema (Days 15-16)
- [ ] Create gc_master table (if not exists)
- [ ] Add gc_aliases array field
- [ ] Create gc_review_queue table
- [ ] Set up proper foreign keys and indexes
- [ ] Migrate existing GC data to master list

**Database Changes:**
```sql
CREATE TABLE gc_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  normalized_name TEXT,
  city TEXT,
  state TEXT,
  aliases TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gc_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_name TEXT NOT NULL,
  submitted_by_user_id UUID REFERENCES auth.users(id),
  ai_recommendation TEXT,
  ai_confidence NUMERIC(3,2),
  suggested_match_id UUID REFERENCES gc_master(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);
```

#### Sprint 2.2: GC Autocomplete & AI Matching (Days 17-18)
- [ ] Build GC search autocomplete component
- [ ] Implement fuzzy matching with Levenshtein distance
- [ ] Add AI-powered duplicate detection on new GC submission
- [ ] Show "Did you mean [GC]?" suggestions
- [ ] Submit to review queue if user says "No, add new"
- [ ] Test with various typos and variations

**File Changes:** New React components `GCAutocomplete.jsx`

#### Sprint 2.3: Founder Admin Dashboard (Days 19-21)
- [ ] Build separate admin dashboard page (`BidIQ_Founder_Dashboard.html`)
- [ ] Show all users, projects, GCs, feedback
- [ ] Build GC Review Queue interface
- [ ] Add merge functionality (creates aliases)
- [ ] Show custom risk tag promotion interface
- [ ] Add aggregate analytics (total bids, users, activity)
- [ ] Test all admin actions

---

### PHASE 3: Analytics & Intelligence (Week 4)
**Goal:** Build personal intelligence dashboard

#### Sprint 3.1: Enhanced Dashboard Analytics (Days 22-24)
- [ ] Win rate trends over time (chart)
- [ ] Bid volume by month/quarter (chart)
- [ ] Score accuracy tracking (predicted vs actual outcomes)
- [ ] Top performing GCs (win rate table)
- [ ] Worst performing GCs (ghost rate table)
- [ ] Bid by building type breakdown (pie chart)
- [ ] Market activity heatmap (if multi-market)

**Libraries:** Chart.js or Recharts

#### Sprint 3.2: Projects List Enhancements (Days 25-26)
- [ ] Advanced filtering (by GC, outcome, building type, date range, score range)
- [ ] Sorting (by date, score, outcome)
- [ ] Bulk actions (mark multiple as ghosted, export)
- [ ] Search by project name or location
- [ ] Column customization
- [ ] Saved filter presets

#### Sprint 3.3: Export Functionality (Day 27)
- [ ] Export projects to CSV
- [ ] Export analytics to PDF
- [ ] Email report scheduling (optional)
- [ ] Choose date range and fields to export
- [ ] Test with large datasets

---

### PHASE 4: Performance & UX Polish (Week 5)
**Goal:** Make the app fast, beautiful, and mobile-ready

#### Sprint 4.1: Performance Optimization (Days 28-29)
- [ ] Add loading states and skeletons
- [ ] Implement pagination for projects list
- [ ] Lazy load dashboard charts
- [ ] Cache frequently accessed data
- [ ] Optimize PDF parsing (Web Workers)
- [ ] Compress and optimize images
- [ ] Test load times and optimize

#### Sprint 4.2: Mobile Responsiveness (Days 30-31)
- [ ] Audit all pages on mobile devices
- [ ] Fix layout issues (tables, forms, charts)
- [ ] Add mobile navigation (hamburger menu)
- [ ] Touch-friendly buttons and inputs
- [ ] Test on iOS and Android
- [ ] Progressive Web App (PWA) manifest

#### Sprint 4.3: Dark Mode Polish (Day 32)
- [ ] Ensure all components respect dark mode
- [ ] Fix any color contrast issues
- [ ] Test print reports in dark mode
- [ ] Add theme toggle in settings
- [ ] Save preference to database

#### Sprint 4.4: UI/UX Enhancements (Days 33-34)
- [ ] Add tooltips for complex features
- [ ] Improve empty states (no projects yet, no GCs yet)
- [ ] Add confirmation dialogs for destructive actions
- [ ] Polish animations and transitions
- [ ] Improve error messages
- [ ] Add success notifications
- [ ] Accessibility audit (ARIA labels, keyboard nav)

---

### PHASE 5: Advanced Features (Week 6)
**Goal:** Power user features and automation

#### Sprint 5.1: Bulk Upload & Batch Analysis (Days 35-36)
- [ ] Allow multiple PDF uploads at once
- [ ] Show batch progress indicator
- [ ] Queue analysis requests
- [ ] Display results as they complete
- [ ] Add "Analyze All" button
- [ ] Test with 10+ files

#### Sprint 5.2: Email Notifications (Days 37-38)
- [ ] Set up email service (Postmark or SendGrid)
- [ ] Send email on bid deadline approaching
- [ ] Send weekly digest of pending bids
- [ ] Send notification on auto-ghosted projects
- [ ] Add email preferences to settings
- [ ] Test delivery and formatting

#### Sprint 5.3: Templates & Saved Searches (Day 39)
- [ ] Create bid templates (common project types)
- [ ] Save filter combinations
- [ ] Quick actions (mark as reviewed, add to watchlist)
- [ ] Keyboard shortcuts
- [ ] Test workflow efficiency

---

### PHASE 6: Integration & API (Week 7-8) - OPTIONAL
**Goal:** Connect to external systems (BuildingConnected, Procore)

#### Sprint 6.1: API Foundation (Days 40-42)
- [ ] Design RESTful API endpoints
- [ ] Add authentication (API keys)
- [ ] Document API with Swagger/OpenAPI
- [ ] Rate limiting
- [ ] Test with Postman

#### Sprint 6.2: BuildingConnected Integration (Days 43-45)
- [ ] Research BuildingConnected API
- [ ] Build webhook receiver for new bids
- [ ] Auto-import bid invitations
- [ ] Sync bid status back
- [ ] Test end-to-end

---

## 📊 PRIORITY MATRIX

### Must Have (P0) - Do First
1. ✅ Company Type selection (v1.6 requirement)
2. ✅ Product Match scoring (v1.6 requirement)
3. ✅ Multi-signal trade detection (v1.6 requirement)
4. ✅ Duplicate project detection (v1.6 requirement)
5. ✅ Contract risk confidence weighting (v1.6 requirement)
6. ✅ Score data lineage (v1.6 requirement)
7. ✅ Beta feedback widget (v1.6 requirement)
8. ✅ Passive ghost trigger (v1.6 requirement)

### Should Have (P1) - Do Second
9. GC Alias system
10. Admin Dashboard (GC review queue)
11. Enhanced analytics charts
12. Projects list filtering/sorting
13. Export to CSV
14. Mobile responsiveness

### Nice to Have (P2) - Do Later
15. Dark mode polish
16. Bulk upload
17. Email notifications
18. Saved searches/templates
19. API foundation
20. BuildingConnected integration

---

## 🗄️ DATABASE MIGRATION PLAN

### Migration 001: Company Types & Product Match
```sql
-- Add company type fields
ALTER TABLE user_preferences
  ADD COLUMN company_type TEXT DEFAULT 'subcontractor',
  ADD COLUMN provides_installation BOOLEAN DEFAULT true,
  ADD COLUMN product_lines TEXT[],
  ADD COLUMN product_categories TEXT[];

-- Add ghost threshold
ALTER TABLE user_preferences
  ADD COLUMN ghost_threshold_days INTEGER DEFAULT 60;
```

### Migration 002: Project Fingerprinting
```sql
-- Add project fingerprint for deduplication
ALTER TABLE projects
  ADD COLUMN project_fingerprint TEXT;

CREATE INDEX idx_project_fingerprint ON projects(project_fingerprint, user_id);

-- Create per-GC scoring table
CREATE TABLE project_gc_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gc_id UUID REFERENCES gc_master(id),
  gc_score INTEGER,
  competition_penalty INTEGER,
  final_bidindex_score INTEGER,
  recommendation TEXT,
  score_components JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration 003: Master GC & Review Queue
```sql
-- Master GC database
CREATE TABLE gc_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  normalized_name TEXT,
  city TEXT,
  state TEXT,
  aliases TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  total_users INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GC review queue for admin
CREATE TABLE gc_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_name TEXT NOT NULL,
  submitted_by_user_id UUID REFERENCES auth.users(id),
  ai_recommendation TEXT,
  ai_confidence NUMERIC(3,2),
  suggested_match_id UUID REFERENCES gc_master(id),
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);
```

### Migration 004: Beta Feedback
```sql
CREATE TABLE beta_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT CHECK (feedback_type IN ('bug', 'feature', 'ux', 'praise', 'confusion')),
  message TEXT NOT NULL,
  page_context TEXT,
  screenshot_url TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

---

## 📁 NEW FILE STRUCTURE

```
bidiq-mvp/
├── app.html                          # Main app (existing)
├── BidIQ_Founder_Dashboard.html      # Admin dashboard (enhanced)
├── index.html                        # Landing page (existing)
│
├── lib/
│   ├── buildingTypeExtraction.js    # Existing
│   ├── contractRiskDetection.js     # Existing (enhance with confidence)
│   ├── tradeDetection.js            # NEW - Multi-signal trade detection
│   ├── productMatch.js              # NEW - For distributors/mfg reps
│   ├── projectFingerprint.js        # NEW - Duplicate detection
│   └── gcNormalization.js           # NEW - AI-powered GC matching
│
├── components/
│   ├── GCAutocomplete.jsx           # NEW - Smart GC search
│   ├── GCReviewQueue.jsx            # NEW - Admin GC management
│   ├── BetaFeedbackWidget.jsx       # NEW - Feedback form
│   └── AnalyticsCharts.jsx          # NEW - Dashboard charts
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_layer0_intelligence_architecture.sql
│       ├── 003_company_types.sql    # NEW
│       ├── 004_project_fingerprinting.sql  # NEW
│       ├── 005_gc_master.sql        # NEW
│       └── 006_beta_feedback.sql    # NEW
│
├── docs/
│   ├── BidIntell_Product_Bible_v1_6.md
│   ├── IMPLEMENTATION_GAME_PLAN.md  # This file
│   └── API_DOCUMENTATION.md         # NEW - For Phase 6
│
└── README.md
```

---

## 🎯 SUCCESS METRICS

### Phase 1 Complete (Week 2)
- ✅ All v1.6 critical features implemented
- ✅ Company type selection working for all 3 types
- ✅ Multi-signal trade detection catches 95%+ of real trades
- ✅ Duplicate detection prevents redundant analysis
- ✅ Contract risks show confidence scores
- ✅ Every score component links to PDF source

### Phase 2 Complete (Week 3)
- ✅ Admin dashboard operational
- ✅ GC review queue processing < 5 min per submission
- ✅ Zero duplicate GCs in master list

### Phase 3 Complete (Week 4)
- ✅ Analytics dashboard shows trends
- ✅ Projects list fully filterable/sortable
- ✅ Export to CSV works for 1000+ projects

### Phase 4 Complete (Week 5)
- ✅ All pages load in <2 seconds
- ✅ Mobile responsive on iOS/Android
- ✅ Accessibility score >90

### Beta Launch Ready (Week 5)
- ✅ 10 beta users onboarded
- ✅ 50+ bids analyzed
- ✅ Users rate scores as accurate (7/10+)
- ✅ 80%+ onboarding completion
- ✅ 7/10 would pay $99/month

---

## 🚨 RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| AI extraction accuracy drops with new features | Medium | High | Test extensively, add fallbacks |
| Database schema changes break existing data | Low | Critical | Write careful migrations, backup first |
| Performance degrades with complex analytics | Medium | Medium | Implement caching, pagination |
| GC deduplication creates bad merges | Low | High | Human admin approval required |
| Beta users don't complete onboarding | Medium | High | Simplify flow, add skip options |

---

## 📞 NEXT STEPS - START HERE

1. **Review this plan** - Make sure priorities align
2. **Run database migrations** - Start with Migration 001
3. **Begin Sprint 1.1** - Company Types & Product Match
4. **Test each feature** - Don't move forward until it works
5. **Deploy incrementally** - Push to production after each sprint
6. **Collect feedback** - Use the beta feedback widget we build!

---

## 💬 QUESTIONS TO RESOLVE

1. **Company Type UI:** Step 0 in onboarding or Settings page?
2. **Product Match:** Use Claude API or build custom parser?
3. **Admin Dashboard:** Separate app or admin-only section of main app?
4. **Email Service:** Postmark (already have token) or SendGrid?
5. **Analytics:** Chart.js (simple) or Recharts (React-native)?
6. **Mobile:** Responsive only or build native apps later?

---

**Let's build this! 🚀**
