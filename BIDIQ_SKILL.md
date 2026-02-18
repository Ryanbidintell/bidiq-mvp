# BidIQ Claude Code SKILL — Safe Implement & Check Protocol
**Version:** 1.0 | **Last Updated:** February 17, 2026  
**Purpose:** Enforce read-before-write discipline in a large, fragile single-file codebase

---

## 🧠 WHAT THIS SKILL IS

This skill governs how Claude Code approaches ANY code change in the BidIQ project. The codebase is a single 11,000+ line HTML file (`app.html`) plus Netlify backend functions. Mistakes here don't just break one feature — they can silently corrupt scoring, break auth, or wipe user data.

**The rule is simple: ALWAYS read and understand before touching.**

---

## ⚡ ACTIVATION

This skill activates automatically when any of the following are present:
- A task involves modifying `app.html`, `analyze.js`, or `notify.js`
- A bug is being fixed
- A new feature is being added
- A database query or Supabase call is being written or changed
- The scoring algorithm (lines 6000–6400) is mentioned
- Geolocation, distance calculation, or geocoding is involved
- PDF extraction or OCR logic is discussed

---

## 📋 MANDATORY PRE-WORK (Do This Before Writing Any Code)

### Step 1 — Read the Reference Files
Before touching anything, read these in order:

```
1. CLAUDE.md          → Safety rules and gotchas specific to BidIQ
2. MEMORY.md          → Recent bugs, fixes, and lessons from prior sessions
3. SCHEMA.md          → Database structure (check field types before using them)
4. ARCHITECTURE.md    → Line number map of app.html sections
```

Do not skip this. Even if you think you know the codebase. Read them fresh each session.

### Step 2 — Locate Existing Code First
Before writing new code for any feature, search `app.html` for existing implementations.

Run these checks:
```bash
# Find the function or area you're about to modify
grep -n "functionName\|keyword\|feature" app.html | head -40

# Find all related functions in a section
grep -n "function.*score\|calculateScore\|BidIndex" app.html

# Check if something already handles this case
grep -n "geoloc\|latitude\|longitude\|userOffice\|geocod" app.html
```

**You must confirm: Does this already exist?** If yes, modify it — don't duplicate it.

### Step 3 — Understand Data Types Before Using Them
Check `SCHEMA.md` for the field you're working with. Common mistakes in this codebase:
- `decision_time` is INTEGER not TEXT
- JSONB fields (`extracted_data`, `scores`) need null-safe access: `field?.subfield || 'default'`
- `user_settings` has `street` and `zip` columns (added Feb 9, 2026)

---

## 🔒 BEFORE WRITING CODE — THE 5-QUESTION CHECKLIST

Answer all 5 before writing a single line:

1. **Does this already exist?** (grep for it — don't assume it doesn't)
2. **What lines will I touch?** (use ARCHITECTURE.md line map to identify exact section)
3. **What else calls this function?** (grep for the function name to find all callers)
4. **What could break?** (list 2-3 things that depend on what you're changing)
5. **Is this Phase 1 scope?** (check Product Bible — default answer is "Not yet" if unsure)

If you can't answer all 5, **stop and investigate more** before proceeding.

---

## ✍️ WHILE WRITING CODE

### Commit Before You Touch Anything
```bash
git add -A && git commit -m "Before: [describe what you're about to change]"
```
This creates a restore point. Do this EVERY time, no exceptions.

### Make Minimal Changes
- Change only what is necessary. Do not refactor adjacent code.
- Do not rename existing functions, variables, or CSS classes.
- Do not reorganize code structure "while you're in there."
- If a fix feels like it requires a large refactor, STOP and flag it.

### Match Existing Patterns
BidIQ uses specific patterns. Match them exactly:

**Error handling:**
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  showErrorBanner('User-friendly message');
  sendErrorEmail('Error Type', error.message);
  return fallbackValue;
}
```

**Null-safe JSONB access:**
```javascript
const city = project.extracted_data?.project_city || 'Unknown';
const score = project.scores?.final || 0;
```

**Supabase queries:**
```javascript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', user.id);
if (error) throw error;
```

---

## ✅ AFTER WRITING CODE — VERIFICATION PROTOCOL

Never mark a task done without completing all of these:

### Code Verification
```bash
# 1. Confirm the change exists where expected
grep -n "your new function or key string" app.html

