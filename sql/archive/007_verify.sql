-- Verification script for migration 007_org_schema.sql
-- Run in Supabase SQL editor after migration. All queries should return rows.

-- 1. organizations table exists with expected columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 2. org_members table exists with expected columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'org_members'
ORDER BY ordinal_position;

-- 3. org_id column added to projects
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'org_id';

-- 4. org_id column added to clients
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'org_id';

-- 5. org_id column added to user_settings
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_settings' AND column_name = 'org_id';

-- 6. org_id column added to user_revenue
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_revenue' AND column_name = 'org_id';

-- 7. RLS enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('organizations', 'org_members');

-- 8. All expected RLS policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('organizations', 'org_members', 'projects', 'user_settings', 'clients')
ORDER BY tablename, policyname;

-- 9. Existing users unaffected — spot check org_id is null for all existing projects
SELECT COUNT(*) AS total_projects,
       COUNT(org_id) AS projects_with_org_id
FROM projects;
-- Expected: projects_with_org_id = 0
