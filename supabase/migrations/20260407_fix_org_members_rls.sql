-- Migration 008: Fix infinite recursion in org_members RLS policies
-- Problem: The SELECT policy on org_members queries org_members itself → infinite loop.
--          Policies on user_settings/projects/clients also reference org_members,
--          triggering the same recursion and breaking getSettings() for ALL users.
-- Fix: SECURITY DEFINER functions bypass RLS when querying org_members, breaking the loop.

BEGIN;

-- ============================================================
-- 1. SECURITY DEFINER helpers (run as function owner, bypass RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION get_my_owned_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true;
$$;

-- ============================================================
-- 2. Fix org_members policies (self-referential → use helper)
-- ============================================================

DROP POLICY IF EXISTS "Org members can read org membership" ON org_members;
CREATE POLICY "Org members can read org membership"
ON org_members FOR SELECT
USING (org_id IN (SELECT get_my_org_ids()));

DROP POLICY IF EXISTS "Org owner can insert members" ON org_members;
CREATE POLICY "Org owner can insert members"
ON org_members FOR INSERT
WITH CHECK (org_id IN (SELECT get_my_owned_org_ids()));

DROP POLICY IF EXISTS "Org owner can update members" ON org_members;
CREATE POLICY "Org owner can update members"
ON org_members FOR UPDATE
USING (org_id IN (SELECT get_my_owned_org_ids()));

-- ============================================================
-- 3. Fix organizations SELECT policy (referenced org_members directly)
-- ============================================================

DROP POLICY IF EXISTS "Org members can read their organization" ON organizations;
CREATE POLICY "Org members can read their organization"
ON organizations FOR SELECT
USING (
    owner_user_id = auth.uid()
    OR id IN (SELECT get_my_org_ids())
);

-- ============================================================
-- 4. Fix cross-table policies that referenced org_members directly
--    These were causing getSettings() / project loads to blow up for solo users
-- ============================================================

DROP POLICY IF EXISTS "Org owners can read all org user_settings" ON user_settings;
CREATE POLICY "Org owners can read all org user_settings"
ON user_settings FOR SELECT
USING (org_id IN (SELECT get_my_owned_org_ids()));

DROP POLICY IF EXISTS "Org owners can read all org projects" ON projects;
CREATE POLICY "Org owners can read all org projects"
ON projects FOR SELECT
USING (org_id IN (SELECT get_my_owned_org_ids()));

DROP POLICY IF EXISTS "Org owners can read all org clients" ON clients;
CREATE POLICY "Org owners can read all org clients"
ON clients FOR SELECT
USING (org_id IN (SELECT get_my_owned_org_ids()));

COMMIT;
