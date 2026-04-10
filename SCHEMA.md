# BidIQ Database Schema Documentation

**Last Updated:** March 5, 2026
**Database:** Supabase PostgreSQL
**Version:** 2.0 (current state — audited from live code)

---

## 📊 Overview

BidIQ uses **Supabase PostgreSQL** with **Row Level Security (RLS)** enabled on all user-data tables. Each user can only access their own data.

**Tables (11 total):**
| Table | Type | Description |
|-------|------|-------------|
| `user_settings` | User data | Profile, preferences, scoring weights |
| `user_keywords` | User data | Good/bad keyword arrays (single row per user) |
| `clients` | User data | All client types (GCs, subs, owners, etc.) |
| `projects` | User data | Analyzed bids with scores and outcomes |
| `gc_competition_density` | User data | Per-GC bidder count data (Module 4) |
| `oauth_connections` | User data | OAuth tokens for 3rd-party integrations (BC, etc.) |
| `user_revenue` | System | Stripe subscription data (written by webhook) |
| `api_usage` | System | Per-call AI cost tracking |
| `beta_feedback` | System | In-app feedback submissions |
| `admin_events` | System | Behavioral event log (fire-and-forget) |
| `admin_metrics_snapshots` | System | Daily aggregated metrics (written by daily-snapshot.js) |

> **Note:** `auth.users` is managed entirely by Supabase Auth — not documented here.

---

## 🔐 Security Model

**Row Level Security (RLS):**
- All user-data tables have `user_id` FK to `auth.users(id)`
- Policies enforce: `user_id = auth.uid()`
- System tables (`admin_events`, `admin_metrics_snapshots`, `api_usage`) have RLS but are also readable by admin dashboard (service role key in Netlify env)

**Auth Method:** Magic link only (no password). Supabase sends via Postmark (SMTP). From address: `hello@bidintell.ai`.

**Adding RLS to new tables:**
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own records"
ON table_name FOR ALL
USING (user_id = auth.uid());
```

---

## 📋 Table: `user_settings`

**Purpose:** User profile, preferences, scoring configuration. One row per user.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | FK → auth.users(id), UNIQUE |
| `created_at` | timestamp | NO | now() | Account creation time |
| `updated_at` | timestamp | YES | now() | Last save timestamp |
| `company_name` | text | YES | null | User's company name |
| `user_name` | text | YES | null | Contact name |
| `user_email` | text | YES | null | Contact email (for reports) |
| `user_position` | text | YES | null | Job title |
| `company_type` | text | NO | 'subcontractor' | Company type (see values below) |
| `provides_installation` | boolean | YES | true | Does company install (vs supply-only)? |
| `product_lines` | text[] | YES | [] | Supplier product lines |
| `product_categories` | text[] | YES | [] | Supplier product categories |
| `street` | text | YES | null | Office street address |
| `city` | text | YES | null | Office city |
| `state` | text | YES | null | Office state (2-letter) |
| `zip` | text | YES | null | Office ZIP |
| `lat` | numeric | YES | null | Office latitude (legacy, may not be populated) |
| `lng` | numeric | YES | null | Office longitude (legacy, may not be populated) |
| `search_radius` | integer | NO | 50 | Preferred service radius (miles) |
| `location_matters` | boolean | NO | true | Include location in scoring? |
| `trades` | text[] | YES | [] | CSI division codes (e.g. ['09', '23']) |
| `preferred_csi_sections` | text[] | YES | [] | CSI section codes (e.g. ['09 65 00']) |
| `client_types` | text[] | YES | ['gcs'] | Which client types to score GCs for |
| `risk_tolerance` | text | NO | 'medium' | Contract risk sensitivity (low/medium/high) |
| `capacity` | text | NO | 'steady' | Current capacity (slow/steady/aggressive) |
| `ai_advisor_name` | text | NO | 'Sam' | AI advisor persona name |
| `ai_advisor_tone` | text | NO | 'supportive' | AI advisor tone (supportive/direct/analytical) |
| `weights` | jsonb | YES | null | Scoring weights `{location, keywords, gc, trade}` |
| `decision_time` | integer | NO | 45 | Max bid decision time (minutes) |
| `default_stars` | integer | NO | 3 | Default rating for new clients (1-5) |
| `target_margin` | integer | NO | 15 | Target profit margin % |
| `baseline_win_rate` | numeric | YES | null | Historical win rate % (for ROI calc) |
| `onboarding_completed` | boolean | NO | false | Has user finished onboarding wizard? |
| `plan_rooms` | text[] | YES | {} | Plan rooms used to receive bid invitations |
| `outcome_reminder_days` | integer | YES | 21 | Days before sending open-bid nudge (null = Never) |

**`company_type` values:** `subcontractor`, `supplier`, `gc`, `owner`, `consultant`

**`weights` jsonb structure:**
```json
{ "location": 25, "keywords": 30, "gc": 25, "trade": 20 }
```
Weights must sum to 100. Customizable per user.

### Constraints
- **Unique:** `user_id` (one row per user)
- **Check:** `default_stars` between 1-5
- **Check:** `capacity` in ('slow', 'steady', 'aggressive')
- **Check:** `risk_tolerance` in ('low', 'medium', 'high')

### RLS Policy
```sql
CREATE POLICY "Users can manage their own settings"
ON user_settings FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `user_keywords`

