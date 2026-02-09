# BidIQ Database Schema Documentation

**Last Updated:** February 9, 2026
**Database:** Supabase PostgreSQL
**Version:** 1.5 (Beta Testing Phase)

---

## 📊 Overview

BidIQ uses **Supabase PostgreSQL** with **Row Level Security (RLS)** enabled on all tables. Each user can only access their own data.

**Tables:**
1. `users` - Supabase Auth users (managed by Supabase)
2. `user_settings` - User preferences and configuration
3. `projects` - Analyzed bids with scores and outcomes
4. `keywords` - User's trade-specific search terms
5. `general_contractors` - GC database with ratings and history

---

## 🔐 Security Model

**Row Level Security (RLS):**
- All tables have `user_id` foreign key to `auth.users(id)`
- Policies enforce: `user_id = auth.uid()`
- Users can only CRUD their own records

**Enable RLS on new tables:**
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own records"
ON table_name
FOR ALL
USING (user_id = auth.uid());
```

---

## 📋 Table: `user_settings`

**Purpose:** Store user preferences, office location, and configuration

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to auth.users(id) |
| `created_at` | timestamp | NO | now() | When record created |
| `updated_at` | timestamp | YES | now() | Last updated timestamp |
| `company_name` | text | YES | null | User's company name |
| `street` | text | YES | null | Office street address |
| `city` | text | YES | null | Office city |
| `state` | text | YES | null | Office state (2-letter code) |
| `zip` | text | YES | null | Office ZIP code |
| `lat` | numeric | YES | null | Office latitude |
| `lng` | numeric | YES | null | Office longitude |
| `service_area_preferred` | integer | NO | 50 | Preferred service radius (miles) |
| `service_area_max` | integer | NO | 100 | Maximum service radius (miles) |
| `decision_time` | integer | NO | 45 | Decision time (minutes) |
| `default_stars` | integer | NO | 3 | Default GC rating (1-5 stars) |
| `capacity` | text | NO | 'moderate' | Current capacity (low, moderate, high) |
| `onboarding_completed` | boolean | NO | false | Has user completed onboarding? |
| `ai_advisor_name` | text | NO | 'Sam' | Name of AI advisor in reports |
| `company_type` | text | NO | 'subcontractor' | Company type (subcontractor, supplier) |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users(id)` ON DELETE CASCADE
- **Unique:** `user_id` (one settings record per user)
- **Check:** `decision_time` must be integer (minutes)
- **Check:** `default_stars` between 1-5
- **Check:** `capacity` in ('low', 'moderate', 'high')

### Indexes

```sql
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

### RLS Policy

```sql
CREATE POLICY "Users can manage their own settings"
ON user_settings FOR ALL
USING (user_id = auth.uid());
```

### Example Data

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "company_name": "Acme HVAC",
  "city": "Kansas City",
  "state": "MO",
  "zip": "64111",
  "lat": 39.0997,
  "lng": -94.5786,
  "service_area_preferred": 50,
  "service_area_max": 100,
  "decision_time": 45,
  "default_stars": 3,
  "capacity": "moderate",
  "onboarding_completed": true,
  "company_type": "subcontractor"
}
```

---

## 📋 Table: `projects`

