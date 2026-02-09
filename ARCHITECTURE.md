# BidIQ Architecture Documentation

**Last Updated:** February 9, 2026
**Version:** 1.5 (Beta Testing Phase)

---

## 🏗️ Overview

BidIQ is a **single-page application (SPA)** built with vanilla JavaScript, HTML, and CSS. It uses Supabase for the database and Netlify Functions for serverless backend API calls.

**Key Files:**
- `app.html` (11,000+ lines) - Main application (frontend + logic)
- `netlify/functions/analyze.js` - Backend AI API calls (Claude/OpenAI)
- `netlify/functions/notify.js` - Email notifications (Postmark)
- `netlify.toml` - Netlify configuration
- `.env` - API keys (gitignored for security)

---

## 📂 File Structure

```
bidiq-mvp/
├── app.html                    # Main application (everything in one file)
├── index_professional.html     # Landing page
├── test.html                   # Diagnostic page
├── netlify/
│   └── functions/
│       ├── analyze.js         # AI extraction backend
│       └── notify.js          # Email notifications
├── netlify.toml               # Netlify config
├── .env                       # API keys (NOT in git)
├── CLAUDE.md                  # Rules for AI assistant
├── MEMORY.md                  # Session context
├── DATA_SAFETY_PROTOCOL.md    # Database safety rules
├── ARCHITECTURE.md            # This file
├── SCHEMA.md                  # Database schema
├── TESTING_CHECKLIST.md       # Testing guide
└── BidIntell_Product_Bible_v1_8.md  # Product requirements
```

---

## 🎨 Frontend Architecture (app.html)

The app is a **single-page application** with tab-based navigation. All code lives in one HTML file for simplicity.

### Major Sections (Line Numbers)

**HTML Structure (~1-1700)**
- Dashboard tab
- Analyze tab (upload & analyze)
- Projects tab (project management)
- Report view (full screen report)
- Settings tab
- Onboarding flow
- Modals (outcome, GC rating, etc.)

**CSS (~100-800)**
- Variables (colors, spacing)
- Layout (cards, tables, forms)
- Components (buttons, badges, modals)
- Responsive design

**JavaScript (~1800-11000)**

| Section | Lines | Purpose |
|---------|-------|---------|
| **Initialization** | 1800-2300 | Supabase client, auth, Google Maps |
| **Database Functions** | 2300-3500 | CRUD operations (projects, GCs, keywords, settings) |
| **AI Extraction** | 5400-5900 | PDF parsing, Claude/OpenAI API calls, data extraction |
| **Scoring Engine** | 6000-6400 | BidIndex™ score calculation (location, keywords, GC, trade) |
| **Intelligence Engine** | 5800-6000 | AI validation and recommendations |
| **Dashboard** | 7400-7600 | Recent activity, stats, capacity indicator |
| **Projects Table** | 7600-7800 | Project list, filtering, sorting |
| **Report View** | 7800-8300 | Full report display, editing, saving |
| **Settings** | 8900-9300 | User preferences, onboarding |
| **Utilities** | 9300-10000 | Geocoding, distance calc, helpers |

---

## 🔄 Data Flow

### 1. User Uploads Bid → Analysis Flow

```
1. User drops PDF in upload zone (analyzeBid function)
   ↓
2. PDF parsed with PDF.js (extractTextFromPDF)
   ↓
3. Text sent to backend function (/api/analyze)
   ↓
4. Backend calls Claude API (extractWithClaude)
   ↓
5. AI extracts project details, building type, contract risks
   ↓
6. Frontend receives extracted data
   ↓
7. Scoring Engine calculates BidIndex score (calculateScore)
   ↓
8. Intelligence Engine validates data (intelligenceEngine)
   ↓
9. Project saved to Supabase (saveProject)
   ↓
10. Report displayed (showFullReport)
```

### 2. Score Calculation Flow

```
calculateScore(extracted, userSettings, selectedGCs)
   ↓
1. Location Score (0-100 points)
   - Geocode user office and project location
   - Calculate distance
   - Score based on service area preference
   ↓
2. Keywords Score (0-100 points)
   - Search for good keywords (user's trade terms)
   - Search for bad keywords (contract risks)
   - Weight: good keywords boost, bad keywords reduce
   ↓
3. GC Score (0-100 points)
   - Check GC ratings (1-5 stars)
   - Check win history
   - Multiple GCs = more competition = lower score
   ↓
4. Trade/Product Match (0-100 points)
   - Check if CSI divisions in bid match user's divisions
   - Multi-signal detection (keywords, division numbers, context)
   ↓
5. Final Score = Weighted Average
   - Location: 30%
   - Keywords: 25%
   - GC: 25%
   - Trade: 20%
   ↓
6. Recommendation = GO (80+) / REVIEW (60-79) / PASS (<60)
```