**Purpose:** Good and bad bid-matching keywords. Single row per user using array columns (NOT multi-row).

> ⚠️ **Important:** This is NOT a `keywords` table with one row per keyword. It's `user_keywords` with two array columns. Old docs were wrong.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | FK → auth.users(id), UNIQUE |
| `created_at` | timestamp | NO | now() | When created |
| `updated_at` | timestamp | YES | now() | Last updated |
| `good_keywords` | text[] | NO | [] | Keywords that increase bid score |
| `bad_keywords` | text[] | NO | [] | Keywords that decrease bid score |

### Constraints
- **Unique:** `user_id` (one row per user)
- Upsert uses `onConflict: 'user_id'`

### RLS Policy
```sql
CREATE POLICY "Users can manage their own keywords"
ON user_keywords FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `clients`

**Purpose:** All client relationships — GCs, subs, owners, etc. Formerly named `general_contractors`.

> ⚠️ **Important:** Table is `clients`, NOT `general_contractors`. The `getGCs()` function is a legacy wrapper around `getClients('general_contractor')`.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `created_at` | timestamp | NO | now() | When created |
| `updated_at` | timestamp | YES | now() | Last updated |
| `name` | text | NO | — | Client company name |
| `client_type` | text | NO | 'general_contractor' | Client category (see values below) |
| `rating` | integer | NO | 3 | Star rating (1-5) |
| `bids` | integer | NO | 0 | Total bids with this client |
| `wins` | integer | NO | 0 | Total wins with this client |
| `risk_tags` | text[] | YES | [] | Contract risk flags (e.g. ['pay_if_paid']) |

**`client_type` values:**
- `general_contractor` — GC (most common)
- `subcontractor` — Another sub (for sub-to-sub work)
- `end_user` — Direct end-user client
- `building_owner` — Property owner
- `municipality` — Government / municipal client
- `distributor` — Distributor
- `manufacturer_rep` — Manufacturer representative

### Constraints
- **Unique:** `user_id, name` (no duplicate client names per user)
- **Check:** `rating` between 1-5

### RLS Policy
```sql
CREATE POLICY "Users can manage their own clients"
ON clients FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `projects`