**Purpose:** Store analyzed bids with extraction data, scores, and outcomes

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to auth.users(id) |
| `created_at` | timestamp | NO | now() | When project created |
| `updated_at` | timestamp | YES | now() | Last updated |
| `extracted_data` | jsonb | YES | {} | AI-extracted project details |
| `scores` | jsonb | YES | {} | BidIndex scores and components |
| `gcs` | jsonb | YES | [] | Array of GC objects with ratings |
| `outcome` | text | YES | 'pending' | Bid outcome (pending, won, lost, ghost) |
| `outcome_date` | date | YES | null | When outcome occurred |
| `outcome_notes` | text | YES | null | Notes about outcome |
| `outcome_amount` | numeric | YES | null | Contract amount (if won) |
| `outcome_margin` | numeric | YES | null | Profit margin % (if won) |
| `outcome_confidence` | integer | YES | null | Confidence in outcome (1-5) |
| `decline_reasons` | jsonb | YES | [] | Reasons for declining bid |
| `file_name` | text | YES | null | Original PDF filename |
| `file_size` | integer | YES | null | File size in bytes |
| `analysis_date` | timestamp | YES | null | When analysis completed |
| `building_type` | jsonb | YES | null | Building type object {type, confidence} |
| `contract_risks` | jsonb | YES | {} | Detected contract risks |
| `good_keywords` | jsonb | YES | [] | Good keywords found |
| `bad_keywords` | jsonb | YES | [] | Bad keywords found |
| `validationStatus` | jsonb | YES | null | Intelligence Engine validation |
| `aiAdvisorOutput` | text | YES | null | AI advisor recommendations |
| `scoreExplanation` | text | YES | null | Score explanation text |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users(id)` ON DELETE CASCADE
- **Check:** `outcome` in ('pending', 'won', 'lost', 'ghost', 'declined')
- **Check:** `outcome_confidence` between 1-5 (if not null)

### Indexes

```sql
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_outcome ON projects(outcome);
```

### RLS Policy

```sql
CREATE POLICY "Users can manage their own projects"
ON projects FOR ALL
USING (user_id = auth.uid());
```

### Example Data

```json
{
  "id": "42bf25a0-1a6c-43b6-beef-08e0730c2539",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-09T19:33:43Z",
  "extracted_data": {
    "project_name": "Lenexa Old Town Activity Center",
    "project_city": "Lenexa",
    "project_state": "KS",
    "project_address": "9301 Pflumm Road",
    "building_type": "Government",
    "bid_deadline": "2026-03-15",
    "project_size_sf": 25000,
    "owner_name": "City of Lenexa",
    "architect_name": "HNTB Architecture"
  },
  "scores": {
    "final": 89,
    "recommendation": "GO",
    "components": {
      "location": {"score": 95, "details": {"dist": 4}},
      "keywords": {"score": 85},
      "gc": {"score": 100},
      "trade": {"score": 90}
    }
  },
  "gcs": [
    {"name": "Turner Construction", "rating": 5, "bids": 3, "wins": 0}
  ],
  "outcome": "pending"
}
```

### JSONB Field Structures

**extracted_data:**
```json
{
  "project_name": "string",
  "project_city": "string",
  "project_state": "string (2 letters)",
  "project_address": "string",
  "project_zip": "string",
  "building_type": "string",
  "bid_deadline": "ISO date string",
  "project_size_sf": "integer",
  "estimated_value": "integer",
  "owner_name": "string",
  "architect_name": "string",
  "gc_name": "string",
  "spec_divisions_found": ["array of CSI division numbers"],
  "contract_risk_clauses": {
    "pay_if_paid": "boolean",
    "liquidated_damages": "boolean",
    "broad_indemnification": "boolean",
    "no_damage_for_delay": "boolean",
    "waiver_consequential_damages": "boolean",
    "retainage_over_10_percent": "boolean"
  },
  "contract_language_present": "boolean",
  "scope_summary": "string"
}
```

**scores:**
```json
{
  "final": "integer 0-100",
  "recommendation": "GO | REVIEW | PASS",
  "bidindex_score": "integer (legacy field)",
  "components": {
    "location": {
      "score": "integer 0-100",
      "weight": "decimal",
      "details": {
        "dist": "integer miles",
        "userOffice": "address string",
        "projectLocation": "address string"
      }
    },
    "keywords": {
      "score": "integer 0-100",
      "weight": "decimal"
    },
    "gc": {
      "score": "integer 0-100",
      "weight": "decimal"
    },
    "trade": {
      "score": "integer 0-100",
      "weight": "decimal"
    }
  },
  "explanation": "string (legacy field)",
  "action_items": ["array of strings (legacy)"]
}
```

**gcs:**
```json
[
  {
    "name": "string",
    "rating": "integer 1-5",
    "bids": "integer",
    "wins": "integer"
  }
]
```

---

## 📋 Table: `keywords`

**Purpose:** Store user's trade-specific keywords for bid matching

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to auth.users(id) |
| `created_at` | timestamp | NO | now() | When keyword created |
| `keyword` | text | NO | - | Search term (e.g., "HVAC", "plumbing") |
| `type` | text | NO | 'good' | Keyword type (good, bad) |
| `category` | text | YES | null | Category (trade, product, risk) |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users(id)` ON DELETE CASCADE
- **Check:** `type` in ('good', 'bad')
- **Unique:** `user_id, keyword` (no duplicate keywords per user)

### Indexes

```sql
CREATE INDEX idx_keywords_user_id ON keywords(user_id);
CREATE INDEX idx_keywords_type ON keywords(type);
```

### RLS Policy

```sql
CREATE POLICY "Users can manage their own keywords"
ON keywords FOR ALL
USING (user_id = auth.uid());
```

### Example Data

```json
[
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "keyword": "HVAC",
    "type": "good",
    "category": "trade"
  },
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "keyword": "mechanical",
    "type": "good",
    "category": "trade"
  },
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "keyword": "pay if paid",
    "type": "bad",
    "category": "risk"
  }
]
```

---

## 📋 Table: `general_contractors`

