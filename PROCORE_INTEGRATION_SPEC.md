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

### 3f. "Beta" is outside Procore's documented lifecycle — build accordingly

This is the finding worth restructuring around, and it is not what "beta" usually implies.

**Procore's published API Lifecycle and Deprecation policy defines exactly three phases —
Active, Deprecated, Sunset.** It never mentions Beta, Public Beta, or GA. So the BETA tag on
`companies/{id}/bids` sits *outside* the documented lifecycle: there are no published
promotion criteria, no GA milestone to wait for, and no committed notice period before
breaking changes *within* a version. The only durable commitment anywhere is that a
**deprecated** version is supported for one year after deprecation. "Active" explicitly
permits "ongoing feature releases, bug fixes, and refinements."

Observed behaviour matches: public beta Apr 22 2026, new response fields Apr 2026,
`project_id` added May 2026 — all in-place additions, no version bump.

**Therefore: waiting for GA is not a strategy. Detection speed is the only real protection.**

| Don't depend on | Do this instead |
|---|---|
| Field presence | Parse defensively. Never fail a sync on an unknown or missing optional field. |
| `bid_status` enum stability | Five values documented. Treat an unrecognised value as a passthrough state, never an error. |
| `s3_source` URL durability | Explicitly time-limited. Never persist; re-request the documents endpoint and stream bytes immediately. |
| Uniform pagination | `pdm_*` params page the PDM slice only, not drawings. Handle the two collections separately. |
| Path stability across versions | Pin `v2.0` and `v1.0` explicitly. Subscribe to Developer Portal changelog notifications — Procore's stated notification channel. |

**Build contract tests that assert the response shape and fail loudly in CI**, rather than
silently in production. Given no notice commitment, that test suite *is* the early-warning
system. This is the same lesson as the Jul 2026 silent-failure incident, arriving from a
different direction.

**Rate limit:** 3,600 requests/hour per `client_id`, **shared across all tenants** — not per
customer. Size poll intervals against the total number of connected subs.

### 3g. States to draw as normal, not as errors

- **Documents permission:** Read Only or higher on the company's **Planroom** tool; access is
  automatic once the bidder's company is added to a bid package.
- **Bid Contact** gates *submitting a proposal* only — confirmed, and irrelevant to us since we
  never submit. **But that is not the visibility gate.** See §3h; an earlier version of this doc
  closed the visibility question on the Bid Contact finding, which was wrong.
- Some packages require the sub to **sign an NDA** before contents are viewable. A legitimate
  blocked state on the documents endpoint, not an auth error — must not page anyone.
- A solicitor who **removes a bidder revokes visibility** — 403s and disappearing packages are
  normal states.

### 3h. 🚨 Bid visibility is filtered by **Estimator assignment** — the most dangerous finding here

`companies/{company_id}/bids` returns neither "all company bids" nor "bids assigned to you" in
the Bid-Contact sense. It returns **company-scoped data projected through the authenticated
user's Bid Board permissions.**

Procore's UI documentation states the rule plainly: *"The Bid Board displays all bid invitations
sent to your company; however, access to specific bids is determined by individual user
permissions."* The Bid Board permissions matrix then defines two separate actions — **"View Any
Bid Board Project"** and **"View Bid Board Projects as the Assigned 'Estimator'"** — and
constrains the lower tiers: *"Users with 'Read Only' level permissions can only access projects
for which they are the assigned 'Estimator'."*

| Authorizing user | What the endpoint returns |
|---|---|
| **Admin** on Bid Board | All company bids |
| Read Only / Standard **with** the `Can Access Projects for All Users` granular permission | All company bids |
| Read Only / Standard **without** it | **Only bids where that user is the assigned Estimator** |

⚠️ **Is Standard constrained too?** The English permissions page names only *Read Only*;
a localised mirror of the same page reads as *"Read Only and Standard"*. Treat Standard as
unknown until confirmed — it decides whether Standard is a sufficient onboarding ask. Resolve
in a sandbox, or via §8 Q2 (which asks it directly as "what do we need?" rather than raising
the localisation difference with Procore — cleaner, same answer).

**Why this is the worst failure mode in the whole integration.** A sub authorizes BidIntell with
a Standard or Read Only user who is Estimator on only some jobs. The endpoint returns a
**partial board, with no error**. Everything looks healthy. We silently miss bids — for exactly
the customer who would churn over missing one. This is the Jul 2026 silent-failure pattern
waiting to happen in a new place.

**Required build behaviour — not optional:**
1. **Connect-time verification.** After OAuth, fetch the board and show the user the count we
   can see, asking them to confirm it matches what they expect. If it doesn't, warn and tell
   them what to fix. Never proceed silently on a partial board.
2. **Onboarding carries a permission ask.** Either the authorizing user has Admin on Bid Board,
   or their template has `Can Access Projects for All Users`. Both need their Procore admin —
   **bundle this into the same admin conversation as the app install**, not a second round trip.
3. **Re-check periodically**, since permissions can change under us after connect.

