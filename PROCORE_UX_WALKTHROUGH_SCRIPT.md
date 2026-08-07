# UI/UX Walkthrough — video script

**Deliverable for:** Procore Technology Partner — Technical Feasibility (optional)
**Their ask:** *"A UI/UX workflow or prototype of the intended user experience. While not
required, providing a visual walkthrough helps our team better understand your integration and
the end-user experience."*
**Runtime target:** 2:30–2:45
**Companion to:** `PROCORE_WORKFLOW_DIAGRAM.md` (this is that diagram, walked through out loud)

---

## The one structural decision

The Procore integration is **not built** — status is Discovery / Planning. The scoring engine,
the report, and outcome logging **are** live today.

So: **show real product for everything that's real, and label the Procore-specific steps as
proposed, on screen, as they appear.** Do not stage a fake Procore connection.

Saying so in the first fifteen seconds is a strength, not a weakness. Procore knows the
integration isn't built — it's in the application. What they're evaluating is whether the person
proposing it is straight with them. Leading with the distinction answers that before they can
wonder.

**On-screen labels:** persistent corner badge reading `PROPOSED — not yet built` on sections 2,
and `LIVE PRODUCT` on sections 3–5. Change the badge on cut, don't rely on narration alone.

---

## Script

### 1 · Open — 0:00–0:15

**On screen:** BidIntell mark, then a plain title card: *BidIntell + Procore — intended user experience*

> This is how BidIntell would work for a subcontractor connected to Procore. I'll be clear as I
> go about what's live in the product today and what's the proposed integration, which isn't
> built yet.

---

### 2 · Connect — 0:15–0:50 · `PROPOSED`

**On screen:** simple mockup of a "Connect Procore" button in BidIntell settings → Procore's
OAuth consent screen → back to BidIntell showing a connected state with a bid count.
*(A clickable Figma-style mockup or even annotated stills are fine. Do not fake a live Procore session.)*

> First, connect. The subcontractor clicks Connect Procore, signs in with their own Procore
> login, and approves. They're authorizing as themselves, and we only ever read.
>
> Then we do something deliberately. We pull their Bid Board and tell them how many bids we can
> see, and ask them to confirm that's right.
>
> That's because Procore filters bid visibility by the user's own permissions. If someone
> connects with an account that only sees projects they're the assigned estimator on, we'd get a
> partial list — and a partial list looks exactly like a short one. We'd rather catch that at
> setup than quietly miss bids for months.

*Why this beat earns its 35 seconds: it shows we read their permission model closely enough to
find a failure mode and design around it. A platform reviewer will notice.*

---

### 3 · An invitation arrives — 0:50–1:15 · transition to `LIVE PRODUCT`

**On screen:** cut to the live app. Show a real bid package entering — use the upload or
email-forward path.

> Second, a GC issues an invitation in Procore. In the proposed integration it lands here
> automatically — no forwarding, no re-upload, no second login.
>
> Everything from here is the live product. I'm bringing this bid in the way our users do today,
> but the scoring is identical either way.

---

### 4 · The score — 1:15–2:00 · `LIVE PRODUCT`

**On screen:** the report. Score, recommendation, then scroll the component breakdown. Zoom in on
the breakdown — don't show a full-page screenshot at 30% scale.

> Here's what the estimator sees. A score out of a hundred — we call it the BidIndex — and a
> recommendation: go, review, or pass.
>
> And the reasoning, because a number nobody trusts doesn't change anyone's decision. How far out
> the job is and whether it's a building type they want. Which of their spec sections actually
> turned up in the documents. Their history with this general contractor. And anything in the
> contract worth a second look.
>
> This is specific to this contractor. The same project scores differently for a different sub,
> because it's built from their trades, their service area, and their own win history — not a
> generic model.

---

### 5 · Decide, and close the loop — 2:00–2:25 · `LIVE PRODUCT`

**On screen:** the bid/no-bid decision, then the outcome form.

> They decide — bid it or pass — and when the job resolves, they log what happened.
>
> That updates their own scoring for that general contractor. So next quarter's recommendations
> come from real results, not assumptions.

---

### 6 · Close — 2:25–2:40

**On screen:** plain end card — BidIntell + Procore, ryan@bidintell.ai

> For the general contractor, the effect is a faster answer from the subs they invited.
>
> And to be clear on scope: this first version is read-only. We never write to Procore, and we
> only ever see the documents the GC already shared with that bidder.

---

## Production notes

- **Record 1080p minimum.** Procore's own deck guidance calls out illegible screenshots as a
  mistake — crop and zoom rather than showing full pages scaled down.
- **Use a real bid**, and redact GC and project names if they're identifiable. No customer data
  on screen.
- **Do not show** the analytics tab's team/per-estimator views — sold but not built.
- **Your own voice, unscripted-sounding.** Read it through twice, then talk it rather than
  reciting. Grade-7 language, construction-first — which is how you already talk.
- **One take is fine.** They asked for understanding, not production value.
- Keep the `PROPOSED` / `LIVE PRODUCT` badge visible the whole time, not just at the cut.

## Final check

- [ ] Section 2 is visibly labelled proposed, and no fake Procore session is shown
- [ ] Sections 3–5 are the actual product, not a mockup
- [ ] Score breakdown is legible at full screen
- [ ] No team analytics, no customer names, no implied scale
- [ ] Read-only stated out loud in the close
- [ ] Under 3 minutes
