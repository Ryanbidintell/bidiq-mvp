# Landing Page Claim Audit — vs Product Bible & Project Docs

## VERDICT: 2 items need fixing. Everything else checks out.

---

## ✅ VERIFIED CLAIMS (Built or in Phase 1 scope)

| Landing Page Claim | Source | Status |
|---|---|---|
| "AI-powered bid intelligence" | Bible v1.8: Layer 1 description | ✅ Built |
| "Personalized BidIndex Score 0-100" | Bible v1.8: "4-component personalized scoring (BidIndex Score)" + Architecture: scoring engine lines 6000-6400 | ✅ Built |
| "4 AI scoring components per bid" | Architecture: Location (30%), Keywords (25%), GC (25%), Trade (20%) + Testing Checklist confirms | ✅ Built |
| "Location-weighted scoring based on your service radius" | Bible v1.0: Service Area & Weight parameter + Schema: service_area_preferred, lat, lng | ✅ Built |
| "Trade matching against CSI divisions and scope language" | Bible v1.8: "Multi-signal trade detection (CSI headers, drawing prefixes, material keywords, titles)" | ✅ Built |
| "GC and client relationship history factors into every score" | Architecture: GC Score component, Schema: gcs jsonb array with ratings/wins | ✅ Built |
| "Contract risk detection flags pay-if-paid, retainage, and more" | Bible v1.8: "AI-powered contract risk detection (automatic, confidence-weighted)" + Schema: contract_risk_clauses jsonb | ✅ Built |
| "PDF upload and AI extraction" | Bible v1.8 Phase 1 checklist + Architecture: analyze.js backend | ✅ Built |
| "Outcome tracking: Won, Lost, No Response, Didn't Bid" | Bible v1.8: "Outcome tracking with structured reasons" + Schema: outcome field | ✅ Built |
| "Personalized to each user's business" | Bible v1.8: onboarding captures office, radius, trades, risk tolerance, capacity | ✅ Built |
| "Same bid, different scores" | Bible v1.0: HVAC vs Electrical example, explicit "SAME BID. DIFFERENT SCORES." | ✅ Core design |
| "Subcontractors" as target user | Bible v1.8: Primary target | ✅ |
| "Distributors & suppliers" as target user | Bible v1.8: "Company type selection (Subcontractor / Distributor / Manufacturer Rep)" + "Product Match scoring for distributors/mfg reps" | ✅ Built |
| "Manufacturers' reps" as target user | Bible v1.8: Same company type selection | ✅ Built |
| "Dashboard with stats" | Bible v1.8: "Dashboard with stats and bid counter" | ✅ Built |
| "Decline reasons captured" | Bible v1.8: "Outcome tracking with structured reasons" + Data Moat: "Decline reasons - User passes on bid" | ✅ Built |
| "Decision confidence scoring" | Bible v1.8: "Decision confidence scoring (1-5 scale)" | ✅ Built |
| "Manual override / feedback" | Bible v1.8: "Manual override / confidence feedback" | ✅ Built |
| "$49/month Starter" | Bible v1.8 pricing | ✅ Planned |
| "$99/month Professional" | Bible v1.8 pricing | ✅ Planned |
| "Free during beta" | Bible v1.8 Phase 0/1 strategy | ✅ Current |
| "30% off for life" (beta users) | Memory: "lifetime 30% discounts for beta users" | ✅ Planned |
| "Nobody is tracking this decision data" | Bible v1.8: "Everyone else is optimizing tasks. BidIntell captures decisions." + Competitor matrix shows no competitor has Network Effects or Personalization | ✅ True per analysis |
| "Your data stays private, aggregated intelligence benefits all" | Bible v1.8: Privacy Protection section: "Never show individual user data, Only aggregated patterns (min 10 data points), Anonymized percentages only" | ✅ Designed |
| "Captures decisions — why you bid, why you passed" | Data Moat Strategy: "Decision intent - Why users bid or don't bid" | ✅ Built (structured reasons) |

---

## ⚠️ NEEDS FIXING (2 items)

### 1. "Email forwarding (auto-analyze)" in Professional pricing tier

**Landing page says:** Professional plan includes "Email forwarding (auto-analyze)"

**Bible says:** Email Forwarding System is **Phase 2** (Weeks 9-10), not Phase 1. It's listed under "PHASE 2: LIGHT LEAD GEN" with a $1.5K build cost.

**Current status:** NOT BUILT YET. Phase 1 is PDF upload only.

**Fix:** Either remove from the pricing card, or change to "Coming soon" language, or move it to a "Roadmap" note. Since this is a beta landing page and the Professional tier won't be charged until after beta, listing it as a planned feature is borderline acceptable — but it's safer to flag it.

**Recommendation:** Change to "Email forwarding (coming soon)" or remove it.

### 2. "Every outcome trains the system" / "AI recommendations improve as your outcome history grows"

**Landing page implies:** The AI actively learns from outcomes RIGHT NOW and improves recommendations.

**Bible says:** Phase 1 captures outcomes but the ML-powered learning is Phase 3: "ML-powered score refinement based on user outcomes" and "Enhanced scoring algorithm v2.0 using GC historical data." Phase 1 is manual outcome tracking that FEEDS future learning. The actual auto-tuning comes later.

**What's true today:** Outcomes are captured. The data IS being collected to enable future learning. But the AI isn't actively retraining based on your outcomes yet.

**What the page says vs reality:** The language "trains the system" and "recommendations improve" implies active ML feedback. The reality is the data capture IS happening (✅) but the active learning loop is Phase 3 vision.

**Recommendation:** Soften to future-forward language: "designed to learn" or "building the foundation for" rather than implying it's actively learning today. OR keep it since the page is describing the product vision and the data capture IS real — just be honest that the learning improves over time as more data comes in.

---

## ✅ CLEAN — No Issues

- No fake testimonials
- No fabricated stats
- No specific city references
- No competitor name-drops
- All product demos labeled as examples/samples
- Pricing matches Bible
- Company types (sub/distributor/mfg rep) all confirmed in Bible v1.8
- Collective intelligence / privacy framing matches Phase 3 privacy protection design
