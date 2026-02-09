# 🤖 Claude Code Instructions for BidIQ Project

**Last Updated:** February 7, 2026

This file contains mandatory rules Claude Code must follow when working on this project.

---

## 🚨 CRITICAL RULES - NEVER BREAK THESE

### 1. DATA SAFETY IS PARAMOUNT

**BEFORE making ANY changes:**
```bash
git add -A
git commit -m "Before [change description]"
```

**NEVER:**
- ❌ Make code changes without git commit first
- ❌ Delete data from database
- ❌ Run untested migrations on production
- ❌ Modify database schema without user approval
- ❌ Use `DELETE FROM` or `TRUNCATE` statements
- ❌ Assume data is backed up

**ALWAYS:**
- ✅ Use soft deletes (UPDATE with deleted_at timestamp)
- ✅ Test on development environment first
- ✅ Ask before running ANY database operations
- ✅ Verify user wants changes before applying them

---

### 2. GIT WORKFLOW

**Every coding session:**
1. Check git status first: `git status`
2. Commit before ANY changes: `git add -A && git commit -m "Clear message"`
3. Commit after fixes: `git add -A && git commit -m "Fixed: [what was fixed]"`

**Never:**
- ❌ Leave uncommitted changes
- ❌ Force push without user permission
- ❌ Delete branches without confirmation

---

### 3. DATABASE OPERATIONS

**ALWAYS ask user before:**
- Running migrations
- Modifying table schemas
- Deleting any data
- Changing RLS policies
- Creating/dropping tables

**When user asks to "fix database":**
1. First: Ask what specific issue they're seeing
2. Then: Read existing schema files
3. Then: Propose changes and get approval
4. Finally: Generate migration, don't run it automatically

---

### 4. TESTING BEFORE DEPLOYMENT

**Never deploy without:**
- ✅ Testing locally first
- ✅ User confirms it works
- ✅ Git commit saved
- ✅ No console errors

**If user says "it was working yesterday":**
- 🚨 STOP immediately
- 🚨 Check what we changed today
- 🚨 Offer to revert: `git revert HEAD`
- 🚨 Don't make more changes until root cause found

---

### 5. DEBUGGING PROTOCOL

**When user reports a bug:**

1. **Ask for specifics:**
   - What exactly is broken?
   - What error message? (exact text)
   - What were they doing when it broke?
   - Did it work before? When?

2. **Gather evidence:**
   - Check browser console (F12)
   - Check file structure
   - Check recent git commits
   - Read relevant code sections

3. **Fix ONE thing at a time:**
   - Identify root cause
   - Fix that specific issue
   - Test the fix
   - Commit
   - THEN move to next issue

**Don't:**
- ❌ Try to "fix everything" at once
- ❌ Make changes to unrelated code
- ❌ Refactor while debugging
- ❌ Assume what's broken without checking

---

## 📁 PROJECT STRUCTURE

### Important Files:
- `app.html` - Main application (11K lines, handle with care)
- `BidIntell_Product_Bible_v1_8.md` - Product roadmap and requirements
- `DATA_SAFETY_PROTOCOL.md` - Data handling rules
- `KNOWN_BUGS.md` - Active bug list
- `MEMORY.md` - Session memory (auto-loads)
- `restore-test-data.sql` - Test data restore script

### Don't Touch:
- `OLD/` folder - Archive only, don't modify
- PDF files in `report printouts to review/` - Reference only
- `.git/` - Git internals

### Backend:
- `netlify/functions/analyze.js` - AI API calls (Claude/OpenAI)
- `netlify/functions/notify.js` - Email notifications

---

## 🎯 PROJECT GOALS

### Current Phase: 1.5 (Beta Testing & Refinement)

**Priority Order:**
1. **Data safety** - Never lose data again
2. **Bug fixes** - Fix what's broken
3. **User validation** - Does it work for real users?
4. **Feature development** - Only after above are solid

**Not priorities right now:**
- ❌ Infrastructure optimization
- ❌ Perfect code architecture
- ❌ SEO/marketing features
- ❌ New features (unless critical)

---

## 🔧 COMMON TASKS

### User Says: "Fix the app"

**Response:**
1. Ask: "What specifically is broken?"
2. Get exact error message
3. Check console for errors
4. Fix that ONE thing
5. Test
6. Commit

### User Says: "Add a feature"

**Response:**
1. Check Product Bible - is it in the roadmap?
2. Check current phase - is it Phase 1.5 priority?
3. If yes: Plan approach, get approval, implement
4. If no: Note it for later phase

### User Says: "The database is broken"

**Response:**
1. **STOP** - Don't modify database
2. Ask: What's the symptom? (data not loading? error message?)
3. Check Supabase dashboard - does data exist?
4. Check RLS policies - are they blocking access?
5. Propose solution, get approval
6. Test on dev environment first

### User Says: "Deploy to production"

**Response:**
1. Check git status - any uncommitted changes?
2. Verify Netlify env vars are set
3. Check for console errors locally
4. Ask: "Ready to deploy?" (get confirmation)
5. Guide deployment, don't auto-deploy

---

## 🛡️ SAFETY CHECKS

### Before Editing Files:

**Check:**
- [ ] Is this file read recently? (use Read tool first)
- [ ] Do I understand what this code does?
- [ ] Is there a backup? (git status)
- [ ] Will this break existing functionality?

### Before Database Operations:

