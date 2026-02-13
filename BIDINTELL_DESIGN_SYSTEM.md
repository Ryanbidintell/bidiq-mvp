# BidIntell Design System — Claude Code Reference

**Purpose:** Use this document when building the signup/login page and user dashboard in Claude Code. Every design token, color, font, component pattern, and spacing decision must match the landing page exactly so the product feels like one cohesive experience.

---

## COLOR TOKENS

```css
/* Core palette — dark, authoritative, construction-grade */
--ink: #0B0F14;           /* Page background */
--ink-light: #141A23;     /* Card/section backgrounds */
--ink-mid: #1C2533;       /* Nested elements, input backgrounds */
--slate: #384254;         /* Borders, dividers, inactive elements */
--slate-light: #5A6A7E;   /* Placeholder text, tertiary labels */
--fog: #94A3B8;           /* Body text, secondary labels */
--cloud: #CBD5E1;         /* Primary body text */
--white: #F8FAFC;         /* Headings, emphasis text */

/* Accent — construction-site orange */
--accent: #F26522;        /* Primary CTAs, active states, links */
--accent-dark: #D4551A;   /* Hover state for accent */
--accent-glow: rgba(242, 101, 34, 0.15);  /* Subtle backgrounds, tags */

/* Semantic colors */
--green: #22C55E;         /* Success, GO, positive scores */
--green-muted: rgba(34, 197, 94, 0.12);   /* Green backgrounds */
--red: #EF4444;           /* Error, PASS, negative scores */
--red-muted: rgba(239, 68, 68, 0.12);     /* Red backgrounds */
--yellow: #EAB308;        /* Warning, caution, mid-range scores */
--yellow-muted: rgba(234, 179, 8, 0.12);  /* Yellow backgrounds */
```

### Score Color Mapping
- **75-100:** `--green` (GO)
- **50-74:** `--yellow` (REVIEW)
- **0-49:** `--red` (PASS)

---

## TYPOGRAPHY

```css
--font: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--mono: 'Space Mono', monospace;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Usage Rules
| Element | Font | Weight | Size | Color | Letter-spacing |
|---------|------|--------|------|-------|----------------|
| Page headings (h1) | DM Sans | 700 | clamp(2.25rem, 4.5vw, 3.25rem) | --white | -0.03em |
| Section headings (h2) | DM Sans | 700 | clamp(1.75rem, 3vw, 2.5rem) | --white | -0.025em |
| Card headings (h3) | DM Sans | 600 | 1.05rem | --white | -0.01em |
| Body text | DM Sans | 400 | 0.9-1rem | --fog or --cloud | normal |
| Section tags | Space Mono | 400 | 0.75rem | --accent | 0.12em, uppercase |
| Score numbers | Space Mono | 700 | varies | --white | -0.04em |
| Data values | Space Mono | 400-700 | 0.75-0.85rem | --cloud | 0.02em |
| Badges/labels | DM Sans | 700 | 0.75rem | varies | 0.02em |

**Critical:** All numerical data (scores, counts, percentages, stats) uses `Space Mono`. All prose and UI labels use `DM Sans`. This separation creates the "software tool" feel vs "AI marketing" feel.

---

## SPACING & RADIUS

```css
--radius: 6px;      /* Buttons, inputs, small cards */
--radius-lg: 10px;  /* Large cards, modals, panels */
```

### Spacing Scale
- **4px** — tight gaps (within components)
- **8px** — element spacing
- **12-16px** — padding inside small components
- **20-24px** — section padding, card padding
- **28-32px** — large card padding
- **48-64px** — gap between major content blocks
- **80-100px** — section vertical padding

### Container
```css
max-width: 1160px;
margin: 0 auto;
padding: 0 24px;
```

---

## COMPONENT PATTERNS

### Buttons

**Primary (CTA):**
```css
padding: 14px 28px;
background: var(--accent);
color: white;
border: none;
border-radius: var(--radius);
font-family: var(--font);
font-size: 0.95rem;
font-weight: 600;
letter-spacing: -0.01em;
/* Hover: */
background: var(--accent-dark);
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(242,101,34,0.3);
```

**Secondary:**
```css
padding: 14px 28px;
background: transparent;
color: var(--cloud);
border: 1px solid var(--slate);
border-radius: var(--radius);
font-size: 0.95rem;
font-weight: 500;
/* Hover: */
border-color: var(--fog);
color: var(--white);
```

### Cards
```css
background: var(--ink-light);
border: 1px solid rgba(255,255,255,0.06);
border-radius: var(--radius-lg);
padding: 32px 28px;
/* Hover (interactive cards): */
border-color: rgba(242,101,34,0.2);
transform: translateY(-2px);
```

### Form Inputs
```css
padding: 14px 18px;
background: var(--ink);
border: 1px solid var(--slate);
border-radius: var(--radius);
color: var(--white);
font-family: var(--font);
font-size: 0.95rem;
/* Placeholder: */ color: var(--slate-light);
/* Focus: */ border-color: var(--accent);
```

### Tags / Badges
```css
/* Accent tag */
padding: 6px 14px;
background: var(--accent-glow);
border: 1px solid rgba(242, 101, 34, 0.25);
border-radius: 100px;
font-size: 0.8rem;
font-weight: 600;
color: var(--accent);

