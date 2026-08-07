# Procore Marketplace Integration — Spec & Status

**Status:** Technical Feasibility phase · **API feasibility RESOLVED (§3) — diagram is unblocked**
One open commercial question remains: free-tier API eligibility (§4).
Pairs with: `AUTODESK_DOC_IMPORT_SPEC.md` (parked), `FRONT_DOOR_SPEC.md`, memory `bidintell-platform-strategy`.

## 1. Timeline

| Date | Event |
|---|---|
| Jul 21 2026 | Marketplace Partner Application submitted (Google Form, receipt to ryan@bidintell.ai) |
| Aug 7 2026 | Procore advanced us to **Technical Feasibility**. Action required: complete the Technical Assessment form |
| Aug 7 2026 | Bidder-side API feasibility confirmed against the REST reference (§3) |

No deadline was stated. Contact: `techpartners@procore.com`.

**The application receipt email is the only record of what we proposed.** It is not in this
repo (a `.eml` in Downloads). The Google Form "Edit response" link in that receipt is
authoritative for the radio-button answers, which the emailed receipt does not render — see §7.

## 2. What we committed to in the application

These constrain the workflow diagram; the diagram must not contradict them.

- **Primary — Bid Management (Preconstruction):** ingest bid invitations issued to our users,
  including project metadata (project name, location, bid due date, issuing GC, trade/scope)
  "via API/webhooks."
- **Secondary — Documents:** read-only access to bid packages (plans, specifications, addenda)
  shared with the invited subcontractor. "Access strictly scoped to documents the GC has
  already shared with that sub."
- **Future (explicitly out of initial scope) — Project Management:** write the sub's bid
  decision/status back to the project record.

