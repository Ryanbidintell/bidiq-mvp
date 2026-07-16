-- ============================================================================
-- BidIntell Capacity Module — operational schema (MVP)
-- ============================================================================
-- Subcontractor-first capacity planning: convert awarded backlog + weighted
-- pipeline into weekly, role-based labor demand vs supply, and recommend
-- hire / hold / overtime / outside-labor / pass.
--
-- Design notes
--   * All tables are per-user (RLS: auth.uid() = user_id), matching the rest
--     of the app (see 001_initial_schema.sql).
--   * Grain is preserved for future benchmarking: weekly + role on the forecast
--     fact, canonical trade/archetype/role/metro carried as text columns so a
--     later normalization pass can lift them into dimensions without a rebuild
--     (see bidintell-capacity-data-architecture-spec.md, Phase 3).
--   * Idempotent house style: CREATE TABLE IF NOT EXISTS, policies guarded by
--     DO $$ ... IF NOT EXISTS $$. Safe to re-run.
--
-- APPLY via Supabase MCP apply_migration or the SQL Editor. DO NOT `db push`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: create the standard 4-policy owner RLS set for a cap_ table
-- ----------------------------------------------------------------------------
-- (Inlined per-table below rather than a function, to match existing style.)

-- ============================================================================
-- 1. cap_settings — one row per user: company assumptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_settings (
    user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name            TEXT,
    trades                  TEXT[] DEFAULT ARRAY['flooring','painting'],
    home_metro              TEXT,
    planning_horizon_weeks  INTEGER NOT NULL DEFAULT 180 CHECK (planning_horizon_weeks > 0),
    hours_per_fte_week      NUMERIC NOT NULL DEFAULT 40 CHECK (hours_per_fte_week > 0),
    hiring_lead_time_weeks  INTEGER NOT NULL DEFAULT 6 CHECK (hiring_lead_time_weeks >= 0),
    attrition_pct_annual    NUMERIC NOT NULL DEFAULT 0 CHECK (attrition_pct_annual >= 0),
    overtime_max_pct        NUMERIC NOT NULL DEFAULT 0.15 CHECK (overtime_max_pct >= 0),
    outside_labor_enabled   BOOLEAN NOT NULL DEFAULT true,
    outside_labor_fte       NUMERIC NOT NULL DEFAULT 0 CHECK (outside_labor_fte >= 0),
    utilization_target      NUMERIC NOT NULL DEFAULT 0.90 CHECK (utilization_target > 0),
    -- confidence bands: score below invite_max = invite-only, below partial_max = partial, else full
    conf_invite_max         NUMERIC NOT NULL DEFAULT 0.40,
    conf_partial_max        NUMERIC NOT NULL DEFAULT 0.70,
    conf_weight_invite      NUMERIC NOT NULL DEFAULT 0.50,
    conf_weight_partial     NUMERIC NOT NULL DEFAULT 0.80,
    conf_weight_full        NUMERIC NOT NULL DEFAULT 1.00,
    extra                   JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cap_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_settings' AND policyname='cap_settings owner select') THEN
        CREATE POLICY "cap_settings owner select" ON cap_settings FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_settings' AND policyname='cap_settings owner insert') THEN
        CREATE POLICY "cap_settings owner insert" ON cap_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_settings' AND policyname='cap_settings owner update') THEN
        CREATE POLICY "cap_settings owner update" ON cap_settings FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_settings' AND policyname='cap_settings owner delete') THEN
        CREATE POLICY "cap_settings owner delete" ON cap_settings FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 2. cap_people — roster / supply
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_people (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_ref    TEXT,                       -- customer's own id, optional
    name            TEXT NOT NULL,
    role_canonical  TEXT NOT NULL,              -- installer | painter | foreman | pm | detailer ...
    role_raw        TEXT,                       -- title as the customer typed it
    trade           TEXT NOT NULL,
    labor_type      TEXT NOT NULL DEFAULT 'direct' CHECK (labor_type IN ('direct','indirect')),
    office_or_region TEXT,
    metro           TEXT,
    employment_type TEXT NOT NULL DEFAULT 'employee' CHECK (employment_type IN ('employee','temp','subcontract')),
    hours_per_week  NUMERIC NOT NULL DEFAULT 40 CHECK (hours_per_week >= 0),
    available_from  DATE,
    available_to    DATE,
    active_flag     BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_people_user_idx ON cap_people(user_id);
ALTER TABLE cap_people ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_people' AND policyname='cap_people owner all') THEN
        CREATE POLICY "cap_people owner all" ON cap_people FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 3. cap_templates — labor templates (versioned)
-- ============================================================================
-- curves: jsonb of { "<role_canonical>": [w1, w2, ...] } where each value is
-- headcount (FTE) for that role in that week of the project (length = duration_weeks).
-- direct_curves and indirect_curves are kept separate per the PRD.
CREATE TABLE IF NOT EXISTS cap_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    trade           TEXT NOT NULL,
    archetype       TEXT NOT NULL,               -- e.g. "commercial_ti", "new_multifamily"
    building_type   TEXT,
    duration_weeks  INTEGER NOT NULL CHECK (duration_weeks > 0),
    direct_curves   JSONB NOT NULL DEFAULT '{}'::jsonb,
    indirect_curves JSONB NOT NULL DEFAULT '{}'::jsonb,
    version_number  INTEGER NOT NULL DEFAULT 1,
    source_type     TEXT NOT NULL DEFAULT 'customer' CHECK (source_type IN ('system','customer')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_templates_user_idx ON cap_templates(user_id);
ALTER TABLE cap_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_templates' AND policyname='cap_templates owner all') THEN
        CREATE POLICY "cap_templates owner all" ON cap_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 4. cap_projects — awarded / active backlog
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_projects (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_ref             TEXT,
    project_name            TEXT NOT NULL,
    customer_name           TEXT,
    gc_name                 TEXT,
    trade                   TEXT NOT NULL,
    archetype               TEXT,
    metro                   TEXT,
    template_id             UUID REFERENCES cap_templates(id) ON DELETE SET NULL,
    contract_value          NUMERIC,
    expected_start_date     DATE NOT NULL,
    expected_end_date       DATE,
    manual_peak_adjustment  NUMERIC NOT NULL DEFAULT 1.0 CHECK (manual_peak_adjustment > 0),
    status                  TEXT NOT NULL DEFAULT 'awarded' CHECK (status IN ('awarded','active','complete')),
    actual_start_date       DATE,
    actual_end_date         DATE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_projects_user_idx ON cap_projects(user_id);
ALTER TABLE cap_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_projects' AND policyname='cap_projects owner all') THEN
        CREATE POLICY "cap_projects owner all" ON cap_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 5. cap_opportunities — weighted pipeline / pursuits
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_opportunities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_ref         TEXT,
    project_name            TEXT NOT NULL,
    source_channel          TEXT,                -- email | bc | manual ...
    gc_name                 TEXT,
    trade                   TEXT NOT NULL,
    archetype               TEXT,
    metro                   TEXT,
    template_id             UUID REFERENCES cap_templates(id) ON DELETE SET NULL,
    bid_due_date            DATE,
    expected_award_date     DATE,
    expected_start_date     DATE NOT NULL,
    duration_weeks          INTEGER CHECK (duration_weeks > 0),
    probability_of_award    NUMERIC NOT NULL DEFAULT 0.5 CHECK (probability_of_award >= 0 AND probability_of_award <= 1),
    bidintell_score         NUMERIC,
    confidence_score        NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    include_flag            BOOLEAN NOT NULL DEFAULT true,
    pipeline_stage          TEXT,
    linked_bidintell_project_id UUID,            -- optional link to projects table in the core app
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_opportunities_user_idx ON cap_opportunities(user_id);
ALTER TABLE cap_opportunities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_opportunities' AND policyname='cap_opportunities owner all') THEN
        CREATE POLICY "cap_opportunities owner all" ON cap_opportunities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 6. cap_forecast_runs — one row per forecast execution (grain preserved)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_forecast_runs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_id             UUID,                -- null = base forecast
    run_timestamp           TIMESTAMPTZ DEFAULT NOW(),
    horizon_weeks           INTEGER NOT NULL,
    assumptions             JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- output_summary: role gap summary, peaks, weeks-short, total adjusted demand, etc.
    output_summary          JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- role_week: optional full weekly demand/supply grid (index-ready fact); may be large
    role_week               JSONB,
    model_type              TEXT NOT NULL DEFAULT 'rules_based',
    triggered_by            TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_forecast_runs_user_idx ON cap_forecast_runs(user_id, run_timestamp DESC);
ALTER TABLE cap_forecast_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_forecast_runs' AND policyname='cap_forecast_runs owner all') THEN
        CREATE POLICY "cap_forecast_runs owner all" ON cap_forecast_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 7. cap_scenarios — saved what-if scenarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_scenarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    -- definition: list of overrides (project date shifts, award toggles, prob changes,
    -- staffing adds, assumption overrides) applied on top of the base data set.
    definition      JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_result     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_scenarios_user_idx ON cap_scenarios(user_id);
ALTER TABLE cap_scenarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_scenarios' AND policyname='cap_scenarios owner all') THEN
        CREATE POLICY "cap_scenarios owner all" ON cap_scenarios FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 8. cap_staffing_actions — recommendation / decision queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_staffing_actions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    forecast_run_id     UUID REFERENCES cap_forecast_runs(id) ON DELETE SET NULL,
    action_type         TEXT NOT NULL CHECK (action_type IN ('hire','hold','overtime','outside_labor','pass','escalate')),
    role_canonical      TEXT,
    trade               TEXT,
    metro               TEXT,
    quantity            NUMERIC,
    effective_start_date DATE,
    effective_end_date  DATE,
    urgency_score       NUMERIC,
    confidence_label    TEXT,
    rationale           TEXT,
    driver_projects     JSONB DEFAULT '[]'::jsonb,
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','dismissed','done')),
    user_response       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS cap_staffing_actions_user_idx ON cap_staffing_actions(user_id, status);
ALTER TABLE cap_staffing_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_staffing_actions' AND policyname='cap_staffing_actions owner all') THEN
        CREATE POLICY "cap_staffing_actions owner all" ON cap_staffing_actions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 9. cap_actuals — actual labor by role/week/project (Phase 2 template learning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_actuals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES cap_projects(id) ON DELETE CASCADE,
    role_canonical  TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    actual_fte      NUMERIC,
    actual_hours    NUMERIC,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cap_actuals_user_idx ON cap_actuals(user_id);
ALTER TABLE cap_actuals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_actuals' AND policyname='cap_actuals owner all') THEN
        CREATE POLICY "cap_actuals owner all" ON cap_actuals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 10. cap_events — structured event log (envelope per data-arch spec)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cap_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_name          TEXT NOT NULL,           -- e.g. forecast.run_completed, opportunity.imported
    occurred_at         TIMESTAMPTZ DEFAULT NOW(),
    source_object_type  TEXT,
    source_object_id    TEXT,
    metro               TEXT,
    trade               TEXT,
    payload             JSONB DEFAULT '{}'::jsonb,
    schema_version      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS cap_events_user_idx ON cap_events(user_id, occurred_at DESC);
ALTER TABLE cap_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cap_events' AND policyname='cap_events owner all') THEN
        CREATE POLICY "cap_events owner all" ON cap_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 11. Margin-coverage layer — cost structure + gross-margin inputs
-- ============================================================================
-- Turns the FTE forecast into an affordability model: does awarded + weighted
-- gross margin cover the (mostly fixed) monthly labor carry? Three-tier cost:
-- variable field labor / semi-fixed ops (PM, foreman) / fixed support+overhead.
ALTER TABLE cap_settings  ADD COLUMN IF NOT EXISTS default_gm_pct         NUMERIC NOT NULL DEFAULT 0.28;
ALTER TABLE cap_settings  ADD COLUMN IF NOT EXISTS labor_burden_pct       NUMERIC NOT NULL DEFAULT 0.32;
ALTER TABLE cap_settings  ADD COLUMN IF NOT EXISTS monthly_fixed_overhead NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE cap_settings  ADD COLUMN IF NOT EXISTS coverage_cushion_pct   NUMERIC NOT NULL DEFAULT 0.15;

ALTER TABLE cap_people    ADD COLUMN IF NOT EXISTS wage        NUMERIC;                 -- base, pre-burden
ALTER TABLE cap_people    ADD COLUMN IF NOT EXISTS wage_basis  TEXT DEFAULT 'hourly';   -- hourly | annual
ALTER TABLE cap_people    ADD COLUMN IF NOT EXISTS cost_class  TEXT DEFAULT 'variable'; -- variable | semi_fixed | fixed

ALTER TABLE cap_projects      ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC;
ALTER TABLE cap_opportunities ADD COLUMN IF NOT EXISTS contract_value   NUMERIC;
ALTER TABLE cap_opportunities ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC;

-- ============================================================================
-- Done. 10 cap_* tables + margin layer, all RLS-protected to the owning user.
-- ============================================================================