/* Status badges */
.go   { background: var(--green-muted); color: var(--green); }
.pass { background: var(--red-muted); color: var(--red); }
.review { background: var(--yellow-muted); color: var(--yellow); }
```

### Score Ring (BidIndex display)
- SVG circle with `stroke-dasharray: 264` (circumference of r=42 circle)
- `stroke-dashoffset` calculated as: `264 - (score/100 * 264)`
- Ring color based on score threshold (green/yellow/red)
- Score number in Space Mono, centered inside ring

### Score Component Bars
```css
/* Track */
width: 80px; height: 4px;
background: var(--ink-mid);
border-radius: 2px;

/* Fill */
height: 100%;
border-radius: 2px;
/* Color by value: green > 70, yellow 40-70, red < 40 */
```

### Kanban Columns
```css
/* Column */
background: var(--ink-mid);
border-radius: var(--radius);
padding: 12px 10px;

/* Item */
background: var(--ink-light);
border-radius: 4px;
padding: 8px 10px;
border-left: 2px solid [status-color];
font-size: 0.7rem;
```

---

## NAV BAR

```css
position: fixed; top: 0;
background: rgba(11, 15, 20, 0.85);
backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(255,255,255,0.06);
height: 64px;
```

Logo: `BI` in Space Mono inside a 32x32 `--accent` rounded square, followed by "BidIntell" in DM Sans 700.

---

## SECTION DIVIDERS

Sections alternate between `--ink` and `--ink-light` backgrounds. Borders between sections use `1px solid rgba(255,255,255,0.04)`.

---

## ANIMATION PATTERNS

- **Fade-up on scroll:** `opacity: 0; transform: translateY(24px)` → `opacity: 1; transform: translateY(0)` with IntersectionObserver at `threshold: 0.15`
- **Hover lifts:** `transform: translateY(-2px)` on cards and buttons
- **Transitions:** 0.2s for hover states, 0.3s for border/color changes
- **Respect `prefers-reduced-motion`**

---

## PAGE-SPECIFIC GUIDANCE

### Signup/Login Page
- Same nav bar as landing page
- Centered card layout (max-width ~440px) on `--ink` background
- Use the accent glow radial gradient behind the card for visual warmth
- Form fields use the input pattern above
- "Request Beta Access" or "Create Account" button uses primary CTA style
- Include the `BI` logo mark at top of card
- Link to landing page from logo
- Footer minimal — just copyright + links

### User Dashboard
- Same nav bar, but add active user menu (avatar circle, logout)
- Sidebar or tab navigation using `--ink-light` background
- Dashboard cards use the card pattern
- Score displays use the Score Ring and Component Bar patterns
- Project list items use kanban item styling
- All data numbers in Space Mono
- All labels/descriptions in DM Sans
- Status colors: green for won/go, red for lost/pass, yellow for pending/review, fog for no response
- Empty states: centered text in `--fog` with accent CTA button
- Toast/notifications: `--ink-light` background with `--accent` left border

### Key UX Principles (from Product Bible)
- "Confidently Boring" — build trust through transparency, not flashy animations
- Every score component should be verifiable/explainable
- Tooltips on score components explaining what drove the number
- Outcome recording should be 1-click from any project view
- Dashboard should show BidIndex score prominently on every project card

---

## CLAUDE CODE PROMPT

Copy this into Claude Code when building the signup page or dashboard:

```
DESIGN SYSTEM: Use the BidIntell design system from BIDINTELL_DESIGN_SYSTEM.md.

CRITICAL RULES:
1. Dark theme only. Background: #0B0F14. Cards: #141A23. No white/light backgrounds anywhere.
2. Fonts: DM Sans for all text, Space Mono for all numbers/data/scores. Import both from Google Fonts.
3. Accent color: #F26522 (orange). Used for primary CTAs, active states, score ring fills, tags. Never use purple, blue gradients, or any other accent.
4. Border style: 1px solid rgba(255,255,255,0.06) on all cards. Never use solid white or visible gray borders.
5. Border radius: 6px for buttons/inputs, 10px for cards/panels. Never use large rounded corners (no 16px+).
6. Buttons: Primary = solid orange (#F26522), Secondary = transparent with slate border. No gradient buttons.
7. Score colors: Green (#22C55E) for 75+, Yellow (#EAB308) for 50-74, Red (#EF4444) for <50.
8. All numerical data (scores, counts, %, stats) must use Space Mono font.
9. No emojis in the production app UI (landing page uses them, dashboard should not). Use simple text labels or subtle SVG icons instead.
10. Nav bar: Fixed, 64px height, blurred dark background, BI logo mark in orange square.
11. Match the landing page at bidintell.ai exactly in visual weight, spacing, and color. This should feel like the same product.
```