**No server-side filtering.** The endpoint accepts only `page` and `per_page` — no `filters[]`
support, despite Procore offering `filters[<attribute>]=` on many list actions. We cannot ask
for open bids or a due-date window; we page the **entire board** and filter client-side. That
materially tightens the 3,600 req/hour-per-`client_id` budget (§3f) as tenant count grows —
model it before launch. Use each record's `updated_at` for change detection rather than
expecting to query by it.

**Reinforces the service-account conclusion (§3e).** A DMSA is never marked Estimator on
anything, so absent an explicit grant it plausibly returns an empty array. That is now two
independent reasons pointing the same way, and it's the cleanest single test to run first.

## 4. ⏳ OPEN — free-tier API eligibility

This one is commercial, not technical, and it sizes the opportunity.

- **Tool access: yes.** Free accounts do get Bid Board (since Jan 9 2023, free users view,
  manage, estimate and submit bids there rather than being routed to Planroom). Free accounts
  are US/Canada only.
- **API access: probably not, but nowhere formally prohibited.** Nothing in Procore's API
  License Agreement conditions eligibility on a paid subscription, and the marketplace FAQ says
  Marketplace Apps "can be installed and used by any Procore client." The blocker is
  **installation**: apps must be installed in the customer's company before they run, and until
  then company-scoped calls return 401/403 — sign-in succeeds while every API call fails. As of
  **Jan 20 2026** Procore deprecated "Allow User Installs," so an admin must install all app
  types.