---

## 🔌 Backend Functions (Netlify)

### `/api/analyze` (analyze.js)

**Purpose:** Proxy AI API calls to keep keys secure

**Endpoints:**
- `extract_project_details` - Full project extraction with Claude
- `extract_building_type` - Building type classification
- `detect_contract_risks` - Contract risk analysis

**Request Format:**
```javascript
POST /api/analyze
{
  "action": "extract_project_details",
  "text": "bid document text...",
  "prompt": "AI prompt..."
}
```

**Response:**
```javascript
{
  "success": true,
  "content": "AI response text or JSON"
}
```

**Error Handling:**
- 401: Invalid API key
- 500: AI API error
- Returns error details in response

### `/api/notify` (notify.js)

**Purpose:** Send email notifications via Postmark

**Used for:**
- Error alerts (API failures, extraction errors)
- User notifications (optional future feature)

---

## 🗄️ Database (Supabase)

**Tables:**
- `users` - Supabase auth users
- `user_settings` - User preferences (location, keywords, etc.)
- `projects` - Analyzed bids and scores
- `keywords` - User's good/bad search terms
- `general_contractors` - GC database with ratings

**See SCHEMA.md for detailed table structure**

**Security:**
- Row Level Security (RLS) enabled
- Users can only see their own data
- Policies enforce user_id matching

---

## 🧩 Key Functions Reference

### Database Operations

| Function | Purpose | Location |
|----------|---------|----------|
| `getProjects()` | Load all projects for current user | ~3100 |
| `saveProject(data)` | Save/update project | ~3185 |
| `getGCs()` | Load all GCs for current user | ~3350 |
| `getKeywords()` | Load user's keywords | ~3450 |
| `getSettings()` | Load user settings | ~2900 |
| `updateSettings(data)` | Save settings | ~3000 |

### AI Extraction

| Function | Purpose | Location |
|----------|---------|----------|
| `callAI(action, text, prompt)` | Call backend AI function | ~5380 |
| `extractWithClaude(text)` | Extract all project data | ~5450 |
| `extractBuildingType(text)` | Classify building type | ~2593 |
| `detectContractRisks(text)` | Find contract risks | ~2634 |

### Scoring

| Function | Purpose | Location |
|----------|---------|----------|
| `calculateScore(...)` | Main scoring engine | ~6000 |
| `geocodeAddress(address)` | Convert address to coordinates | ~5047 |
| `calculateDistance(lat1, lon1, lat2, lon2)` | Haversine distance | ~6158 |

### UI Rendering

| Function | Purpose | Location |
|----------|---------|----------|
| `renderDashboard()` | Render dashboard tab | ~7400 |
| `renderProjectsTable(projects)` | Render projects list | ~7650 |
| `showFullReport(projectId)` | Show full report view | ~7800 |
| `renderGCSelector()` | Render GC autocomplete | ~4783 |

---

## 🔐 Authentication Flow

```
1. User visits app
   ↓
2. Supabase checks for session (onAuthStateChange)
   ↓
3. If no session → show onboarding
   ↓
4. User signs up/logs in
   ↓
5. Session created, user_id stored
   ↓
6. App loads user data (settings, projects, GCs, keywords)
   ↓
7. Dashboard displayed
```

**Session Management:**
- Supabase handles tokens automatically
- Session persists across page refreshes
- Auto-refresh on token expiry

---

## 📱 Tab Navigation

The app uses a simple tab system:

```javascript
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  // Show selected tab
  document.getElementById('tab-' + tabName).classList.add('active');
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}
```

**Available Tabs:**
- `dashboard` - Home screen with recent activity
- `analyze` - Upload and analyze bids
- `projects` - Project management table
- `settings` - User preferences

---

## 🎯 Scoring Algorithm Details

### Location Score (30% weight)

```javascript
// Based on distance from user's office
distance <= preferred_radius → 100 points
distance <= max_radius → 70-99 points (linear scale)
distance > max_radius → 50-69 points (diminishing returns)
```

### Keywords Score (25% weight)

```javascript
// Good keywords (user's trade terms)
keywords_found = search bid text for user's keywords
good_score = (keywords_found / total_keywords) * 100

// Bad keywords (contract risks)
risks_found = detect pay-if-paid, liquidated damages, etc.
risk_penalty = risks_found * -10 points

final_keywords_score = good_score - risk_penalty
```

### GC Score (25% weight)

```javascript
// Based on GC ratings (1-5 stars)
avg_rating = average of all selected GCs' ratings
rating_score = (avg_rating / 5) * 100

// Competition adjustment
if (gc_count > 1) {
  competition_penalty = (gc_count - 1) * 5 points
  rating_score -= competition_penalty
}
```

