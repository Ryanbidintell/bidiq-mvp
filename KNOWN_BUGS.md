# Known Bugs & Fixes

**Last Updated:** April 23, 2026

---

## ✅ FIXED THIS SESSION (Apr 23, 2026)

- **saveSettings() resets onboarding_completed** — `s` object in `saveSettings()` was missing `onboarding_completed`, causing `saveSettingsStorage()` to always default it to `false`. Fixed by preserving `currentSettings.onboarding_completed`.

---

## ✅ FIXED THIS SESSION (Apr 7, 2026)

- **loadTeamTab() `.single()` crash** — organizations query used `.single()` which throws if no row found; changed to `.maybeSingle()`
- **Onboarding step 9 emojis** — emoji icon properties removed from AI tone option objects
- **Admin tab emojis** — removed from Admin Dashboard, Beta Feedback, Refresh button, feedback filter options, GC Alias Management, Find Potential Duplicates, System Statistics, Founder Metrics
- **GC auto-add replaced with suggestion UI** — `autoAddExtractedGCs()` was too aggressive; replaced with `suggestExtractedClients()` that shows one-click pill chips after analysis
- **normalizeCompanyName() broken regex** — pattern `[A-Z][a-z]+` was never matching after `.toLowerCase()`; fixed to lowercase-compatible pattern
- **Winner's Curse / Bid Risk card** — built and wired into analyze + report view; uses "Bid Risk: ELEVATED" terminology

## ✅ FIXED (Apr 24, 2026)

### gc_competition_density table missing
- **What:** Table didn't exist — Competitive Pressure Score always returned 0
- **Fix:** Ran `migrations/010_gc_competition_density.sql` in Supabase SQL Editor. Table live with 3 existing rows. CP now returns real data.

## ⏳ OPEN — P1 (Hurts accuracy)

- BidIndex scores need real-world validation
- Trade detection accuracy
- Location scoring (distance calculations)

## ⏳ OPEN — P3 (Polish)

- Mobile/Safari responsive design — iPhone test pending
- Slow PDF parsing on large files

---

## ✅ PREVIOUSLY FIXED

- Login redirect — auth.html verifyOtp + token param handling
- Auto-emails not firing — decoupled notify from user email
- Geolocation bug
- Trade Match false-low scores — presence-floor model (Mar 10)
- Onboarding step 2 address stuck — gmp-placeselect fallback (Mar 10)
- Contract terms disappear on re-analysis (Mar 10)

---

## 📝 HOW TO REPORT NEW BUGS

```markdown
### Bug: [Short Description]
- **Severity:** P0/P1/P2/P3
- **What happened:** [Describe the issue]
- **Expected:** [What should happen]
- **Steps to reproduce:**
  1. Step 1
  2. Step 2
  3. Result
```
