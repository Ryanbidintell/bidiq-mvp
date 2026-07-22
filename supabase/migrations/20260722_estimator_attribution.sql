-- Phase 1 estimator attribution (Mindy Rocha / CJI onboarding, Jul 22 2026)
-- Additive + idempotent. Lets a team track wins/losses by estimator without
-- per-user logins: a roster on user_settings + an estimator tag on each bid.
-- No destructive changes; both columns are nullable / default-empty.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS estimators TEXT[] DEFAULT '{}';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimator TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_user_estimator ON projects(user_id, estimator);
