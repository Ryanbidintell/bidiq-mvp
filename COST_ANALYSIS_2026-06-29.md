# BidIntell — Token Cost Analysis (2026-06-29)

**Scope:** Read-only. Cost of AI scoring per bid package, and margin vs. current pricing tiers. No code, schema, or config changed. The only artifact produced is this file.

**Method:** Traced the live scoring path in `netlify/functions/analyze.js` + the orchestration in `app.html` (`callAI`, `extractWithClaude`, `extractBuildingType`, `detectContractRisks`, `classifyDocument`, `selectTargetPages`). Token counts are **real** — pulled from the production `api_usage` table. Pricing is current published Anthropic per-token pricing (verified against the claude-api reference, not memory).

---

## 0. The scoring path for ONE bid package

A single analysis fires **4 separate AI API calls** (orchestrated client-side in `app.html`, each proxied through `analyze.js`). All run at `temperature: 0`, `max_tokens: 4096`, **no prompt caching** (each `callAI` is an independent request with no `cache_control`).

| # | Operation | Model (per `analyze.js`) | What goes into the prompt | Input cap in code |
|---|---|---|---|---|
| 1 | `doc_classify` | **Haiku 4.5** (`claude-haiku-4-5-20251001`) | First 15 pages, ≤2,000 chars each → builds the sheet-index / TOC page map | `pages.slice(0,15)` × `substring(0,2000)` ≈ 30K chars |
| 2 | `extract_project_details` | **Sonnet 4.6** (`claude-sonnet-4-6`) | **Trade-targeted pages only** (`selectTargetPages`), capped at **150,000 chars**, + the long extraction prompt | 150,000 chars |
| 3 | `extract_building_type` | **Sonnet 4.6** | `fullText.substring(0, 8000)` + small prompt | 8,000 chars |
| 4 | `detect_contract_risks` | **Sonnet 4.6** | `buildContractText(allPages)` — top ~20 contract-keyword pages across the WHOLE doc — `substring(0, 40000)` | 40,000 chars |

Fallback chain on failure: primary Claude → the other Claude model (haiku↔sonnet) → OpenAI `gpt-4o`. Rate limit: **50 requests/hour/user** = ~12 packages/hour.

**On-demand, NOT part of automatic scoring:** `ai_chat` / `answer_question` (the AI advisor) — additional Sonnet calls that fire only if the user chats. Currently negligible (1 call in all of `api_usage`), but uncapped per package.

> Construction text tokenizes **dense** — the real data shows ~1.4–2.5 chars/token (sheet numbers, codes, dimensions), not the ~4 chars/token of prose. The real token counts below already reflect that; don't re-derive from char counts.

---

## 1. Cost per scored package (with assumptions)

**Current pricing (per 1M tokens):** Sonnet 4.6 = **$3.00 in / $15.00 out**; Haiku 4.5 = **$1.00 in / $5.00 out**.

Computed from **real average token counts** in `api_usage` (see §3), at **correct current pricing**:

### Typical package (full plans + specs) — recent real averages
| Call | Model | avg in | avg out | Cost @ correct pricing |
|---|---|---|---|---|
| doc_classify | Haiku 4.5 | 10,663 | 1,141 | $0.0164 |
| extract_project_details | Sonnet 4.6 | 22,286 | 653 | $0.0767 |
| extract_building_type | Sonnet 4.6 | 4,457 | 124 | $0.0152 |
| detect_contract_risks | Sonnet 4.6 | 18,229 | 320 | $0.0595 |
| **Total** | | | | **≈ $0.17** |

### Heavy package (large multi-discipline; extraction near the 150K-char cap) — older real averages
| Call | Model | avg in | avg out | Cost @ correct pricing |
|---|---|---|---|---|
| doc_classify | Haiku 4.5 | 10,663 | 1,141 | $0.0164 |
| extract_project_details | Sonnet 4.6 | 38,736 | 389 | $0.1220 |
| extract_building_type | Sonnet 4.6 | 5,708 | 108 | $0.0187 |
| detect_contract_risks | Sonnet 4.6 | 28,975 | 445 | $0.0936 |
| **Total** | | | | **≈ $0.25** |

### Light package (small/simple bid — short invite, few pages) — scaled estimate
No clean "light" sample isolated in the data; scaled down from the same call structure (extraction ~10K in, contract ~8K in, classify ~5K in, building ~3K in):
- **Total ≈ $0.06** (clearly-labeled estimate, not measured).

**Three headline numbers: Light ≈ $0.06 · Typical ≈ $0.17 · Heavy ≈ $0.25 per scored package.**

**Assumptions / caveats:**
- Token counts for Typical/Heavy are **measured**, not estimated. Light is an estimate.
- No prompt caching anywhere, so **re-analyzing the same bid pays full input cost again** (and `temperature:0` + the re-analysis feature make re-runs common).
- Excludes the on-demand AI advisor chat (uncapped, currently negligible).
- A fallback to `gpt-4o` ($2.50 in / $10 out) is the same order of magnitude.

---

## 2. Where the spend is concentrated

**`extract_project_details` (Sonnet, the 150K-char targeted-text call) is the dominant cost — ~45–50% of every package.** Real logged spend by operation (sum of `cost_usd` to date, across all model-ID variants):

| Operation | Σ logged cost | Share |
|---|---|---|
| extract_project_details | $9.32 | ~58% |
| detect_contract_risks | $4.48 | ~28% |
| doc_classify (Haiku) | $1.36 | ~8% |
| extract_building_type | $1.15 | ~7% |
| ai_chat | $0.005 | ~0% |