**Purpose:** Every analyzed bid — extracted data, scores, AI output, outcomes.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `created_at` | timestamp | NO | now() | Analysis timestamp (also used as bid date) |
| `updated_at` | timestamp | YES | now() | Last updated |
| `extracted_data` | jsonb | YES | {} | AI-extracted project fields |
| `scores` | jsonb | YES | {} | BidIndex score, components, recommendation |
| `gcs` | jsonb | YES | [] | GC objects selected during analysis |
| `files` | jsonb | YES | [] | File metadata array `[{name, size}]` |
| `full_text` | text | YES | null | Full PDF text (for re-analysis) |
| `outcome` | text | YES | 'pending' | pending / won / lost / ghost / declined |
| `outcome_data` | jsonb | YES | {} | Full outcome form data (see structure below) |
| `good_found` | text[] | YES | [] | Good keywords found in this bid |
| `bad_found` | text[] | YES | [] | Bad keywords found in this bid |
| `trades_found` | text[] | YES | [] | CSI divisions found in bid text |
| `bid_divisions_submitted` | text[] | YES | null | CSI divisions user actually bid on (Module 1) |
| `fingerprint` | text | YES | null | Duplicate detection hash |
| `market_metro_area` | text | YES | null | Metro area (Layer 0 intelligence) |
| `building_type` | text | YES | null | Building type string (e.g. 'Healthcare') |
| `contract_risks` | jsonb | YES | null | Detected contract risk clauses |
| `validation_status` | jsonb | YES | null | Intelligence Engine completeness check |
| `intelligence_tags` | jsonb | YES | {} | Layer 0 market intelligence tags |
| `ai_advisor_output` | text | YES | null | AI advisor recommendation text |
| `user_agreement` | text | YES | 'agree' | User's reaction to AI score (agree/disagree) |
| `user_agreement_note` | text | YES | null | Free-text note if user disagreed |
| `created_year` | integer | YES | null | Denormalized year (for fast aggregation) |
| `created_month` | integer | YES | null | Denormalized month (1-12) |
| `created_week` | integer | YES | null | Denormalized week number |
| `outcome_nudge_count` | integer | NO | 0 | Times a re-engagement nudge was sent for this bid |
| `last_nudge_sent_at` | timestamptz | YES | null | When the most recent nudge was sent |

### JSONB: `extracted_data`
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
  "spec_divisions_found": ["09", "23"],
  "contract_language_present": "boolean",
  "scope_summary": "string"
}
```

### JSONB: `scores`
```json
{
  "final": 89,
  "recommendation": "GO | REVIEW | PASS",
  "components": {
    "location": {
      "score": 95, "weight": 0.25,
      "details": { "dist": 4, "userOffice": "...", "projectLocation": "..." }
    },
    "keywords": {
      "score": 85, "weight": 0.30,
      "details": { "good_found": ["HVAC"], "bad_found": [] }
    },
    "gc": {
      "score": 100, "weight": 0.25,
      "details": { "rating": 5, "bids": 12, "wins": 8 }
    },
    "trade": {
      "score": 90, "weight": 0.20,
      "details": {
        "scoring_mode": "section | division",
        "found": ["09"],
        "foundSections": ["09 65 00"],
        "allSections": ["09 65 00", "09 30 00"]
      }
    }
  }
}
```

### JSONB: `outcome_data`
```json
{
  "amount": 250000,
  "margin": 18.5,
  "confidence": 4,
  "notes": "Won due to prior healthcare experience",
  "bidder_count": 5,
  "alternates": [
    { "description": "Alt 1 - Upgraded flooring", "amount": 15000, "margin": 22 }
  ],
  "pricing_feedback": "They said our price was competitive",
  "ghosted_gcs": ["Turner Construction"],
  "decline_reasons": ["too_competitive", "wrong_trade"]
}
```

### JSONB: `contract_risks`
```json
{
  "risks_found": [
    {
      "clause_type": "pay_if_paid",
      "severity": "high",
      "classification": "pay-if-paid (condition precedent)",
      "exact_quote": "express condition precedent of payment therefor...",
      "plain_english": "Contractor owes you nothing if owner doesn't pay",
      "state_note": "Enforceable in most states except NY, CA"
    }
  ],
  "overall_risk_level": "high",
  "risk_summary": "2-3 sentence summary...",
  "risk_score_penalty": 18
}
```

### Constraints
- **Check:** `outcome` in ('pending', 'won', 'lost', 'ghost', 'declined')

### RLS Policy
```sql
CREATE POLICY "Users can manage their own projects"
ON projects FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `gc_competition_density`

**Purpose:** Track bidder counts per GC per outcome for Module 4 (Competitive Pressure Score).

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `created_at` | timestamp | NO | now() | When recorded |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `gc_name` | text | NO | — | GC company name |
| `building_type` | text | YES | null | Project building type |
| `bidder_count` | integer | NO | — | Number of bidders on that project |
| `outcome` | text | NO | — | won / lost |
| `project_id` | uuid | YES | null | FK → projects(id) |

