# 09 — LANDING PAGE COPY (bidintell.ai/diagnostic)

**Purpose:** Inbound channel for diagnostic bookings.
**URL:** bidintell.ai/diagnostic
**File:** `diagnostic_landing_page.html` (drop into bidiq-mvp root, route via netlify.toml)
**When to publish:** AFTER you've completed 3 manual diagnostics.

---

## VISUAL SYSTEM — MATCHES bidintell.ai

The landing page uses the **same design system as index.html**:

- `--brand-primary: #4F46E5` (indigo)
- `--brand-primary-dark: #4338CA`
- `--brand-primary-light: #EEF2FF`
- White background (`#FFFFFF`)
- Near-black text (`#111827`)
- Inter font (Google Fonts) with system fallback
- Rounded buttons (8px radius)
- Indigo solid primary, indigo border ghost secondary
- Subtle shadow + 1px hover lift on primary CTA
- No emojis, no exclamation points (Confidently Boring)

If/when you update the main site's design tokens, update `:root` at the top of `diagnostic_landing_page.html` to keep them in sync.

---

## STRUCTURE — TOP TO BOTTOM

1. **Nav** — same logo treatment as index.html (`Bid` in indigo, `Intell` in near-black). Adds a "Diagnostic" link active state and keeps "Sign In" as a ghost button.

2. **Hero** — eyebrow chip ("Free · 10 slots per month"), headline with indigo accent on "bid selection diagnostic," subhead, primary CTA button anchoring to `#book`, meta line about ICP fit.

3. **Problem callout (alt section, soft gray bg)** — leads with the strongest pain quote: "Most subs lose money on the bids they shouldn't have chased." Indigo left-border quote callout reinforces the framing.

4. **The exchange — two-column** — "What you get" (highlighted indigo card) vs "What I get" (neutral card). Mutual fairness on display.

5. **Fit check — two-column** — "This is for you if" (indigo checkmarks) vs "This isn't for you if" (gray X marks). Ruthless qualification.

6. **About me** — circular avatar with "RE" initials in indigo, two short paragraphs of the credibility story.

7. **CTA banner with embedded Calendly** — full-width indigo banner, white headline, inline Calendly widget styled with indigo (`primary_color=4F46E5`) so it visually integrates instead of feeling tacked on.

8. **FAQ** — 7 questions covering all the objection-handling pre-emptively (is it really free, will you pitch me, sample memo, recording, full calendar).

9. **Footer** — minimal, links to Home / Legal / Contact.

---

## CRITICAL BEFORE PUBLISHING

Before you deploy, replace these placeholders in the HTML:

| Placeholder | Replace with |
|---|---|
| `data-url="https://calendly.com/ryan-bidintell/diagnostic..."` | Your real Calendly URL with correct username + slug |
| `CLARITY_PROJECT_ID` | Your real Microsoft Clarity project ID |
| `RE` in the avatar div | Optional — replace with `<img>` if you want a real headshot |

GA4 measurement ID `G-XGYJLV0E6G` is already correct (matches your existing setup per MEMORY.md).

---

## DEPLOYING

### Option A: Single HTML file at /diagnostic (simpler)

1. Copy `diagnostic_landing_page.html` to `bidiq-mvp/diagnostic.html`
2. Add this redirect to `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/diagnostic"
     to = "/diagnostic.html"
     status = 200
   ```
3. Push to GitHub. Netlify auto-deploys.
4. Live at `bidintell.ai/diagnostic`.

### Option B: Subdirectory (cleaner URL)

1. Create `bidiq-mvp/diagnostic/index.html`
2. URL automatically resolves to `bidintell.ai/diagnostic` without needing a redirect.
3. Slightly preferred — looks cleaner.

---

## ANALYTICS EVENTS

The page fires three GA4 events:

| Event | Trigger |
|---|---|
| `diagnostic_page_view` | Page load (in addition to default GA pageview) |
| `diagnostic_cta_click` | Hero CTA button clicked |
| `diagnostic_booked` | Calendly `event_scheduled` postMessage received |

You can build a funnel in GA4: `page_view → cta_click → booked`.

---

## COPY THAT'S WORTH GUARDING

These specific phrases do real conversion work — don't casually edit:

- **"Most subs lose money on the bids they shouldn't have chased — not the ones they lost."** — the hook. Reframes the problem in a way that separates BidIntell from "win rate optimization" tools.

- **"No product walkthrough. No pitch on the call. The deliverable is the memo."** — the trust statement. Deletes the #1 objection (sales call disguised as research).

- **"I bid wrong too many times."** — the founder credibility line. Three words that say you're not selling theory.

- **"If something in the memo sparks a conversation about BidIntell afterward, I'll send one short follow-up email. If not, no pressure either way."** — the integrity statement.

If you A/B test the page later, test around these — don't replace them.

---

## IF THE PAGE UNDERPERFORMS

Realistic baseline: 2-3% of qualified visitors should book. If you're below that:

1. **Check qualifications first** — is traffic actually ICP? GA by source. LinkedIn referrals from your posts convert much better than random Google traffic.
2. **Hero clarity** — does the headline land in 3 seconds?
3. **CTA friction** — if the inline Calendly embed is slow on mobile, switch to a "Book a slot" button that opens Calendly in a new tab.
4. **Trust signals** — at month 2, add a one-line testimonial from a diagnostic recipient (with permission).

If you're getting 5%+, leave it alone and pour more into LinkedIn distribution.

---

## WHEN TO PAUSE

Take the page down or replace the CTA with a waitlist if:
- Weekly call cap is consistently maxed (5/week)
- You're booking more than you can deliver memos for
- Memo quality is dropping because you're rushed

Diagnostic motion only works at quality. Throttle inbound rather than degrade the deliverable.

---

**Next file: 10_PROJECT_SETUP.md**
