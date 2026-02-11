# BidIntell Frontend Design Guide
**For use in Claude Code — drop this file into your project root**

---

## Brand Identity

**Product:** BidIntell — AI-powered bid intelligence for construction subcontractors
**Personality:** Confidently Boring. Professional. Trustworthy. Built by industry veterans.
**Audience:** Construction estimators (40-60 age range, not tech-native, value clarity over flash)

---

## Design Tokens (CSS Variables)

Add these to the top of your CSS. Reference them everywhere — never hardcode colors.

```css
:root {
  /* Brand Colors */
  --brand-primary: #4F46E5;           /* Indigo — trust, intelligence */
  --brand-secondary: #7C3AED;         /* Purple — premium, AI */
  --brand-gradient: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  --brand-gradient-subtle: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%);

  /* Score Colors */
  --score-go: #059669;                /* Green — GO recommendation */
  --score-go-bg: #ECFDF5;
  --score-review: #D97706;            /* Amber — REVIEW recommendation */
  --score-review-bg: #FFFBEB;
  --score-pass: #DC2626;              /* Red — PASS recommendation */
  --score-pass-bg: #FEF2F2;

  /* Neutrals */
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  --bg-page: #F9FAFB;
  --bg-card: #FFFFFF;
  --bg-hover: #F3F4F6;
  --border: #E5E7EB;
  --border-focus: #4F46E5;

  /* Typography */
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing Scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
  --shadow-score: 0 8px 24px rgba(79, 70, 229, 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## Typography

**Font:** Plus Jakarta Sans (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Scale:**
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 28px | 800 | --text-primary |
| Section heading | 20px | 700 | --text-primary |
| Card title | 16px | 600 | --text-primary |
| Body text | 14px | 400 | --text-secondary |
| Small / caption | 12px | 500 | --text-muted |
| Score number | 48px | 800 | Contextual (GO/REVIEW/PASS) |
| Badge text | 11px | 700 | White on colored bg |

**Rules:**
- Always use `Plus Jakarta Sans` — never fall back to Inter, Roboto, or Arial
- Use `font-weight: 800` (ExtraBold) for the BidIndex score number — it's the hero
- Use `letter-spacing: -0.02em` on headings for a tighter, premium feel
- Use `letter-spacing: 0.05em; text-transform: uppercase` on badges and labels

---

## Component Patterns

### Cards
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

### BidIndex Score (THE HERO ELEMENT)
The score is the single most important UI element. Make it unmissable.

```css
.bidindex-score {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.bidindex-score.go { color: var(--score-go); }
.bidindex-score.review { color: var(--score-review); }
.bidindex-score.pass { color: var(--score-pass); }

.score-card {
  text-align: center;
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-score);
}
.score-card.go { background: var(--score-go-bg); border: 2px solid var(--score-go); }
.score-card.review { background: var(--score-review-bg); border: 2px solid var(--score-review); }
.score-card.pass { background: var(--score-pass-bg); border: 2px solid var(--score-pass); }
```

### Recommendation Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.badge-go { background: var(--score-go); color: white; }
.badge-review { background: var(--score-review); color: white; }
.badge-pass { background: var(--score-pass); color: white; }
.badge-pending { background: var(--bg-hover); color: var(--text-secondary); }
```

### Buttons
```css
.btn-primary {
  background: var(--brand-gradient);
  color: white;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
}
```

---

## Micro-Interactions & Animation

**Philosophy:** Subtle, purposeful motion that reinforces trust. Construction pros don't want flashy — they want responsive and reliable.

### Card Load Stagger
```css
.card { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 60ms; }
.card:nth-child(3) { animation-delay: 120ms; }
.card:nth-child(4) { animation-delay: 180ms; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Score Count-Up (on report load)
```javascript
function animateScore(element, target, duration = 800) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    element.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

### Tab Transitions
```css
.tab-content {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.tab-content.active {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover States (all interactive elements)
```css
/* Every clickable element needs a hover state */
[role="button"], button, a, .clickable {
  transition: all var(--transition-fast);
}
```

---

## Layout Rules

1. **Max content width:** 1200px centered, with `padding: 0 var(--space-lg)` on sides
2. **Card grid:** Use CSS Grid, `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`
3. **Dashboard stats:** 4-column grid on desktop, 2-column on tablet, 1-column on mobile
4. **Report view:** Single column, max-width 800px for readability
5. **Generous whitespace:** `gap: var(--space-lg)` between cards, `margin-bottom: var(--space-2xl)` between sections

---

## What NOT To Do

❌ **No generic SaaS aesthetic** — avoid the "every B2B tool looks the same" trap
❌ **No Inter, Roboto, Arial, or system fonts** — always Plus Jakarta Sans
❌ **No flat gray everything** — use the brand gradient and score colors for energy
❌ **No harsh borders without shadows** — combine border + shadow for depth
❌ **No instant state changes** — always use transitions (minimum 150ms)
❌ **No tiny, hard-to-read text** — minimum 14px body, 12px captions
❌ **No cluttered dashboards** — construction estimators want clarity, not data overload
❌ **No dark mode** (yet) — keep it clean and light for office/jobsite screens

---

## Design Principles for Construction Users

1. **Clarity over cleverness** — estimators scan, they don't explore. Score first, details second.
2. **Trust signals everywhere** — show confidence levels, data sources, "based on X bids"
3. **Action-oriented** — every screen should answer: "What should I do with this bid?"
4. **Print-friendly** — estimators still print reports. Test `@media print` styles.
5. **Mobile-aware** — jobsite use happens on phones. Touch targets minimum 44px.
6. **Fast perceived performance** — show skeletons/spinners immediately, never blank screens.

---

## File Usage

**Drop this file as `FRONTEND_DESIGN.md` in your BidIntell project root.**

When prompting Claude Code for UI work, reference it:
> "Follow the design guide in FRONTEND_DESIGN.md. Build the [component] using our brand tokens and animation patterns."

Claude Code will read this file and apply the styles consistently across all UI work.

---

**Last Updated:** February 11, 2026
**For:** BidIntell Phase 1 MVP
