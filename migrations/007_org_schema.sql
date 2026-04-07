-- Migration 007: Company Accounts & Team Plan — Org Schema
-- Spec: BidIntell_TeamPlan_Spec.txt
-- Safety: Wrapped in transaction. Additive only. No existing data touched.
-- Existing solo users: org_id = null everywhere — behavior unchanged.

BEGIN;

-- ============================================================
-- 1. CREATE organizations TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at              timestamp   NOT NULL DEFAULT now(),
    name                    text        NOT NULL,
    slug                    text        NOT NULL UNIQUE,
    plan_tier               text        NOT NULL DEFAULT 'solo',   -- solo / team / company / enterprise
    seat_limit              integer     NOT NULL DEFAULT 1,         -- 1 / 3 / 8 / 9999
    owner_user_id           uuid        NOT NULL REFERENCES auth.users(id),
    stripe_customer_id      text,
    stripe_subscription_id  text,
    subscription_status     text,                                   -- active / trialing / past_due / cancelled
    mrr                     numeric,
    trial_ends_at           timestamp,
    is_founding_member      boolean     NOT NULL DEFAULT false
);

-- RLS enabled now; policies that reference org_members added after org_members is created
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Only owner can update (no org_members dependency)
CREATE POLICY "Org owner can update their organization"
ON organizations FOR UPDATE
USING (owner_user_id = auth.uid());

-- Owner can insert (no org_members dependency)
CREATE POLICY "Org owner can insert"
ON organizations FOR INSERT
WITH CHECK (owner_user_id = auth.uid());


-- ============================================================
-- 2. CREATE org_members TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS org_members (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at          timestamp   NOT NULL DEFAULT now(),
    org_id              uuid        NOT NULL REFERENCES organizations(id),
    user_id             uuid        REFERENCES auth.users(id),
    role                text        NOT NULL DEFAULT 'estimator',   -- owner / estimator
    invited_by          uuid        REFERENCES auth.users(id),
    invite_email        text,
    invite_accepted_at  timestamp,
    display_name        text,
    is_active           boolean     NOT NULL DEFAULT true,
    UNIQUE (org_id, user_id)
);

-- RLS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Members can read all members of their own org
CREATE POLICY "Org members can read org membership"
ON org_members FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM org_members om2
        WHERE om2.user_id = auth.uid()
    )
);

-- Owner can insert (invite) new members
CREATE POLICY "Org owner can insert members"
ON org_members FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM org_members om2
        WHERE om2.user_id = auth.uid()
        AND om2.role = 'owner'
    )
);

-- Owner can update members (deactivate, etc.)
CREATE POLICY "Org owner can update members"
ON org_members FOR UPDATE
USING (
    org_id IN (
        SELECT org_id FROM org_members om2
        WHERE om2.user_id = auth.uid()
        AND om2.role = 'owner'
    )
);

-- Users can update their own membership row (accept invite)
CREATE POLICY "Users can update their own membership"
ON org_members FOR UPDATE
USING (user_id = auth.uid());

-- organizations: members can read their org (added here because org_members now exists)
CREATE POLICY "Org members can read their organization"
ON organizations FOR SELECT
USING (
    id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
    )
);


-- ============================================================
-- 3. ADD org_id (nullable) TO EXISTING TABLES
--    Existing rows get org_id = null — no behavior change
-- ============================================================
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE user_revenue
    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);


-- ============================================================
-- 4. NEW RLS POLICIES — owner reads all org rows
--    NEVER drops existing policies — adds alongside them
-- ============================================================

-- projects: org owner can read all projects in their org
CREATE POLICY "Org owners can read all org projects"
ON projects FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    )
);

-- user_settings: org owner can read all member settings in their org
CREATE POLICY "Org owners can read all org user_settings"
ON user_settings FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    )
);

-- clients: org owner can read all clients in their org
CREATE POLICY "Org owners can read all org clients"
ON clients FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    )
);

COMMIT;
