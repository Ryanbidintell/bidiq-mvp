-- Migration 012: Admin RLS bypass for user_settings and projects
-- Allows admin.html (anon key) to read all user rows for founder metrics
-- Pattern mirrors migrations/006_fix_admin_rls_syntax.sql

-- user_settings: let admin read all rows
CREATE POLICY "Admin users can read all user_settings"
ON user_settings FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- projects: let admin read all rows
CREATE POLICY "Admin users can read all projects"
ON projects FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- clients: let admin read all rows (needed for platform-wide client stats)
CREATE POLICY "Admin users can read all clients"
ON clients FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('ryan@fsikc.com', 'ryan@bidintell.ai')
    )
);

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_settings', 'projects', 'clients')
  AND policyname LIKE 'Admin%'
ORDER BY tablename;
