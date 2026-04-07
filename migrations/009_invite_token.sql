BEGIN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS org_members_invite_token_idx ON org_members(invite_token);
COMMIT;
