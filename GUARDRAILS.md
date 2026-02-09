# Development Guardrails - MUST FOLLOW

## Database Changes

### ❌ NEVER DO:
- DROP TABLE
- TRUNCATE TABLE
- DELETE without WHERE clause
- ALTER TABLE DROP COLUMN (without explicit approval)
- Migrations that aren't idempotent

### ✅ ALWAYS DO:
1. **Backup first**: Always create SQL backup before schema changes
2. **Add only**: Only ADD columns, never DROP
3. **IF NOT EXISTS**: Use IF NOT EXISTS for all DDL
4. **Test in dev**: Never run migrations in production without testing
5. **Reversible**: Every migration must have a rollback script
6. **Ask first**: Get explicit approval before ANY schema change

## Code Changes

### ❌ NEVER DO:
- Remove API keys without finishing migration
- Make breaking changes close to launch
- Change working code without testing
- Push incomplete features

### ✅ ALWAYS DO:
1. **Test first**: Test changes before committing
2. **Small changes**: One thing at a time
3. **Verify**: Confirm it works before moving on
4. **Document**: Explain what changed and why

## Pre-Launch Protocol

### Before ANY change:
1. Ask: "Will this break existing functionality?"
2. Ask: "Do I have time to fully complete this?"
3. Ask: "Is there a backup/rollback plan?"
4. If NO to any: DON'T DO IT

### Critical Period Rules (T-minus launch):
- NO schema changes without backup
- NO refactoring working code
- NO "improvements" - only bug fixes
- NO security migrations unless complete in one step

## Communication

### Always:
1. **Be clear about risks**: "This could break X"
2. **Ask permission**: "Should I proceed with Y?"
3. **Admit mistakes**: "I messed up Z, here's the fix"
4. **Provide rollback**: "If this fails, run this SQL"

## Current Status: PRE-LAUNCH

**FREEZE on:**
- Database schema changes (unless critical bug)
- API key migrations (defer to post-launch)
- Major refactors
- "Nice to have" improvements

**ALLOW only:**
- Critical bug fixes
- Data loading issues
- Blocking user workflows
- Security vulnerabilities that can be fixed completely

## Checklist Before Making Changes

- [ ] Is this a critical bug or blocking issue?
- [ ] Do I have a complete solution (not partial)?
- [ ] Can I test this without affecting production data?
- [ ] Do I have a rollback plan?
- [ ] Have I gotten explicit approval?

If ALL YES → Proceed carefully
If ANY NO → STOP and ask first