### Trade Match Score (20% weight)

```javascript
// Multi-signal detection
signals = [
  user_divisions match CSI divisions found,
  user_keywords found in bid,
  building_type matches user_building_types
]

confidence = average(signals)
trade_score = confidence * 100
```

---

## 🔄 State Management

**Global Variables:**
```javascript
let currentUser = null;              // Supabase user object
let currentAnalysis = null;          // Latest analysis result
let currentReportProject = null;     // Project being viewed in report
let selectedGCs = [];                // GCs selected for current analysis
let uploadedFiles = [];              // Files in upload queue
let allProjectsCache = [];           // Cached projects for filtering
```

**No state management library** - uses simple global variables and re-rendering functions.

---

## 🐛 Error Handling

### Backend Errors
- API call failures logged to console
- User sees friendly error message
- Founder receives email alert (via /api/notify)

### Frontend Errors
- Try-catch blocks around critical operations
- Fallback to "Unknown" or empty values
- Error banners shown to user

### Common Error Patterns
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  showErrorBanner('User-friendly message');
  sendErrorEmail('Error Type', error.message);
  return fallbackValue;
}
```

---

## 🚀 Performance Considerations

### Caching
- Projects cached after first load (`allProjectsCache`)
- GCs cached after first load
- Keywords cached after first load
- Only re-fetch when data changes

### Lazy Loading
- Dashboard loads first (fastest)
- Other tabs load data when clicked
- Report view loads project on-demand

### PDF Processing
- Large PDFs truncated to 100,000 characters for AI
- Worker thread for PDF.js (doesn't block UI)

---

## 🔧 Development Workflow

### Local Development
```bash
# Start Netlify Dev (includes backend functions)
netlify dev

# App runs at http://localhost:8888
```

### Making Changes
1. **Read CLAUDE.md first** - Safety rules
2. **Commit before changes** - `git commit -m "Before: [description]"`
3. Make changes to app.html
4. Test locally
5. Commit after changes - `git commit -m "Fixed: [description]"`
6. Deploy to Netlify (if ready)

### Testing
- See **TESTING_CHECKLIST.md** for manual tests
- No automated tests currently

---

## 📦 Dependencies

### Frontend
- **PDF.js** - PDF parsing (CDN: Mozilla)
- **Supabase JS** - Database client (CDN)
- **Google Maps Places API** - Address autocomplete

### Backend (Netlify Functions)
- **@anthropic-ai/sdk** - Claude API
- **openai** - OpenAI API (backup)
- **postmark** - Email notifications
- **@supabase/supabase-js** - Database access

### Environment Variables (.env)
```
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
POSTMARK_API_KEY=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

---

## 🎓 Learning Resources

### Understanding the Codebase
1. Start with **BidIntell_Product_Bible_v1_8.md** - Product vision
2. Read **SCHEMA.md** - Database structure
3. Read this file (ARCHITECTURE.md) - Code organization
4. Search app.html for specific functions using line numbers above

### Key Concepts
- **BidIndex™ Score** - Weighted scoring algorithm (lines 6000-6400)
- **Intelligence Engine** - AI validation layer (lines 5800-6000)
- **RLS (Row Level Security)** - Supabase security model
- **Serverless Functions** - Netlify Functions for backend

---

## 🔮 Future Improvements

### Code Organization
- [ ] Split app.html into modules (auth.js, scoring.js, ui.js, etc.)
- [ ] Use a build tool (Vite, Webpack) for bundling
- [ ] Add TypeScript for type safety

### Testing
- [ ] Add automated tests (Jest, Playwright)
- [ ] Add integration tests for scoring
- [ ] Add E2E tests for critical flows

### Performance
- [ ] Implement virtual scrolling for large project lists
- [ ] Add service worker for offline support
- [ ] Optimize PDF parsing (stream processing)

### Architecture
- [ ] Consider React/Vue for better state management
- [ ] Add WebSocket for real-time updates
- [ ] Implement proper routing (React Router, Vue Router)

---

## 📞 Getting Help

**When stuck:**
1. Search this file for the function/feature
2. Check **CLAUDE.md** for rules and gotchas
3. Check **MEMORY.md** for recent issues and solutions
4. Read the Product Bible for product context

**Common Questions:**
- "Where is the scoring logic?" → Lines 6000-6400
- "How do I add a new table column?" → See SCHEMA.md, update RLS policies
- "Why isn't data saving?" → Check console, verify RLS policies, check MEMORY.md
- "How do I deploy?" → See Netlify dashboard or ask Claude

---

**Last Updated:** February 9, 2026 by Claude Code
**Version:** 1.0
