# Autodesk AECO Technology Partner — Application & Call Kit
**BidIntell · prepared June 12, 2026. Everything needed for the Autodesk partner conversation in one place.**

> Status: AECO Technology Partner application **submitted** (confirmation received, under review). This kit has the contacts, a ready-to-send email, the integration description, the Partner Intelligence Form answers, and call talking points. Keep it honest — we're a pre-revenue beta with a *built and deployed* integration, which is exactly what the Bronze tier is for.

---

## Contacts (from the Developer Guide)
- **Jeremy Wallin — Partner Engagement — jeremy.wallin@autodesk.com** ← primary; owns the integration relationship.
- **Tiffany Friesen — Partner Recruitment — tiffany.friesen@autodesk.com**

## Where we are on Autodesk's 5-step path
Get Started → **Integrate (we're here — already built)** → Launch → Market → Enhance.
We already have an **APS application** and a **deployed BuildingConnected integration**, so we skip most of "Get Started/Integrate." The open item is step 3: *obtain a developer account with the **proper entitlements** via ADN* — the lever for smoother customer onboarding. Partners get **50% off the first year of ADN**.

---

## Ready-to-send email to Jeremy Wallin

**Subject:** BidIntell — AECO Tech Partner submission + BuildingConnected integration (already built)

Hi Jeremy,

I just submitted our AECO Technology Partner application and wanted to reach out directly. I'm the founder of **BidIntell** (bidintell.ai) — we score commercial bid invitations for subcontractors and help them decide which jobs to chase.

We've **already built and deployed** a BuildingConnected integration on APS — 3-legged OAuth plus the Opportunities API, importing live bid invitations into BidIntell with fit scoring. So we're past the "exploring" stage and into making it production-ready for customers.

Two things I'd value your guidance on:
1. **Customer onboarding friction** — today a customer has to contact BuildingConnected to enable API access for their company. What's the right path (entitlements via ADN, a marketplace listing, etc.) to make that as close to self-serve as possible for our subcontractor customers?
2. **Dev/test environments** — can we use the `test`/`alpha` environments to validate the full flow before a customer enables live access?

Could we grab 20–30 minutes? Happy to demo the working integration.

Thanks,
Ryan Elder
Founder, BidIntell.ai

---

## Tiffany Friesen reply — onboarding questions (final, as sent)

**1. What does your technology do?**
BidIntell (bidintell.ai) scores commercial construction bid documents 0–100 and recommends GO / REVIEW / PASS, so subcontractors, distributors, and manufacturers' reps focus estimating time on the bids they can actually win. The score is personalized to each company's trades, service area, and client history, and it sharpens as they log outcomes — giving each customer a private, growing picture of their own win patterns, client behavior, and project economics so they make smarter bidding decisions over time.

**2. API integration or plugin?** API integration (cloud) — already built and deployed.

**3. Which Autodesk platform?** BuildingConnected, via Autodesk Platform Services (3-legged OAuth + the v2 Opportunities API). Our APS app is registered as "BidIntell.ai".

**4. Are you in the Autodesk Developer Network?** Not an ADN member yet. I do have an APS developer account with our app set up, and our BuildingConnected integration is already built on APS — so we're active on the platform. Ready to enroll in ADN when it's the right step for the entitlements.

**5. Are you a startup?** Yes — early-stage, founder-led construction-tech, Kansas City area.

**6. Do you offer sustainability workflows?** No — focused on bid qualification and estimating efficiency, not sustainability.

**7. What sustainable outcomes do you enable?** None specific to sustainability (per #6); the value is helping subs avoid wasted estimating effort on low-fit work.

**8. Do you plan to publish the integration for public use?** Yes — a publicly available BuildingConnected integration any subcontractor customer can connect, with a listing once we meet program requirements.

> **Data-positioning note (important):** the marketplace-data / "understand the bidding marketplace" angle was deliberately CUT from the Autodesk-facing answers. Aggregating BuildingConnected customer data into a market-intelligence product is a data-governance red flag with the platform whose data we touch, and likely restricted by API terms. Customer-owned, benefit-to-them framing only. The data-moat vision stays in investor/internal materials, not partner intake.

---

## Integration description (technical — for the partner team / App Store listing)

**Name:** BidIntell — BuildingConnected bid scoring & qualification

**One-liner:** BidIntell automatically imports a subcontractor's live BuildingConnected bid invitations and scores each one 0–100 for fit, so the go/no-go decision happens *before* estimating hours are spent.

**How it works:**
- **Auth:** Autodesk Platform Services (APS) 3-legged OAuth, `data:read` scope. Refresh tokens stored encrypted; auto-refresh on expiry.
- **Data:** BuildingConnected v2 **Opportunities API** (`/construction/buildingconnected/v2/opportunities`), paginated, with dedup on opportunity ID.
- **Processing:** Each opportunity is scored on location fit, trade/CSI scope match, client relationship/history, and keyword fit (metadata-only "Phase 1" scoring — no PDF needed).
- **Volume control:** Live-bids-only gate by default (skips won/lost/declined and past-due) plus an optional user-selected "received on/after" date floor — keeps a first sync manageable instead of dumping full history.
- **Output:** Imported as scored projects in BidIntell with a GO/REVIEW/PASS recommendation; BuildingConnected stays the system of record.

**Value to mutual customers:** turns BuildingConnected bid data into an instant prioritized work list, cuts estimating time wasted on low-fit invites, and makes Bid Board Pro stickier by adding a decision-intelligence layer on top of it.

---

## Partner Intelligence Form — answers

**Company value proposition:**
BidIntell scores commercial construction bid invitations 0–100 (the "BidIndex") and recommends GO / REVIEW / PASS, so subcontractors, distributors, and manufacturers' reps stop spending estimating hours on low-fit bids and focus on the work they can actually win.

**Differentiators:**
1. **Personalized, not a generic signal** — scores against each company's own trades, service area, client history, and keywords.
2. **Learns from outcomes** — every logged win/loss sharpens the customer's future scoring.
3. **Transparent & overridable** — estimators see the full score breakdown and can override, so they trust and adopt it.

**Go-to-market tactics:**
Founder-led outreach to specialty subcontractors (MO/KS/CO and expanding), referrals from existing users, an ROI calculator lead magnet, SEO/GEO content (the "Take-Off" library), and the BuildingConnected integration as the primary activation lever — subcontractors live in BuildingConnected, so meeting them there removes adoption friction.

**Integration use-case:**
Auto-import and score a subcontractor's live BuildingConnected bid invitations the moment they arrive, so bid/no-bid qualification happens before any estimating time is spent.

**Integration value:**
Instant prioritized work list from BuildingConnected data; less wasted estimating; higher effective win rate by pursuing fewer, better-fit bids; increased Bid Board Pro engagement.

**Referenceable customers (honest, early-stage):**
Pre-revenue beta. Strongest current reference: **Summit Sealants** (active beta user). **FDC Contract** (onboarded). The BuildingConnected integration is built and entering live customer validation (target first live BC user: a flooring subcontractor, Regents Flooring). We expect referenceable BC-integration customers as the partner relationship and our first paid users land — Silver tier's 5-customer bar is a near-term goal, not a current claim.

**Designated leads:**
- **Technical lead:** Ryan Elder, Founder (builds/owns the integration).
- **Go-to-market lead:** Ryan Elder, Founder.
*(Update if/when a second team member takes either role.)*

**Target tier:** Bronze now (deployed integration). Silver next (requires 5 active customers using the integration).

---

## Call talking points (when Jeremy/Tiffany reply)

**Lead with:** "It's built and deployed — we're not exploring, we're productionizing." That's our edge over most applicants.

**Three questions to get answered:**
1. What entitlements / path make **customer API access as close to self-serve as possible** (so a sub doesn't have to email BC support to turn it on)?
2. Can we use **`test`/`alpha` dev environments** to validate end-to-end before a customer enables live access?
3. What exactly unlocks the **public AECO integration listing** (we know Silver needs 5 active customers — confirm there's nothing else)?

**Know going in:**
- ADN membership has a fee (50% off first year as a partner) and is the channel for direct API support + entitlements.
- The listing/promotion benefits are Silver-tier and gated on **5 active customers** — so landing our first users and the partnership reinforce each other; the partnership is not a shortcut around getting customers.
- Don't let any of this block the immediate work: we can validate via `test` mode and concierge-onboard our first real BC user without waiting for partner approval.

---

## Demo readiness (test mode — no Bid Board Pro needed)

A `test`-environment toggle is wired into the BuildingConnected sync so you can demo the full flow live, on real UI, without a paid BC subscription or company API enablement. It uses Autodesk's documented `x-bc-mode: test` environment, which returns predefined sample opportunities.

**To get demo-ready (≈2 min, do this before the Jeremy call):**
1. App → **Settings → Integrations → BuildingConnected → Connect.** Sign in with your Autodesk ID (any ID works — no Bid Board Pro required). This replaces the old revoked connection.
2. Click **Sync Now** → in the modal, check **"Use Autodesk test data (admin/demo only)"** → **Import bids.**
3. Sample opportunities import and score → screen-share this flow with Jeremy.

**Caveats / what to watch:**
- Test mode is **admin-only** (gated to ryan@fsikc.com / ryan@bidintell.ai) — customers never see the checkbox. Live customer syncs are unaffected.
- If the first try returns **0 or errors**, that tells us the test env requires the partner/entitlement step after all — which is itself a useful, specific thing to raise with Jeremy.
- Sample bids carry an `[Autodesk TEST data — not real bids]` note in the result so it's never confused with live data.
- This relies on Autodesk's test env behaving as documented — confirm it works once before relying on it in front of Jeremy.

---

# ════════════════════════════════════════════════════════
# JUNE 22, 2026 — DEMO PREP + VERIFIED INTEGRATION RESEARCH
# ════════════════════════════════════════════════════════
*(Added the day before the Jun 23 4:00 PM CT demo with Jeremy Wallin + Tiffany Friesen. This section supersedes the "Demo readiness" notes above where they conflict. Everything below is verified against rendered Autodesk docs unless marked otherwise.)*

## 1. Demo strategy (what changed and why)

**The Autodesk BuildingConnected TEST environment returns synthetic `faker.js` data** — fake company names ("Cremin, Orn and Casper," "Senger-Roob"), scope fields literally "Info1/Info3," random cities, trades like "Safety Officer." Every test row scores a flat **39/PASS** because there's no real scope text to match (garbage in → uniform score out). This is NOT a scoring bug — it's the sandbox.

**Implication:** do NOT use the test-data list as the demo showcase. Jeremy works at Autodesk and will recognize his own fixture data; a board full of identical "39/PASS / Cremin, Orn and Casper" rows makes BidIntell look like a dumb importer.

**Demo choreography (decided):**
1. **Showcase intelligence on REAL data** — the 7 real KC projects already in the account (scores 34→78, real GCs, real locations). Drill into **Jackson County Detention Center (76, J.E. Dunn, Kansas City)**. Backup story: **NAIC Renovation (78, won)** — "flagged REVIEW, you bid it, you won."
2. **Prove the integration is live** — click **Sync Now** (test data) to show invites streaming from the BC API, framed honestly: "this is your sandbox, so names are placeholders; in production these are real invites, auto-scored on arrival."
3. **If the live sync hiccups:** stay on the populated dashboard — data's already there, nothing breaks.

**Dashboard cleanup done (Jun 22):** removed 3 junk test-forward rows ("Safety culture" x2, an empty duplicate "Midwest Trust") and the 23 synthetic BC test rows (re-syncable in one click). Account now shows 7 clean real projects. Backup of the 3 deleted rows: `OLD/demo-cleanup-backup-2026-06-22.json`.

## 2. Bug fixed (commit `7106ae2`, deployed)

BC sync was importing **trade/package names as project names** (e.g., "Drywall & Acoustical" shown as the project). Root cause: `project_name` was read from `opp.clientValues.name`. Per the verified Opportunities schema the real project name is **`opp.project.name`**; `clientValues` holds client-entered values, `tradeName`/`name` is the bid package. Fixed in `netlify/functions/bc-sync.js` `mapOpportunityToProject` (also covers `bc-auto-screen.js`, which reuses it). Falls back to old fields if `project.name` is absent — no regression.

## 3. ★ THE BIG FINDING — scoring the actual drawings is buildable (sub-side)

**The problem with the current integration:** metadata scoring is a weak proxy. A bid invite is just the GC's blurb, and you can't control what they type. An accurate bid/no-bid score needs the real drawings + specs. So the metadata screener is fast triage, not the real product.

**Verified answer: the full-document score IS achievable, via two APIs together.**

- **The BC API alone exposes NO drawings.** Full v2 endpoint list = opportunities, bid-packages, bids, bid-forms, line-items, plugs. The only file endpoints (`/bids/:id/attachments`) are the sub's own *proposal* attachments — not the GC's plan set.
- **The real path = BuildingConnected API + Data Management API (Autodesk Docs).** When a BC project links to Autodesk Docs, Docs is the file backend. BC shares a specific Docs folder with bidders — at the bid-package level, only invited subs see that folder.
- **The bridge field: `currentAccDocsFolderId`** — exposed on `GET projects` and `GET bid-packages`.

**End-to-end flow:**
```
/opportunities  →  bid-package  →  read currentAccDocsFolderId
   →  Data Management API: hub → project → folder → item → version → storage
   →  download PDF (signed S3 URL)  →  analyze.js deep-scores the real plan set
```

## 4. How we get Data Management API access (mechanics)

- **Same APS app** we already use for BuildingConnected — just **add the `data:read` scope** (likely `account:read` too).
- **Same 3-legged OAuth** login the sub already does for BC.
- **File retrieval:** traverse hub → project → folder → item → version → storage → download.

## 5. ★ THE CRUX RISK — provisioning (this decides whether it scales)

Data Management docs are explicit: for an app to read an ACC account's files, **the account admin generally must provision the app** (Account Admin → Custom Integrations → add the app's Client ID). That creates a fork:

- **Bad case:** the bidder-shared folder is read through the **GC's** ACC hub → BidIntell would need provisioning in **every GC's account.** Non-starter for a sub-side tool at scale.
- **Good case:** BC's bidder-sharing grants the **sub's own Autodesk identity** folder-level access, so BidIntell rides the **sub's** 3LO session — no per-GC provisioning. (BC exists to share plans with external subs who aren't ACC members, so a bidder path likely exists — but NOT confirmed to be exposed via Data Management without provisioning.)

**This is the single make-or-break question for Jeremy.** (See asks below.)

## 6. Scope & targeting decisions

- **First integration target = Bid Board Pro (subs receiving invites), NOT BC Pro (GCs).** Matches the ICP and product; the document-pull flow works sub-side; keeps out of the upmarket / Boon-AI trap.
- **Caveats to design around:** only works when the GC runs BC *with* Autodesk Docs (pure-BC + legacy "opportunity files" = partial/no file API); APS rate limits → async download/score pipeline for large drawing sets.
- **Positioning conflict to fix before marketing:** `works-with-estimating-tools.html` currently says BidIntell "does not integrate with estimating software — no data sync or API connection." BC+Docs ingestion contradicts that; it becomes a new capability/tier — update the copy.

## 7. The 5 asks for Jeremy (plain-English, demo brief PDF has these too)

1. **Permission to reach files:** confirm `data:read` (+ `account:read`?) is what we request to download the plan folder for a sub's invited bids.
2. **★ Make-or-break — can a SUB do it without GC provisioning?** "Does BidIntell need provisioning in each GC's ACC account, or does BC's bidder-sharing grant the sub's own login access to the shared package folder so we ride their session?"
3. **Market coverage:** roughly what share of GCs run BuildingConnected *with* Autodesk Docs enabled?
4. **Technical contact:** a named engineer to work the file-access details through with.
5. **(Phase 2, later) Writeback:** can the BidIndex score be written back onto an opportunity so it shows where the estimator already works?

**Credibility line to open with:** "We've already mapped your API — we pull opportunities, we found `currentAccDocsFolderId`, we know the download flow. We're not asking you to build anything; we need the access to use what's already there."

## 8. Sources (verified Jun 22 2026)
- BC v2 API reference (endpoint list): https://aps.autodesk.com/en/docs/buildingconnected/v2/reference/
- BC API overview (files + Data Management): https://aps.autodesk.com/en/docs/buildingconnected/v2/developers_guide/overview/
- BC field guide (`currentAccDocsFolderId`): https://aps.autodesk.com/en/docs/buildingconnected/v2/developers_guide/field_guide/buildingconnected/
- Data Management API overview (access + hierarchy): https://aps.autodesk.com/en/docs/data/v2/developers_guide/overview/
- Manage API access to Docs / custom-integration provisioning: https://aps.autodesk.com/en/docs/bim360/v1/tutorials/getting-started/manage-access-to-docs/
- BC Pro + Autodesk Docs integration: https://support.buildingconnected.com/hc/en-us/articles/25752881793171-Bid-Board-and-Autodesk-Docs-Integration

## 9. Companion artifacts
- **`Downloads/BidIntell_Autodesk_Demo_Brief.pdf`** — one-page demo brief (story, 5 asks, click-path) to keep open during the call.
- Memory: `bidintell-bc-roadmap.md` (verified findings + sharpened asks).

---
*Pairs with [BIDINTELL_CONTEXT_FOR_DESKTOP.md]. Update when the partner status, tier, or referenceable-customer list changes. Last major update: Jun 22 2026 — verified document-scoring path + demo prep.*
