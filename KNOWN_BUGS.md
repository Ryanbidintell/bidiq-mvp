# Known Bugs & Fixes

**Last Updated:** February 7, 2026, 8:45 PM

---

## ✅ FIXED - GCs Not Prepopulating

### Bug Description
- **Issue:** New users see empty GC selector when analyzing bids
- **Root Cause:** GCs are user-specific, no prepopulated master list
- **User Impact:** Can't select GCs during first bid analysis

### Fix Applied
**Auto-Add Extracted GCs** (Line ~5316 & ~5625 in app.html)

1. Created `autoAddExtractedGCs()` helper function
2. Automatically adds GC names extracted from bid documents
3. Uses default 3-star rating for new GCs
4. Runs after AI extraction completes

**How it works now:**
1. User uploads PDF bid document
2. AI extracts GC name(s) (e.g., "Turner Construction")
3. **NEW:** GCs are auto-added to user's database
4. Future bids will show these GCs in the selector
5. User can also manually add GCs using "Add New" button

### Manual Workaround (still available)
1. Type GC name in search box
2. Click "+ Add New" button
3. Rate the GC (1-5 stars)
4. GC is added and available for selection

### Testing Needed
- [ ] Upload bid with GC name
- [ ] Verify GC auto-adds to database
- [ ] Upload second bid
- [ ] Confirm GC appears in selector

---

## 🔍 OTHER POTENTIAL BUGS (To Investigate)

### P0 - Critical (Blocks Usage)
- [ ] None currently known

### P1 - High (Hurts Accuracy)
- [ ] BidIndex scores - need real-world validation
- [ ] Trade detection accuracy
- [ ] Location scoring (distance calculations)

### P2 - Medium (UX Issues)
- [ ] Projects showing 0 count (data loading issue)
- [ ] Cache not clearing properly

### P3 - Low (Polish)
- [ ] Mobile responsive design issues
- [ ] Slow PDF parsing on large files

---

## 📝 HOW TO REPORT NEW BUGS

When you find a bug, add it here with this format:

```markdown
### Bug: [Short Description]
- **Severity:** P0/P1/P2/P3
- **What happened:** [Describe the issue]
- **Expected:** [What should happen]
- **Steps to reproduce:**
  1. Step 1
  2. Step 2
  3. Result
- **Test case:** [File name or specific scenario]
```

---

## 🧪 TEST CASES

### Test Case 1: Auto-Add GCs
**File:** Any bid with GC name in header
**Expected:** GC auto-adds to database after analysis
**Status:** ⏳ Needs testing

### Test Case 2: Manual Add GC
**Steps:**
1. Type "McCarthy Building" in GC search
2. Click "+ Add New"
3. Rate 4 stars
4. Should appear in GC list

**Expected:** GC added successfully
**Status:** ✅ Works (feature exists)

---

## 🎯 NEXT TESTING PRIORITIES

1. **Upload 3 real bid documents** with GC names
2. **Verify auto-add works** - check GC Manager tab
3. **Test BidIndex accuracy** - does score match your gut?
4. **Test data persistence** - do projects save correctly?

---

**Remember:** Phase 1.5 is about USER VALIDATION, not perfect code!