Within a package, the input tokens dominate output by ~50–100×, so **cost is almost entirely input-token cost** — driven by how much targeted document text the extraction and contract calls ingest. The contract-risk call is expensive because it deliberately scans the **whole document** (`buildContractText(allPages)`, up to 40K chars), unlike extraction which is trade-targeted.

`doc_classify` on Haiku is cheap per token but has the **highest output** (avg 1,141 tokens — the sheet-index/TOC JSON), so it's a larger slice than its model tier suggests.

---

## 3. Is real cost logged, or only estimated?

**Token counts: logged and accurate. Dollar cost (`cost_usd`): logged but MIS-PRICED for current models.**

- `analyze.js` itself does **not** write to `api_usage` — it only `console.log`s usage and returns it. The client (`app.html` `callAI`) computes cost via `calculateAPICost()` and writes the row (`trackAPIUsage`). So cost lands in the DB, but the cost figure is computed in app.html from a **stale pricing table**.
- `calculateAPICost()` (app.html ~5725) keys pricing by model ID. Its keys: `claude-sonnet-4-20250514`, `claude-sonnet-4.5`, `claude-haiku-4`, `claude-opus-4.5`, `gpt-4o`, `gpt-4o-mini`. When a model ID isn't found it falls back to a **flat $5/M blended** default.

**What the live data proves (exact arithmetic match):**
- Historical Sonnet calls came back as model `claude-sonnet-4-20250514` — **that key exists**, so those were priced **correctly** at $3/$15. (e.g. extract avg 38,736 in / 389 out → logged $0.12204, which is exactly 3/15 pricing.)
- Current calls come back as `claude-sonnet-4-6` and `claude-haiku-4-5-20251001` — **neither key exists** → both fall to the **$5/M default**:
  - `claude-sonnet-4-6` extract: logged **$0.11469** = $5/M blended. Correct (3/15) = **$0.0767**. → **overstated ~1.5×**.
  - `claude-haiku-4-5-20251001` classify: logged **$0.05902** = $5/M blended. Correct (1/5) = **$0.0164**. → **overstated ~3.6×**.
- Secondary error: even the table's Haiku entry (`claude-haiku-4`: $0.25/$1.25) is stale **Haiku-4** pricing; current Haiku 4.5 is $1.00/$5.00.

**Implication:** As traffic migrates to the new model IDs, the admin dashboard COGS is **inflated** (over-reporting cost), most severely for Haiku. The raw `input_tokens`/`output_tokens` columns are correct, so true cost is recoverable from tokens — but the headline `cost_usd` and any dashboard that sums it are not trustworthy today. **Not "flying blind" — the dashboard reads HIGH, not low.**

Sample size to date: ~190 logged calls (67+10 extract, 49+10 building-type, 38+10 contract, 23 classify, plus 28 failed `unknown`/0-token rows and 3 `gpt-4o` fallbacks). Real cost-to-date at correct pricing is **lower** than the ~$15.5 currently summed in `cost_usd`.

---

## 4. Break-even per tier (token cost only)

Tiers as stated: **Solo $49/mo · Team $99/mo (3 seats) · Company $179/mo (8 seats)**. Packages/month to cover token COGS, using the **real "typical" $0.17/package**, with Light ($0.06) and Heavy ($0.25) bounds:

| Tier | Revenue/mo | Break-even @ $0.17 (typical) | @ $0.25 (heavy) | @ $0.06 (light) | Per-seat @ typical |
|---|---|---|---|---|---|
| Solo | $49 | **288 packages** | 196 | 817 | 288 |
| Team (3) | $99 | **582 packages** | 396 | 1,650 | ~194 / seat |
| Company (8) | $179 | **1,053 packages** | 716 | 2,983 | ~132 / seat |

**Realistic usage check:** a subcontractor estimator analyzes on the order of **5–40 bids/month**. At the heavy $0.25 rate, 40 bids = **$10/mo** COGS against a $49 Solo plan → **~80% gross margin on token cost**. Per-seat break-even (132–194 typical packages/seat/month) is far above real estimator throughput.

**Tiers at risk under realistic usage: none.** A tier only goes COGS-negative at ~200+ heavy packages per user per month (Solo) — an order of magnitude beyond real subcontractor behavior, and the 50-req/hour rate limit (~12 packages/hour) further caps a single user's burn.

---

## 5. The single biggest margin risk found

**Per-package economics are not the risk — the cost is small ($0.17 typical) relative to revenue ($49+/mo), and no tier is threatened at realistic volume.** The biggest margin-related risk is **decision risk from a mis-calibrated cost dashboard**: `cost_usd` is computed from a stale pricing table that doesn't recognize the current model IDs (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`), so it silently applies a $5/M blended default — **overstating** Sonnet cost ~1.5× and Haiku cost ~3.6×. Pricing, margin, and unit-economics decisions made off the admin dashboard are currently working from inflated COGS.

Secondary cost-growth vectors (small in absolute terms today, but uncapped):
1. **No prompt caching + re-analysis** — re-scoring the same bid pays full input cost every time; the dominant `extract_project_details` call ingests up to 150K chars each run.
2. **AI advisor chat (`ai_chat`)** — unbounded Sonnet calls per package, not gated; currently 1 call total, but scales with engagement.
3. **Heavy multi-discipline packages** — extraction at the 150K-char cap pushes a single package to ~$0.25; the contract-risk call's whole-document scan compounds it.

None of these threaten tier profitability at current/realistic volumes; they are the levers that would matter only if per-user package volume rose by 1–2 orders of magnitude.

---

*Read-only analysis. No code, schema, or config changed. Token data pulled via a read-only `SELECT` on `api_usage`.*
