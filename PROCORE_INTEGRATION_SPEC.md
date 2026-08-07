# Procore Marketplace Integration — Spec & Status

**Status:** Technical Feasibility phase · **Blocked on one unanswered API question (see §3)**
Pairs with: `AUTODESK_DOC_IMPORT_SPEC.md` (parked), `FRONT_DOOR_SPEC.md`, memory `bidintell-platform-strategy`.

## 1. Timeline

| Date | Event |
|---|---|
| Jul 21 2026 | Marketplace Partner Application submitted (Google Form, receipt to ryan@bidintell.ai) |
| Aug 7 2026 | Procore advanced us to **Technical Feasibility**. Action required: complete the Technical Assessment form |
| — | *Next: resolve §3, then produce the deliverables in §5* |

No deadline was stated in the advancement email. Contact: `techpartners@procore.com`.

**The application receipt email is the only record of what we proposed.** It is not in
this repo (it's a `.eml` in Downloads). The Google Form "Edit response" link in that
receipt is authoritative and shows the radio-button answers, which the emailed receipt
does not render — see §6.

## 2. What we committed to in the application

These constrain the workflow diagram; the diagram must not contradict them.

**Procore tools/modules proposed:**
- **Primary — Bid Management (Preconstruction):** ingest bid invitations issued to our
  users, including project metadata (project name, location, bid due date, issuing GC,
  trade/scope) "via API/webhooks."
- **Secondary — Documents:** read-only access to bid packages (plans, specifications,
  addenda) shared with the invited subcontractor, enabling full-document scoring rather
  than metadata-only triage. "Access strictly scoped to documents the GC has already
  shared with that sub."
- **Future (explicitly out of initial scope) — Project Management:** write the sub's bid
  decision/status back to the project record.

**User journey as pitched:**
1. Sub connects their BidIntell account to Procore via OAuth.
2. New bid invitations flow to BidIntell automatically — *"no forwarding, no manual upload."*
3. BidIntell scores from metadata within minutes; deepens to full plans/specs analysis
   where documents are accessible.
4. Sub decides GO/REVIEW/PASS and responds to the GC.
5. Sub logs the outcome; the per-user scoring parameters improve.

**Other commitments made:** initial build is read-only and permission-scoped; no
autonomous write actions; Procore data used for real-time inference only, never model
training; no MCP server today but noted as a plausible future capability.

## 3. 🚨 BLOCKING QUESTION — resolve before drawing the diagram

**Can an invited subcontractor's own OAuth token read, via API, (a) the bid invitations
their company received and (b) the documents attached to them?**

The entire proposed integration rests on this. A workflow diagram is a commitment; if it
shows document reads that aren't reachable, Procore's platform team finds out during
review instead of us finding out now.

**What is verified:**
- Procore has a **company-level Bid Board** in the *bidder's own* account showing "all
  Procore Bid invites from all solicitors," including bid details **and documents**.
  ([docs](https://support.procore.com/products/online/user-guide/company-level/bid-board))
- Free Procore accounts with limited features exist in the US/Canada; Bid Board is
  referenced under paid accounts. Which tier gets API access is **unknown** and matters —
  our ICP ($5M–$50M subs, light software stacks) largely won't be paying Procore customers.
- Third-party apps authorize against a **company** account, either user-based OAuth
  (inheriting that user's permissions) or a service account created by a company admin.
  ([docs](https://support.procore.com/faq/how-do-integrations-with-procore-access-my-companys-data))
- Invited bidders need no other project tool access to reach a bid package.
  ([docs](https://support.procore.com/faq/what-permissions-do-bidders-need-in-order-to-be-invited-to-bid-and-submit-a-bid))

**What is NOT verified:**
- Whether the Bid Board is exposed in the REST API at all. The developer reference renders
  client-side and could not be read.
- The bid endpoints findable by name — `bids`, `bid-uploads`, `company-bid-packages` —
  all appear oriented to the **soliciting** company managing a package it issued. No
  bidder-side "list invitations received" equivalent was located. **This asymmetry is the
  same shape as the Autodesk wall** (BuildingConnected Bid Board has no public file-pull
  endpoints), so treat it as a live risk, not a formality.

If the answer is no, the honest fallback is metadata-only scoring plus document upload —
the same universal floor the Autodesk pivot landed on.

## 4. Corrections needed before the Technical Assessment

**4a. The BuildingConnected claim in the application is wrong and should be corrected.**

The application states: *"OAuth, webhook ingestion, and document-sync architecture already
built and tested against the Autodesk BuildingConnected API."* Verified against the repo:

| Claim | Reality |
|---|---|
| OAuth | ✅ True — `bc-oauth-start.js`, `bc-oauth-callback.js` |
| Webhook ingestion | ❌ Not built — `bc-sync.js` is a polled sync, zero webhook handling |
| Document-sync | ❌ Not built — `AUTODESK_DOC_IMPORT_SPEC.md` is a spec "gated on ADN access," no implementing code, and Autodesk's product team confirmed Jun 24 that BC exposes no file-pull endpoints |

Technical Feasibility is exactly where a platform team probes technical claims, and Procore
competes with Autodesk in preconstruction. The accurate version is still a strong answer,
and sets Procore up as the platform that can do what Autodesk couldn't:

> OAuth and metadata sync built and running against BuildingConnected's Opportunities API.
> Document ingestion is currently via upload, because BuildingConnected exposes no
> file-pull endpoints for bid-stage documents.

**4b. RTO/RPO commitment is coming due.** The application answered with *"Our first formal
restore validation exercise is scheduled for Q3 2026"* and did not state actual RTO/RPO
targets. Q3 2026 ends September 30. Expect this to resurface; have real numbers ready.

## 5. Deliverables required by Technical Feasibility

Submitted via a single Google Form (link in the Aug 7 email from `techpartners@procore.com`).

1. **Integration Workflow Diagram (required).** Must show user workflows, data-flow
   directionality between systems, Procore tools/modules touched, and CRUD actions per
   object. Procore provides a format example to match. **Gated on §3.**
2. **Better Together Solution Deck (required).** Joint value proposition and specific
   customer outcomes. Procore provides a template and an AI prompt to accelerate it.
   Ground this in what is *actually built* — do not claim team analytics as live
   (see memory `bidintell-analytics-features`).
3. **UI/UX workflow or prototype (optional).**

## 6. Unknowns to confirm from the Google Form "Edit response" link

The emailed receipt does not render which radio buttons were selected. These shape the
diagram and must be checked:

- **Development status:** Discovery/Planning · Building Integration · Active in Developer Portal
- **Is the integration Bi-Directional?** Yes/No — the narrative says read-only initially
  with phase-two write-back, so the diagram must match whichever was ticked.
- **Does your solution require bulk data export?** Yes/No
- **Permanent migration to a separate System of Record?** Yes/No

## 7. Draft — question to techpartners@procore.com

Deliberately omits any mention of Autodesk (Procore competes with them; raising a stalled
effort with a rival adds nothing).

> **Subject:** Technical Feasibility — API question on bidder-side Bid Management access
>
> Hi,
>
> Thanks for moving us forward to Technical Feasibility. I'm putting the integration
> workflow diagram together and want it to reflect what's actually reachable rather than
> submit something we'd have to revise.
>
> One question determines the shape of the whole diagram.
>
> BidIntell sits on the subcontractor side — our user is the company receiving the
> invitation, and they'd authorize BidIntell against their own Procore account. With that
> authorization, can we:
>
> 1. List the bid invitations their company has received — the contents of their
>    company-level Bid Board — including project metadata and bid due dates?
> 2. Read the documents attached to those bid packages, scoped strictly to what the
>    soliciting GC has already shared with that bidder?
>
> The bid-related endpoints I've found in the reference — bids, bid uploads, company bid
> packages — appear oriented toward the soliciting company managing a package it issued.
> I haven't been able to confirm a bidder-side equivalent for reading invitations received.
> If one exists, pointing me at it would settle the diagram immediately. If it doesn't,
> I'd rather scope the initial integration honestly around what does.
>
> Two related questions:
>
> - Does API access to that data require the bidder to be on a paid Procore account, or is
>   it available to companies on the free tier?
> - For this shape — per-user authorization by the subcontractor — is user-based OAuth the
>   right path, or would you expect a service account?
>
> Happy to jump on a call if that's faster.
>
> Thanks,
> Ryan Elder
> Founder, BidIntell
> ryan@bidintell.ai

## 8. Strategic note

Per memory `bidintell-platform-strategy`, the north star is BidIntell as a
platform-agnostic scoring layer, and the sequence is **land ONE platform first** — proof
unlocks the rest. Procore is currently the best-positioned candidate: unlike
BuildingConnected, the sub-side Bid Board lives in the sub's *own* company account, which
means the sub can install and authorize the app themselves. That solves the install-base
problem that makes GC-side platforms awkward for a sub-side product.

Whether that surface is reachable by API is the single fact that decides it. Everything in
§5 waits on §3.