**Purpose:** Store GC database with ratings and win/loss history

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to auth.users(id) |
| `created_at` | timestamp | NO | now() | When GC created |
| `updated_at` | timestamp | YES | now() | Last updated |
| `name` | text | NO | - | GC company name |
| `rating` | integer | NO | 3 | Star rating (1-5) |
| `bids` | integer | NO | 0 | Total bids with this GC |
| `wins` | integer | NO | 0 | Total wins with this GC |
| `notes` | text | YES | null | User notes about GC |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users(id)` ON DELETE CASCADE
- **Check:** `rating` between 1-5
- **Check:** `bids >= 0`
- **Check:** `wins >= 0`
- **Check:** `wins <= bids`
- **Unique:** `user_id, name` (no duplicate GC names per user)

### Indexes

```sql
CREATE INDEX idx_gcs_user_id ON general_contractors(user_id);
CREATE INDEX idx_gcs_name ON general_contractors(name);
```

### RLS Policy

```sql
CREATE POLICY "Users can manage their own GCs"
ON general_contractors FOR ALL
USING (user_id = auth.uid());
```

### Example Data

```json
[
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Turner Construction",
    "rating": 5,
    "bids": 12,
    "wins": 8,
    "notes": "Great communication, pays on time"
  },
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "McCarthy Building",
    "rating": 4,
    "bids": 8,
    "wins": 3,
    "notes": "Competitive pricing, sometimes slow payment"
  }
]
```

---

## 🔄 Schema Migrations

### How to Add a Column

1. **Write SQL migration:**
```sql
-- add_column_example.sql
ALTER TABLE table_name
ADD COLUMN new_column_name data_type DEFAULT default_value;
```

2. **Run in Supabase SQL Editor**
3. **Update RLS policies if needed**
4. **Test with a query:**
```sql
SELECT * FROM table_name LIMIT 1;
```

5. **Document in MEMORY.md**

### Migration Example (From Feb 9, 2026)

```sql
-- Fix user_settings schema
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT;

ALTER TABLE user_settings
ALTER COLUMN decision_time TYPE INTEGER USING decision_time::integer,
ALTER COLUMN decision_time SET DEFAULT 45;
```

---

## 📊 Database Relationships

```
auth.users (Supabase managed)
    ├── user_settings (1:1)
    │   └── user_id → auth.users.id
    │
    ├── projects (1:many)
    │   └── user_id → auth.users.id
    │
    ├── keywords (1:many)
    │   └── user_id → auth.users.id
    │
    └── general_contractors (1:many)
        └── user_id → auth.users.id
```

**Cascade Deletes:**
- When user deleted → all related records deleted automatically

---

## 🔍 Common Queries

### Get User's Complete Data
```sql
-- Settings
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- Projects
SELECT * FROM projects WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- Keywords
SELECT * FROM keywords WHERE user_id = auth.uid() ORDER BY type, keyword;

-- GCs
SELECT * FROM general_contractors WHERE user_id = auth.uid() ORDER BY rating DESC, name;
```

### Get Projects by Outcome
```sql
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND outcome = 'won'
ORDER BY outcome_date DESC;
```

### Get Top-Rated GCs
```sql
SELECT * FROM general_contractors
WHERE user_id = auth.uid()
  AND rating >= 4
ORDER BY rating DESC, wins DESC;
```

### Get Recent High-Score Projects
```sql
SELECT * FROM projects
WHERE user_id = auth.uid()
  AND (scores->>'final')::int >= 80
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🛡️ Backup & Recovery

### Manual Backup
1. Go to Supabase Dashboard
2. Database → Backups
3. Create manual backup
4. Download (if needed)

### Point-in-Time Recovery (PITR)
- ⚠️ **TODO:** Enable PITR in Supabase (requires paid plan)
- Allows restore to any point in last 7 days

### Test Data Restore
- Script available: `restore-test-data.sql`
- Restores sample projects and GCs for testing

---

## ⚠️ Known Issues & Gotchas

### 1. Type Mismatches
**Problem:** Code expects TEXT but DB has INTEGER (e.g., `decision_time`)
**Solution:** Always check schema before writing code

### 2. JSONB Fields
**Problem:** JSONB fields can have varying structures
**Solution:** Always provide fallbacks: `extracted?.field || 'default'`

### 3. RLS Policies
**Problem:** Forgetting to add RLS policy → users can't access data
**Solution:** Always enable RLS and create policy when creating table

### 4. Cascade Deletes
**Problem:** Deleting user deletes ALL their data
**Solution:** Use soft deletes (add `deleted_at` column) for important data

---

## 📝 Schema Version History

| Date | Version | Changes |
|------|---------|---------|
| Feb 3, 2026 | 1.0 | Initial schema |
| Feb 7, 2026 | 1.1 | Added outcome fields to projects |
| Feb 9, 2026 | 1.2 | Added street/zip to user_settings, fixed decision_time type |

---

## 🚀 Future Schema Changes

**Phase 2 (Q1 2026):**
- [ ] Add `teams` table for multi-user companies
- [ ] Add `api_usage_logs` table for cost tracking
- [ ] Add `email_notifications` table for notification history

**Phase 3 (Q2 2026):**
- [ ] Add `templates` table for proposal templates
- [ ] Add `integrations` table for third-party connections
- [ ] Add `subscriptions` table for billing

---

**Last Updated:** February 9, 2026 by Claude Code
**Version:** 1.2