### RLS Policy
```sql
CREATE POLICY "Users can manage their own competition data"
ON gc_competition_density FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `oauth_connections`

**Purpose:** Stores OAuth access/refresh tokens for 3rd-party integrations (BuildingConnected, etc.). One row per user per provider. Never hard-delete — set `status='revoked'`.

> ⚠️ **Security:** Tokens are written only by `bc-oauth-callback.js` (service role key). Never read tokens from app.html. RLS prevents cross-user access.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `provider` | text | NO | — | Integration name (e.g. 'buildingconnected') |
| `access_token` | text | NO | — | OAuth access token |
| `refresh_token` | text | YES | null | OAuth refresh token |
| `token_expires_at` | timestamptz | YES | null | When access_token expires |
| `scope` | text | YES | null | Granted OAuth scopes |
| `connected_at` | timestamptz | YES | now() | When user first connected |
| `last_sync_at` | timestamptz | YES | null | Last successful data sync |
| `status` | text | YES | 'active' | 'active', 'expired', 'revoked' |

### Constraints
- **Unique:** `(user_id, provider)` — one connection per provider per user

### RLS Policy
```sql
CREATE POLICY "Users can manage their own oauth connections"
ON oauth_connections FOR ALL USING (user_id = auth.uid());
```

---

## 📋 Table: `user_revenue`

**Purpose:** Stripe subscription data. Written by `stripe-webhook.js` Netlify function. One row per user.

> ⚠️ **Never write to this table from app.html.** Only `stripe-webhook.js` should write here.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `created_at` | timestamp | NO | now() | When record created |
| `user_id` | uuid | NO | — | FK → auth.users(id), UNIQUE |
| `plan_name` | text | YES | null | Plan name (e.g. 'Pro', 'Basic') |
| `mrr` | numeric | YES | null | Monthly recurring revenue ($) |
| `status` | text | YES | null | Subscription status (active/cancelled/past_due) |
| `beta_user` | boolean | YES | true | Is user in beta period? |
| `stripe_customer_id` | text | YES | null | Stripe customer ID |
| `stripe_subscription_id` | text | YES | null | Stripe subscription ID |

### Access
- `app.html` reads this via `getSubscriptionStatus()` — checks `status` and `beta_user`
- Admin dashboard reads `plan_name, mrr, status` for revenue reporting
- Beta period ends April 1, 2026

---

## 📋 Table: `api_usage`

**Purpose:** Track every AI API call for cost and profitability analysis.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `created_at` | timestamp | NO | now() | When call was made |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `project_id` | uuid | YES | null | FK → projects(id) |
| `api_provider` | text | NO | — | anthropic / openai |
| `model` | text | NO | — | Model name (e.g. 'claude-3-5-haiku') |
| `operation` | text | NO | — | extraction / risk_detection / ai_advisor |
| `input_tokens` | integer | YES | null | Input token count |
| `output_tokens` | integer | YES | null | Output token count |
| `total_tokens` | integer | YES | null | Total tokens |
| `cost_usd` | numeric | YES | null | Estimated cost in USD |
| `success` | boolean | NO | true | Did call succeed? |
| `error_message` | text | YES | null | Error if failed |
| `latency_ms` | integer | YES | null | Response time in ms |

---

## 📋 Table: `beta_feedback`

**Purpose:** In-app feedback submitted by users via the Feedback tab.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `created_at` | timestamp | NO | now() | When submitted |
| `user_id` | uuid | NO | — | FK → auth.users(id) |
| `user_email` | text | YES | null | User's email |
| `user_company` | text | YES | null | User's company name |
| `feedback_type` | text | NO | — | bug / feature / ux / general |
| `title` | text | NO | — | Short summary |
| `description` | text | NO | — | Full description |
| `ease_of_use` | integer | YES | null | Ease rating 1-5 |
| `accuracy_rating` | integer | YES | null | Accuracy rating 1-5 |
| `would_recommend` | boolean | YES | null | NPS proxy |
| `page_location` | text | YES | null | URL hash when submitted |
| `user_agent` | text | YES | null | Browser info |
| `screen_resolution` | text | YES | null | Display resolution |

---

## 📋 Table: `admin_events`

**Purpose:** Behavioral event log for admin analytics. Fire-and-forget — failures are swallowed silently.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `created_at` | timestamp | NO | now() | When event occurred |
| `event_type` | text | NO | — | Event name (see values below) |
| `user_id` | uuid | YES | null | Which user (null for system events) |
| `event_data` | jsonb | YES | {} | Freeform event payload |

**Known `event_type` values:**
- `first_bid` — User analyzed their first bid
- `outcome_recorded` — User recorded a win/loss/ghost outcome
- (others may exist — this table is append-only, no migration needed for new events)

---

## 📋 Table: `admin_metrics_snapshots`

**Purpose:** Daily rollup of key metrics written by the `daily-snapshot.js` Netlify scheduled function.

### Columns
(Exact columns depend on daily-snapshot.js — read that file for source of truth)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `snapshot_date` | date | Date of snapshot (unique) |
| `total_users` | integer | All-time user count |
| `active_users_7d` | integer | Users with activity in last 7 days |
| `total_projects` | integer | Total bids analyzed |
| `total_revenue` | numeric | Sum of active MRR |
| (additional metrics) | — | See daily-snapshot.js |

---

## 🗺️ Database Relationships

```
auth.users (Supabase Auth — managed externally)
    ├── user_settings (1:1) — profile & preferences
    ├── user_keywords (1:1) — good/bad keyword arrays
    ├── clients (1:many) — all client types
    ├── projects (1:many) — analyzed bids
    │   └── gc_competition_density (1:many) — competition data per outcome
    ├── user_revenue (1:1) — Stripe subscription data
    ├── api_usage (1:many) — per-call cost tracking
    ├── beta_feedback (1:many) — user-submitted feedback
    └── admin_events (1:many) — behavioral event log