- **The tightest form of the argument** (from Procore's own install tutorial): the documented
  prerequisite for installing a Marketplace app is **"'Admin' level permissions on the Company
  level Directory tool."** Free accounts do not have a Directory tool at all — they use a
  **Teams** tool (Member / Team Administrator / System Administrator) in its place. So there is
  no one in a free-tier company who can hold the permission the install requires. That's a
  cleaner chain than the App-Management framing, and it's what the email should cite.

- **Note in our favour on app type:** the same tutorial distinguishes Data Connection (DMSA)
  apps, which require a permission template for the app's user account, from **Embedded /
  Authorization Code apps, which "need no additional permission setup."** We're the latter
  (§3e), so once installed there is no per-customer permission-template step. Worth stating in
  the Technical Assessment — it makes us cheaper to certify and cheaper for a customer to adopt.

- **Capstone evidence — the free-account permissions matrix.** This is a *complete
  enumeration*, and installing an app is not in it. Free accounts have three roles (Member /
  Team Administrator / System Administrator) and exactly two action groups:

  | Group | Actions |
  |---|---|
  | **General Account Management** | Accept/deny join requests · add, edit, deactivate users · **assign bid contacts** · cancel premium estimating subscription · edit personal and company information · log in, navigate to companies/projects · resend invitations · search/filter users · view projects and users |
  | **Bid Board** | Add/edit estimates · add takeoffs · apply templates · configure columns and settings · copy/delete/rename takeoff groups · create/delete/edit projects · **manage bids** · upload documents · view estimates and projects |

  No Directory tool, no Admin tool, no App Management, no apps, integrations, Marketplace,
  service accounts, no API — none of it appears anywhere. The argument is therefore no longer
  "free accounts lack the Directory tool"; it is **"the complete list of actions available to
  the most privileged role in a free account does not include installing an app."** That is
  the strongest form available from public documentation.

  The matrix also confirms the other half: free accounts genuinely *do* get working Bid Board
  — estimates, takeoffs, managing bids, viewing invited projects. **Tool access yes, install
  and API no.**

- **The tutorial and the FAQ never mention account tiers** in the install context — consistent
  with every other Procore document. No explicit prohibition exists anywhere. Hence the email;
  but plan against it.

### 4a. If paid-only is confirmed, the ICP in the application needs a rewrite

Worth settling **before** the Better Together deck, because Procore's team may spot it first.

The application described the ideal joint customer as a $5M–$50M sub with a *"light software
stack — plan-room accounts, an estimating/takeoff tool, spreadsheets."* If the integration
requires a paid Procore seat, then the joint customer is by definition a sub who **already pays
for Procore** — a heavier stack and probably a larger firm. Those two descriptions don't
survive in the same deck.

The honest reframing is coherent and arguably stronger: *the joint customer is the specialty
sub who already runs Procore for project management on awarded work, and wants bid triage in
the same place rather than in a separate inbox.* That's a real segment, it's a natural Procore
upsell story, and it doesn't require pretending the free tier works.

**And BidIntell still serves everyone else** — this is the part that de-risks the whole thing.
A sub on a free Procore account who can't install the app still gets BidIntell through the
universal floor: email forwarding, direct upload, and the Chrome extension
(`extension/README.md`). So the Procore integration is an *upgrade path for Procore-paying
subs*, not the only door. Say that plainly in the deck; it turns a limitation into a coherent
product architecture rather than a gap to be talked around.

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

1. **Integration Workflow Diagram (required).** ✅ **Drafted — see `PROCORE_WORKFLOW_DIAGRAM.md`**
   (Mermaid sequence + flow diagrams, CRUD matrix, explicit non-scope, edge states, open items).
   Render the Mermaid and export to match Procore's format example.

   ⚠️ **Trigger is polling, not webhooks.** Procore exposes `Bids` as a webhook resource, but
   webhook subscriptions are created against a *project* and an invited bidder is not a project
   member — bidder-side webhook eligibility is unconfirmed. The application said
   "via API/webhooks"; the diagram says polling. Don't draw an arrow we can't defend.
2. **Better Together Solution Deck (required).** Joint value proposition and specific customer
   outcomes. Template and an AI prompt provided. Ground it in what is *actually built* — do
   not claim team analytics as live (memory `bidintell-analytics-features`).
3. **UI/UX workflow or prototype (optional).**

## 7. Unknowns to confirm from the Google Form "Edit response" link

The emailed receipt does not render which radio buttons were selected:

- **Development status:** Discovery/Planning · Building Integration · Active in Developer Portal
  — almost certainly **Discovery / Planning**. Ryan has a Procore developer account but has not
  created the app yet; that comes after the application phases. Confirm, since the diagram is
  framed as a *proposal* on that basis.
- **Is the integration Bi-Directional?** ✅ **Answered: No** (confirmed Aug 7 2026 from the
  "Edit response" view). The diagram's read-only v1 agrees. The dashed phase-2 write is not a
  contradiction — the application's narrative already disclosed it as future scope.
- **Bulk data export?** Yes/No
- **Permanent migration to a separate System of Record?** Yes/No

## 8. Draft — remaining questions to apisupport@procore.com

**Send to `apisupport@procore.com`, not `techpartners@`.** API, auth and app-type questions are
what that channel is for, and the free-tier install question is exactly that. `techpartners@`
gets the Technical Assessment submission itself — no questions attached.

Only two asks remain. §3's endpoint questions are answered, the webhook question is answered
(polling, because Bids excludes `create`), and there is no GA timeline to ask about because
Beta isn't in Procore's lifecycle at all. **Asking any of those now would signal we hadn't
read the docs.** Ask narrowly — a vague version of question 1 gets a vague answer.

**SEQUENCING DECISION (Aug 7 2026): send Q2 now, hold Q1 until after we pass Technical
Feasibility.** The two questions have different risk profiles:

- **Q2 (permission level)** is a pure implementation detail. Asking it signals rigour, reveals
  nothing commercial, and settles the onboarding ask before we design the setup flow. Send it
  to `apisupport@procore.com` **with no CC** — the evaluating team has no reason to see it.
- **Q1 (free-tier install) is NOT really a technical question.** It's "how much of your
  ecosystem can actually use my product." Asked mid-evaluation it reads as a founder finding a
  hole in his own proposal. And we don't need the answer: we aren't building yet, and the §4a
  framing works either way. **Answer it in the Better Together deck instead of asking it** —
  state the tiered architecture (Procore-paying subs get the native integration; everyone else
  reaches BidIntell via forwarding, upload, or the extension). Procore's evaluators know their
  own product and will spot the tension regardless; the only variable is whether we look like
  we'd already solved for it. Confirm the detail after we pass, when it affects the build
  rather than the evaluation.
- Risk of waiting: if free-tier install *is* possible we'll have under-claimed reach in the
  deck. That's the safe direction to be wrong in, and trivially revised upward.

### Q2 — send now

> **To:** `apisupport@procore.com` (no CC)
> **Subject:** Bid Board permissions — what does a user need to see the full board?
>
> Hi,
>
> BidIntell is a Procore Technology Partner applicant in Technical Feasibility. Ours is a
> read-only, bidder-side integration — we read a subcontractor's bid invitations via
> `GET /rest/v2.0/companies/{company_id}/bids`.
>
> What permission level does the authorizing user need for that endpoint to return the
> company's entire Bid Board?
>
> The Bid Board permissions page says Read Only users can only access projects where they're
> the assigned Estimator. I'm less clear on Standard, and on whether "Can Access Projects for
> All Users" is the intended way to lift it.
>
> It matters because a filtered result looks identical to a small one from our side — we'd have
> no way to know we were missing bids. We'd like to tell customers exactly what to enable at
> setup. Is Admin on Bid Board, or "Can Access Projects for All Users," the right ask?
>
> Thanks,
> Ryan Elder
> Founder, BidIntell
> ryan@bidintell.ai

*Optional line if you want the phone answer on the record:* "Separately, I was told on a call
today that app installation is company-level and any user on the account can then use the app —
please correct me if that's wrong."

### Q1 — hold until after Technical Feasibility

Free-tier install eligibility (§4). Do not send during evaluation. The deck states the tiered
architecture as a designed answer; this question confirms the detail afterwards, for the build.

### Superseded draft (kept for reference — do not send)

The earlier four-question draft to `techpartners@` asked about webhooks and a GA timeline.
Both are now answered from the documentation, so sending it would read as not having done the
homework.

Now narrow: §3 is answered, so this is only the commercial and stability questions. Omits any
mention of Autodesk (Procore competes with them).


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