**Check:**
- [ ] Did user explicitly request this?
- [ ] Is there a backup?
- [ ] Am I on dev or production?
- [ ] Are RLS policies correct?
- [ ] Will this delete data? (if yes, STOP)

### Before Committing:

**Check:**
- [ ] Clear commit message
- [ ] Only committing intended changes
- [ ] No sensitive data in commit (API keys, passwords)

---

## 📖 CODING STANDARDS

### When Fixing Bugs:

**Do:**
- ✅ Read existing code first
- ✅ Understand the pattern
- ✅ Make minimal changes
- ✅ Test the fix
- ✅ Document what was fixed (in commit message)

**Don't:**
- ❌ Rewrite entire functions unnecessarily
- ❌ Change variable names for style
- ❌ Add features while fixing bugs
- ❌ Refactor unrelated code

### When Adding Features:

**Do:**
- ✅ Check Product Bible for requirements
- ✅ Follow existing patterns in codebase
- ✅ Keep it simple (KISS principle)
- ✅ Add to relevant section (don't scatter)

**Don't:**
- ❌ Over-engineer
- ❌ Add dependencies without asking
- ❌ Create abstractions prematurely
- ❌ Break existing features

---

## 🚫 ABSOLUTE PROHIBITIONS

**NEVER do these without explicit user permission:**

1. **Delete data** - ANY delete operation on database
2. **Force operations** - `git push --force`, `rm -rf`, etc.
3. **Schema changes** - DROP, ALTER TABLE, etc.
4. **Dependency changes** - npm install/uninstall
5. **Environment changes** - Modify .env, Netlify settings
6. **Deployment** - Deploy to production
7. **External API calls** - Call external services (other than reading docs)

---

## ✅ GOOD PRACTICES

### Communication:

**Do:**
- ✅ Be clear about what you're changing
- ✅ Explain why (not just what)
- ✅ Ask before destructive operations
- ✅ Admit when you don't know
- ✅ Say "this needs testing" when uncertain

**Don't:**
- ❌ Claim things work without testing
- ❌ Over-promise
- ❌ Hide problems
- ❌ Assume user wants changes

### Code Changes:

**Do:**
- ✅ Read before writing
- ✅ Edit existing files (don't create new unless needed)
- ✅ Follow existing patterns
- ✅ Keep changes focused
- ✅ Test critical paths

**Don't:**
- ❌ Create files unnecessarily
- ❌ Duplicate code
- ❌ Mix concerns (bug fix + feature + refactor)
- ❌ Change working code "for improvement"

---

## 📚 KEY DOCUMENTS TO REFERENCE

**Before making decisions:**
1. Check `BidIntell_Product_Bible_v1_8.md` - Is this in scope?
2. Check `DATA_SAFETY_PROTOCOL.md` - Does this affect data?
3. Check `KNOWN_BUGS.md` - Is this already tracked?
4. Check `MEMORY.md` - Any recent context?

**When user is frustrated:**
1. Check `MEMORY.md` - What happened recently?
2. Check git log - What changed today?
3. Offer to revert if needed
4. Focus on ONE issue at a time

---

## 🎯 SESSION GUIDELINES

### At Start of Session:

1. Read MEMORY.md (auto-loads)
2. Check git status
3. Ask: "What would you like to work on?"
4. Confirm understanding before starting

### During Session:

1. Commit before major changes
2. Fix one thing at a time
3. Test as you go
4. Keep user informed

### At End of Session:

1. Commit final state
2. Update KNOWN_BUGS.md if needed
3. Update MEMORY.md for next session
4. Summarize what was accomplished

---

## 🤔 DECISION FRAMEWORK

**When unsure, ask:**
1. "Does this affect data?" → YES = Extra caution
2. "Can this be reverted?" → NO = Get approval first
3. "Is this urgent?" → NO = Plan before coding
4. "Could this break something?" → MAYBE = Test first

**Default to:**
- ✅ Asking questions
- ✅ Reading existing code
- ✅ Making small changes
- ✅ Testing before committing

**Not:**
- ❌ Assuming what user wants
- ❌ Making big changes without approval
- ❌ "Fixing" things that aren't broken
- ❌ Working on multiple issues simultaneously

---

## 🔥 EMERGENCY PROCEDURES

### If Data Loss Detected:

1. **STOP ALL OPERATIONS**
2. Check Supabase dashboard - is data actually gone?
3. Check git history - can we revert?
4. Check for backups - restore-test-data.sql exists
5. Document what was lost in MEMORY.md
6. Help user restore from available backups

### If App is Broken:

1. Check what changed recently: `git log --oneline -5`
2. Check console for errors (ask user)
3. Offer to revert: `git revert HEAD`
4. If reverted, test works again
5. Then fix properly on separate branch

### If User is Frustrated:

1. Acknowledge their frustration
2. Take responsibility if deserved
3. Focus on fixing ONE specific thing
4. Don't try to "fix everything"
5. Offer to take a break if needed

---

## 💡 REMEMBER

**This project has:**
- Real user data (treat carefully)
- A paying user (respect their time)
- Production environment (test before deploy)
- Git safety net (use it)

**The goal is:**
- Help user build a successful product
- Move fast but don't break things
- Learn from mistakes (data loss on Feb 7)
- Build trust through reliability

**When in doubt:**
- Ask the user
- Check the Product Bible
- Read existing code
- Make small changes
- Test everything

---

**These rules exist because data was lost on Feb 7, 2026.**

**Never again.**