# 2. Confirm no duplicates were created
grep -c "functionName" app.html  # should be 1 (definition) + N (calls)

# 3. Check for syntax issues (basic)
node --check app.html 2>&1 | head -20
```

### Logic Verification
- Trace the data flow from user action → function → database → UI response
- Confirm the JSONB field structure matches SCHEMA.md
- For scoring changes: manually calculate expected score and verify output matches

### Regression Check — Test These Core Flows After ANY Change
```
□ Can a user log in?
□ Can a user upload a PDF and get a score?
□ Does the dashboard load projects?
□ Does the report view display correctly?
□ Do user settings save and load?
```
If any of these fail after your change, revert immediately and investigate.

### Commit After Verification
```bash
git add -A && git commit -m "Fixed: [describe what you changed and why it works]"
```

---

## 🐛 BUG FIX PROTOCOL

When given a bug report, follow this exact sequence:

1. **Read MEMORY.md first** — this bug may have been seen before
2. **Reproduce it** — understand exactly what triggers it
3. **Find the root cause** — grep for the failing function, check its callers
4. **Check if fix creates new bugs** — list what else touches this code
5. **Apply minimal fix** — no refactoring, no "while I'm here" changes
6. **Verify the fix** — confirm the original bug is gone
7. **Update MEMORY.md** — document the bug, root cause, and fix for next session

**Do not patch symptoms. Find the root cause.**

---

## 🚫 NEVER DO THESE IN BIDIQ

These actions have caused data loss or major breakage in the past:

| ❌ Never | ✅ Instead |
|---|---|
| Modify RLS policies without testing | Read SCHEMA.md, test with a non-admin user |
| Delete or rename existing functions | Add new functions alongside, deprecate later |
| Change scoring weights without checking all 4 components | Read lines 6000–6400 fully first |
| Assume a field is a string | Check SCHEMA.md — types matter (INTEGER vs TEXT) |
| Skip the git commit before changes | Always commit before, always commit after |
| "Clean up" unrelated code during a fix | Touch only what the task requires |
| Hardcode user IDs or API keys | Use `user.id` from auth, env vars for keys |
| Add a Phase 2+ feature during a Phase 1 bug fix | Fix the bug only, log the idea separately |

---

## 📂 KNOWN PROBLEM AREAS (Check These Extra Carefully)

Based on prior sessions, these areas need extra care:

**Geolocation (lines ~9300–9500):**
- The `Could not locate your office` error is a known recurring bug
- Always verify `userSettings.office_address` is populated before geocoding
- Nominatim API has rate limits — add delays between calls
- Always provide a manual address fallback path

**Reanalysis Flow:**
- Bug exists when users reanalyze an existing bid
- Check that `saveProject` handles both INSERT and UPDATE cases
- Verify the project ID is passed correctly on reanalysis

**Contract Risk Detection:**
- Two-layer system: keyword pre-filter + semantic AI analysis
- Do not collapse these into one step — the pre-filter saves API cost
- OCR fallback (Tesseract) must be checked when PDF.js returns empty text

**PDF.js + Custom Fonts:**
- Turner, Holder, Skanska PDFs frequently fail standard extraction
- Always check if extracted text length is suspiciously short (< 500 chars)
- If short → trigger OCR fallback automatically

---

## 📝 SESSION END — UPDATE MEMORY.md

After every work session, add to `MEMORY.md`:

```markdown
## Session: [Date]
**What we worked on:** [brief description]
**What we changed:** [files and functions modified]
**What broke and how we fixed it:** [if anything]
**Known issues remaining:** [anything unresolved]
**Lessons learned:** [anything future-Claude should know]
```

This is not optional. The next session's Claude Code will read this first.

---

## 🎯 THE ONE-LINE RULE

**If you haven't read the existing code in that area, you are not ready to write.**

Read first. Always.