```

---

## 🔍 Useful Queries

### Verify actual columns in Supabase (run in SQL Editor):
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_settings'  -- change table name as needed
ORDER BY ordinal_position;
```

### Get all table names:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Admin: Cost by provider this month
```sql
SELECT api_provider, model, COUNT(*) as calls,
       SUM(total_tokens) as tokens, SUM(cost_usd) as total_cost
FROM api_usage
WHERE created_at >= date_trunc('month', now())
GROUP BY api_provider, model
ORDER BY total_cost DESC;
```

### Admin: Revenue vs cost
```sql
SELECT
  (SELECT COALESCE(SUM(mrr), 0) FROM user_revenue WHERE status = 'active') as monthly_revenue,
  (SELECT COALESCE(SUM(cost_usd), 0) FROM api_usage
   WHERE created_at >= date_trunc('month', now())) as api_costs_this_month;
```

---

## ⚠️ Known Gotchas

1. **`clients` not `general_contractors`** — Table was renamed. `getGCs()` is a legacy wrapper.
2. **`user_keywords` is single-row** — Do NOT insert multiple rows. Use upsert with `onConflict: 'user_id'`.
3. **`outcome_data` is jsonb** — Old code may reference individual columns (`outcome_amount`, `outcome_margin`). All outcome data now lives in `outcome_data` jsonb.
4. **`search_radius` not `service_area_preferred`** — Old column name no longer used.
5. **`preferred_csi_sections` drives section scoring** — When populated, overrides `trades` for scoring mode.
6. **`lat`/`lng` may be empty** — Geolocation is resolved at query time using city/state, not stored lat/lng.
7. **`full_text` can be large** — Store for re-analysis but exclude from list queries.
8. **`admin_events` failures are swallowed** — This is intentional. Don't add critical logic here.

---

## 📝 Schema Version History

| Date | Version | Changes |
|------|---------|---------|
| Feb 3, 2026 | 1.0 | Initial schema (5 tables) |
| Feb 7, 2026 | 1.1 | Added outcome fields to projects |
| Feb 9, 2026 | 1.2 | Added street/zip to user_settings, fixed decision_time type |
| Feb 27, 2026 | 1.3 | Added bid_divisions_submitted to projects; added gc_competition_density table |
| Mar 5, 2026 | 2.0 | Full audit and rewrite. Corrected: general_contractors→clients, keywords→user_keywords, added 5 missing tables (user_revenue, api_usage, beta_feedback, admin_events, admin_metrics_snapshots), updated user_settings to 30 columns, updated projects to 24 columns |
| Mar 11, 2026 | 2.1 | Added plan_rooms text[] to user_settings. Added oauth_connections table for 3rd-party OAuth tokens (BC). |
| Apr 10, 2026 | 2.2 | Added outcome_nudge_count (int, default 0) + last_nudge_sent_at (timestamptz) to projects. Added outcome_reminder_days (int, default 21) to user_settings. (migration 009_outcome_nudge.sql) |

---

**Maintained by:** Claude Code
**Source of truth:** Live code audit of app.html + netlify/functions/
