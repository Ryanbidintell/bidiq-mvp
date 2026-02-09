# BidIntell Modular Architecture

## Directory Structure

```
src/
├── app.js                 # Main application entry point
├── auth/
│   └── authManager.js    # Authentication & session management
├── api/
│   └── databaseClient.js # Supabase CRUD operations
├── scoring/
│   └── bidScorer.js      # Bid scoring algorithm
├── utils/
│   └── validators.js     # Input validation utilities
├── components/           # UI components (to be added)
├── extraction/           # PDF extraction logic (to be added)
└── ui/                   # UI utilities (to be added)
```

## Core Modules

### 1. **AuthManager** (`auth/authManager.js`)
Handles all authentication operations:
- Sign up / Sign in / Sign out
- Session management
- Password reset
- Auth state listeners

```javascript
import { AuthManager } from './auth/authManager.js';

const auth = new AuthManager(supabaseClient);
await auth.signIn(email, password);
```

### 2. **DatabaseClient** (`api/databaseClient.js`)
Provides typed methods for all database operations:
- User settings CRUD
- Projects CRUD
- GCs CRUD
- Keywords CRUD
- Beta feedback
- API usage tracking

```javascript
import { DatabaseClient } from './api/databaseClient.js';

const db = new DatabaseClient(supabaseClient);
const projects = await db.getProjects(userId);
```

### 3. **BidScorer** (`scoring/bidScorer.js`)
Calculates comprehensive bid scores:
- Location scoring
- Keyword matching
- GC relationship scoring
- Trade matching
- Weighted final score
- Recommendations (GO/REVIEW/PASS)

```javascript
import { BidScorer } from './scoring/bidScorer.js';

const scorer = new BidScorer(userSettings);
const score = scorer.calculateScore(project, gcs, keywords);
```

### 4. **Validators** (`utils/validators.js`)
Input validation and sanitization:
- Email validation
- Password strength
- XSS prevention
- Range validation
- Required field checking

```javascript
import { Validators } from './utils/validators.js';

const isValid = Validators.isValidEmail(email);
const sanitized = Validators.sanitizeString(input);
```

### 5. **BidIntellApp** (`app.js`)
Main application orchestrator:
- Initializes all modules
- Manages app state
- Handles routing between screens
- Coordinates data loading

```javascript
// Auto-initialized as window.app
const user = app.getUser();
const settings = app.getSettings();
const scorer = app.getScorer();
```

## Integration with Existing Code

### Option 1: Full Migration (Recommended)
1. Create new `index.html` that imports modules
2. Gradually migrate UI components
3. Test thoroughly
4. Replace `app.html` when complete

### Option 2: Hybrid Approach
1. Keep `app.html` as-is
2. Import new modules via `<script type="module">`
3. Replace functions incrementally
4. Maintain backward compatibility

### Option 3: Parallel Development
1. Build new features using modules
2. Maintain `app.html` for existing features
3. Gradually sunset old code

## Benefits

### Code Organization
- Clear separation of concerns
- Easy to find and modify code
- Testable individual modules

### Maintainability
- Smaller, focused files
- Less duplication
- Easier onboarding for new developers

### Performance
- Can lazy-load modules
- Better bundling options
- Improved caching

### Testing
- Unit test individual modules
- Mock dependencies easily
- Integration tests simpler

## Next Steps

1. **Extract UI Components**
   - Modal component
   - Toast notifications (already done)
   - Form components
   - Card components

2. **Extract PDF Logic**
   - PDF text extraction
   - AI analysis wrapper
   - Contract risk detection

3. **Create New Index.html**
   - Import all modules
   - Use modular code
   - Maintain same UI

4. **Add Tests**
   - Unit tests for each module
   - Integration tests
   - E2E tests

## Migration Script

To help migrate, use:
```bash
node migrate-to-modules.js
```

This will:
1. Backup `app.html` to `app.html.backup`
2. Create new `index.html` with modular imports
3. Generate migration report
4. Suggest next steps