**User journey as pitched:** sub connects via OAuth → invitations flow in automatically ("no
forwarding, no manual upload") → scored from metadata within minutes, deepening to full
plans/specs where documents are accessible → sub decides GO/REVIEW/PASS → logs outcome.

Also committed: initial build read-only and permission-scoped; no autonomous write actions;
Procore data for real-time inference only, never model training.

## 3. ✅ RESOLVED — the bidder-side API exists

Both endpoints verified directly against the REST reference on Aug 7 2026. An earlier read of
this doc concluded the bidder-side surface probably didn't exist; that was wrong. The
resources sit in different nav groups (Bid Board, and a `planroom/` path filed under "Bid
Package Documents"), which is why a name-based scan of `bids` / `bid_uploads` /
`company_bid_packages` missed them.

### 3a. Invitations received

```
GET /rest/v2.0/companies/{company_id}/bids          "List Bids within a Company"
Header: Procore-Company-Id (required)
```

Described verbatim as *"Return a list of your assigned Bids within a Company."* **BETA**
(public beta Apr 22 2026). Fields map almost 1:1 onto the Bid Board Invitations tab:
`bid_package_id`, `bid_package_title`, `bid_form_title`, `bid_form_id`, `bid_status`
(`undecided` / `will_bid` / `will_not_bid` / `not_invited` / `submitted`), `due_date`,
`invitation_last_sent_at`, `awarded`, `submitted`, `lump_sum_amount`, `bid_requester`,
`vendor`, `project`.

Note "**your assigned** Bids" — scoped to the authenticated identity. This has direct
consequences for auth (§3e).

*Parallel resource, not our source of truth:*
`GET /rest/v2.0/companies/{company_id}/estimating/bid_board_projects` (BETA, Jul 25 2024) is
the Estimating-flavored view — richer project metadata, full CRUD, sibling groups for notes /
line items / tasks / proposals. But it's a **workspace object** you can `POST` your own
projects into, not a record of what a GC sent. For "invitations received," use
`companies/{id}/bids`.

### 3b. Documents the GC shared with that bidder

```
GET /rest/v1.0/companies/{company_id}/planroom/bid_packages/{bid_package_id}/documents
Header: Procore-Company-Id (required)
```

*"Returns list of all documents attached to Bid Package, with meta information about all
drawings and PDM (Project Document Management) attachments."* Added Jun 21 2022; PDM
attachments with pagination/sorting added Dec 10 2025.

Response: `{id, title, files[], pdm_pagination}`. Each `files[]` entry carries `size`,
`file_path` (path as it appears in the bid package ZIP, e.g.
`Bid_Drawings/Current/123-Sample-Plans.pdf`), `type`, and **`s3_source` — a time-limited
signed storage URL** you fetch the bytes from. Drawing entries include
`drawing{dpi, revision, drawing_set_id, …}`; PDM entries carry collection / container /
revision IDs.

⚠️ Query params `pdm_page` / `pdm_per_page` / `pdm_sort_by` / `pdm_sort_order` / `pdm_search`
apply **only to the PDM slice, not to drawings** — pagination is partial. Show this on the
diagram.

The `/planroom/` segment is the permission-scoping guarantee we promised in the application:
Planroom is explicitly the bidder tool ("To use this tool, you must be invited to bid on a
project"), and companies not invited to a package cannot see it.

### 3c. The integration flow (backbone of the workflow diagram)

1. Sub authorizes BidIntell — OAuth 2.0 **Authorization Code** (§3e).
2. `GET /rest/v1.0/me` → `GET /rest/v1.0/companies` → resolve `company_id`.
3. `GET /rest/v2.0/companies/{company_id}/bids` → invitations + `bid_package_id` per invite.
4. Per package: `GET …/planroom/bid_packages/{bid_package_id}/documents`.
5. Fetch bytes from `s3_source` **immediately** — never cache the URL; re-request the
   documents endpoint if it expires.
6. Existing BidIntell pipeline: extract → BidIndex v2 score → save `projects` row → notify.

All reads. No writes in the initial scope, matching the application.

### 3d. What does NOT exist — scope out honestly

- **No `GET …/planroom/bid_packages` list endpoint.** The documents endpoint is the *only*
  planroom-pathed resource in the reference. Package IDs must be discovered via
  `companies/{id}/bids`. (`GET /rest/v1.0/companies/{company_id}/bid_packages` exists but has
  no `/planroom/` scoping.)
- **No documents endpoint under `bid_board_projects`.** Files uploaded to a Bid Board project
  in the UI have no API surface.
- **Correspondence** (the GC's one-way messages to bidders) exists only under
  `companies/{id}/bid_packages/{id}/correspondences` — untested from the bidder side. Verify
  before promising it.
- **`GET /rest/v1.0/companies/{company_id}/bids/{bid_id}/uploads` is the bidder's *own*
  submitted files**, not the GC's documents. Easy to misread; don't put it in the diagram as
  a document source.

### 3e. Auth — Authorization Code, not a service account

Three reasons, in increasing order of decisiveness:

1. Procore's own guidance maps "web app that acts on behalf of a Procore user" to
   Authorization Code, reserving Client Credentials for data connectors with "no specific
   user context required."
2. A Developer Managed Service Account is created inside one customer's company by an Admin,
   and the service-account contact **cannot be added to more than one company directory** —
   structurally wrong for multi-tenant. That's a manual admin-assisted setup per
   subcontractor, with a `client_secret` shown once, versus a self-serve OAuth click.
3. **Semantic, and the sharpest:** `companies/{id}/bids` returns "*your assigned* Bids." A
   DMSA is not a bid contact and has no assignments, so a client-credentials token may return
   an **empty array** even with Bid Board permissions granted. **Test this early — it could
   invalidate a service-account path outright.**

Architecture: Authorization Code per subcontractor user; store refresh tokens per user; send
`Procore-Company-Id` on every request (mandatory on both endpoints, and on `/me` and
`/companies` under Multiple Procore Regions).

### 3f. Diagram caveats — states to draw as normal, not as errors

- Both primary endpoints are **BETA**, actively changing through 2026 (new response fields
  Apr 2026, `project_id` added May 2026). Pin version headers; expect field additions.
- Neither reference page documents a required-permissions field. Underlying UI requirement is
  **Read Only or higher on the company's Planroom / Bid Board tool**.
- Some packages require the sub to **sign an NDA** before contents are viewable.
- A solicitor who **removes a bidder revokes visibility** — 403s and disappearing packages are
  normal states, not failures. Handle explicitly.

## 4. ⏳ OPEN — free-tier API eligibility

This one is commercial, not technical, and it sizes the opportunity.

- **Tool access: yes.** Free accounts do get Bid Board (since Jan 9 2023, free users view,
  manage, estimate and submit bids there rather than being routed to Planroom). Free accounts
  are US/Canada only.
- **API access: probably not, but not formally prohibited.** Nothing in Procore's API License
  Agreement conditions API eligibility on a paid subscription, and the marketplace FAQ says
  Marketplace Apps "can be installed and used by any Procore client." The practical blocker is
  **installation**: all apps must be installed in the customer's Procore company before they
  run, and until then company-scoped calls return 401/403 — sign-in can succeed while every
  API call fails. As of **Jan 20 2026** Procore deprecated "Allow User Installs," so Company
  Admins must explicitly install all apps. Free accounts have no Company Admin tool — they use
  a **Teams** tool (Member / Team Administrator / System Administrator) — and the free-account
  documentation never mentions App Management, Service Accounts, API, or integrations.

**Working assumption: paid Procore account required.** This decides whether the addressable
base is *all Procore-invited subs* or *only paying ones* — material, given our ICP ($5M–$50M
subs, light software stacks). Confirm directly with Procore rather than inferring (§8).

## 5. Corrections needed before the Technical Assessment

**5a. The BuildingConnected claim in the application is wrong and should be corrected.**

The application states: *"OAuth, webhook ingestion, and document-sync architecture already
built and tested against the Autodesk BuildingConnected API."* Verified against the repo:

| Claim | Reality |
|---|---|
| OAuth | ✅ True — `bc-oauth-start.js`, `bc-oauth-callback.js` |
| Webhook ingestion | ❌ Not built — `bc-sync.js` is a polled sync, zero webhook handling |
| Document-sync | ❌ Not built — `AUTODESK_DOC_IMPORT_SPEC.md` is a spec "gated on ADN access," no implementing code, parked because Autodesk confirmed Jun 24 that BC exposes no file-pull endpoints |

Technical Feasibility is exactly where a platform team probes technical claims, and Procore
competes with Autodesk in preconstruction. Accurate replacement wording:

> OAuth and metadata sync built and running against BuildingConnected's Opportunities API.
> Document ingestion is currently via upload, because BuildingConnected exposes no file-pull
> endpoints for bid-stage documents.

That version is a *better* pitch now that §3 is resolved: it sets up Procore as the platform
that can do what Autodesk couldn't.

**5b. RTO/RPO commitment coming due.** The application answered *"Our first formal restore
validation exercise is scheduled for Q3 2026"* without stating targets. Q3 2026 ends
September 30. Have real numbers ready.

## 6. Deliverables required by Technical Feasibility

Submitted via a single Google Form (link in the Aug 7 email from `techpartners@procore.com`).

1. **Integration Workflow Diagram (required).** User workflows, data-flow directionality,
   Procore tools/modules touched, CRUD actions per object. Procore provides a format example.
   **Unblocked — build from §3c, with §3d as explicit non-scope and §3f as edge states.**
2. **Better Together Solution Deck (required).** Joint value proposition and specific customer
   outcomes. Template and an AI prompt provided. Ground it in what is *actually built* — do
   not claim team analytics as live (memory `bidintell-analytics-features`).
3. **UI/UX workflow or prototype (optional).**

## 7. Unknowns to confirm from the Google Form "Edit response" link

The emailed receipt does not render which radio buttons were selected:

- **Development status:** Discovery/Planning · Building Integration · Active in Developer Portal
- **Is the integration Bi-Directional?** Yes/No — narrative says read-only initially with
  phase-two write-back, so the diagram must match whichever was ticked.
- **Bulk data export?** Yes/No
- **Permanent migration to a separate System of Record?** Yes/No

## 8. Draft — remaining question to techpartners@procore.com

Now narrow: §3 is answered, so this is only the commercial and stability questions. Omits any
mention of Autodesk (Procore competes with them).

> **Subject:** Technical Feasibility — two questions before we submit the workflow diagram
>
> Hi,
>
> Thanks for moving us forward. I've mapped the integration against the reference and the
> bidder-side path is clear — `GET /rest/v2.0/companies/{company_id}/bids` for invitations
> received, then `…/planroom/bid_packages/{id}/documents` for the shared bid documents, with
> Authorization Code auth per subcontractor user. Two things I'd rather confirm than assume
> before the diagram goes in.
>
> **1. Free-tier accounts.** Our users are specialty subcontractors, and many will be on free
> Procore accounts rather than paid subscriptions. Free accounts get Bid Board, but I can't
> find a documented path for a free-tier company to install a Marketplace app — there's no
> Company Admin tool, and app installation now requires an admin install. Can a free-tier
> company install and authorize a Marketplace app, or is a paid subscription effectively
> required for API access?
>
> **2. Beta stability.** Both `companies/{id}/bids` (v2.0) and the planroom documents endpoint
> are marked beta, and I can see fields added through 2026. Is there a GA timeline, and is
> there anything you'd advise against depending on while they're in beta?
>
> One smaller thing: neither reference page lists a required-permissions field. I'm assuming
> Read Only or higher on Planroom / Bid Board for the authorizing user — please correct me if
> that's wrong.
>
> Happy to jump on a call if that's faster.
>
> Thanks,
> Ryan Elder
> Founder, BidIntell
> ryan@bidintell.ai

## 9. Strategic note

Per memory `bidintell-platform-strategy` the north star is BidIntell as a platform-agnostic
scoring layer, and the sequence is **land ONE platform first**.

**Procore is now clearly the one.** Unlike BuildingConnected, the sub-side surface lives in
the sub's *own* company account — so the sub installs and authorizes the app themselves,
solving the install-base problem that makes GC-side platforms awkward for a sub-side product —
**and the documents are actually reachable**, which is precisely what Autodesk could not offer.
This is the first platform where the full pitch (metadata *and* document-based scoring, with
no manual upload) is technically deliverable.

Remaining risk is commercial (§4), not technical.
