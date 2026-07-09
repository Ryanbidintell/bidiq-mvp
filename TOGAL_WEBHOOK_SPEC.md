# Togal.ai × BidIntell — Pilot Webhook Integration Spec

**Phase 1 pilot: Togal fires a webhook on drawing upload → BidIntell scores → emails the sub.** No Togal UI changes. Free pilot, 5–10 finished-trade subs. Reuses BidIntell's existing edge-function pattern (receive → extract → score → email).

## 1. Flow
```
Sub uploads drawings to Togal  →  Togal POSTs webhook to BidIntell (drawing file URLs)
   →  BidIntell fetches drawings, extracts, runs v2 scoring
   →  emails BidIndex + top reasons + alerts to the sub (optionally Togal CS)
```
Webhook ACKs `200` immediately; scoring runs async (drawings are large). This mirrors the existing `supabase/functions/inbound-email/` receiver (no 6 MB payload cap, handles big PDFs).

## 2. Endpoint (BidIntell side)
- **New Supabase edge function `togal-webhook`** (verify_jwt=false; deploys via `supabase functions deploy togal-webhook`). Chosen over Netlify because drawing PDFs exceed Netlify's 6 MB function payload limit — same reason inbound-email lives on Supabase.
- URL given to Togal: `https://<project>.supabase.co/functions/v1/togal-webhook`

## 3. Webhook payload (Togal → BidIntell)
```json
{
  "event": "drawing.uploaded",
  "timestamp": "2026-07-09T18:00:00Z",
  "sub": { "email": "estimator@sub.com", "company": "Acme Drywall", "togal_user_id": "..." },
  "project": { "name": "MOB Fit-Out", "id": "togal-proj-123", "city": null, "state": null, "gc_name": null },
  "documents": [ { "url": "https://togal.../signed/drawings.pdf", "filename": "A-101.pdf", "kind": "drawing" } ],
  "consent": true
}
```
- `documents[].url` = short-lived **signed** URLs (BidIntell fetches, never stores). Multiple docs allowed (drawings + specs + addenda — addenda just join the doc set per SCORING_V2.md).
- `sub.email` is the identity key: look up BidIntell `user_settings` for personalization; if not a BidIntell user, score with sensible defaults and note "generic weighting."

## 4. Security
- **HMAC signature** header (`X-Togal-Signature` = HMAC-SHA256 of raw body with a shared secret `TOGAL_WEBHOOK_SECRET`). Reject if invalid (same pattern as the Calendly/SendGrid receivers). Fail-closed.
- Rate-limit per `sub.email` (reuse the in-memory limiter pattern).

## 5. Consent & data handling (do NOT fumble this — construction-permissions sensitive)
- Process **only if `consent === true`.** Else 200-ack + drop (no scoring, no storage).
- **Do not retain drawing files.** Fetch → extract text via Claude document API → discard the binary. Store only: the score, project metadata, and sub/Togal identifiers (for the email + pilot metrics). Ideally a Togal-side one-time opt-in screen ("Share this project's drawings with BidIntell for a bid score") gates the `consent` flag.
- Signed URLs should be short-TTL; BidIntell fetches once.

## 6. Scoring (reuse what's built)
1. Fetch each `documents[].url`; base64 → Claude document extraction (mirror `inbound-email` PDF path; `anthropic-beta: pdfs-2024-09-25`). Extract: gc_name, project_name, city/state, bid_due_date, building_type, spec sections/scope, contract clauses, searchable_text.
2. Build the v2 `opportunity` object (availability = `full` — real drawings) and call **`scoreOpportunity()`** from `lib/scoring-core.js` (the unified engine) with the sub's profile (or defaults).
3. Output: BidIndex + recommendation + completeness + 3 buckets + alerts.

## 7. Delivery
- Email the sub via **Resend** (existing inbound-email pattern): BidIndex, GO/REVIEW/PASS, top 3 reasons, alert chips (contract terms, rushed timeline, many bidders), and a "confirm on full review" line.
- Optional CC/BCC Togal CS (config flag `TOGAL_CS_EMAIL`).
- Log the event to `admin_events` (`event_type: 'togal_score'`) for pilot metrics (no PII beyond what's needed).

## 8. Env / config
`TOGAL_WEBHOOK_SECRET` (HMAC), `TOGAL_CS_EMAIL` (optional), reuse `CLAUDE_API_KEY` + `RESEND_API_KEY` + `SUPABASE_*`.

## 9. Phase 1 scope vs later
- **P1 (this spec):** webhook → score → email. No Togal UI, no in-app score, no billing.
- **P2/3 (if pilot proves value):** in-Togal button + in-app score display; ~$50/mo subscription with rev-share; possibly push the score back to Togal via a return webhook/API.

## 10. What Togal needs to provide
- Webhook fired on drawing upload (with the payload above) + short-lived signed URLs for the files.
- The shared secret exchange.
- (P1) that's it — no UI work on their side.

## Build note
~80% of this already exists: the `inbound-email` edge function is the receive→extract→email skeleton, and `lib/scoring-core.js` is the scorer. `togal-webhook` = a fork of inbound-email that takes doc URLs instead of an email attachment. Small build once Togal confirms.
