# BidIntell — Follow-Up Automation Build Spec v1.0

**Document type:** Claude Code build specification
**Status:** Ready for build — **next feature to ship**
**Author:** Ryan Elder (product) + Claude (drafting)
**Date:** May 20, 2026
**Estimated build window:** 10 weeks
**Supersedes:** Phase 2 roadmap entry for "Automated follow-ups"
**Build priority:** This feature ships BEFORE the BuildingConnected API integration. See Section 0.1 below for the sequencing decision.

---

## 0. Read Before Building

Before writing any code, read in this order:

1. `BidIntell_Product_Bible_v1_9.md` — product roadmap and requirements
2. `CLAUDE.md` — coding rules, patterns, and lessons learned
3. `ARCHITECTURE.md` — file structure, tech stack, function names (v2.0)
4. `SCHEMA.md` — database schema, 10 tables (v2.0)
5. `MEMORY.md` — session history and build decisions
6. This document — the build spec for the follow-up automation feature

This feature represents a deliberate departure from the v1.9 Phase 2 designation. The original roadmap placed automated follow-ups in Phase 2 ("Data Density & Automation"). After product strategy work in May 2026, the decision was made to pull this feature forward into the current cycle because it directly powers outcome logging rate — the north star metric of the entire data moat thesis.

Do not phase-gate this feature. Build it now.

---

## 0.1 Build Priority Decision — Follow-Up Before BuildingConnected

**Decision (May 2026):** Follow-up automation ships first. BuildingConnected API integration ships after follow-up is stable in production.

The BuildingConnected integration is approximately 50–70% built (OAuth scaffolding started, some invite fetching working). The instinct to "finish what's started" is wrong here. Sequencing reasoning:

1. **BC integration only helps users on paid Bid Board Pro subscriptions per office** — roughly 10–15% of the ICP. Follow-up automation helps 100% of paying users regardless of where their bid invites originate.
2. **Outcome logging rate is the north star metric.** Follow-up automation is the only product change that directly forces outcome capture at every touch. BC integration adds bid volume but does not raise outcome logging rate.
3. **The PlanHub re-engagement conversation needs outcome data, not BC integration.** PlanHub is a BC competitor; integrating with their competitor first is the wrong proof point to bring back to that partnership conversation.

**Sequence:**

- **Weeks 1–10:** Follow-up automation (this spec)
- **Weeks 10–12:** Soft launch, monitor outcome logging rate, fix issues
- **Weeks 12–16:** Complete BuildingConnected API integration (separate spec — to be drafted in Week 10)
- **Week 16+:** PlanHub re-engagement with real outcome data plus BC integration as a credibility marker

**Single safety valve:** If a high-value prospect (Regents Flooring level) explicitly states between now and Week 6 that BC integration is the *only* thing blocking adoption, ship a 1-week manual BC email-forwarder for that customer specifically. Do NOT full-build the BC API for one customer. That breaks focus and delays the follow-up feature by an unacceptable margin.

If you (Claude Code reading this) are asked to start work on BuildingConnected before the follow-up feature is in soft launch, stop and confirm with Ryan first. The sequencing decision above is deliberate.

---

## 1. Strategic Rationale (Why This Feature, Why Now)

### The North Star Metric

Outcome logging rate is the single most important operational metric for BidIntell. Every product decision is evaluated against whether it raises or lowers the rate at which users record Won / Lost / Ghosted / Declined outcomes on their bids.

Today, an estimated 40–55% of bids in BidIntell receive a logged outcome. Bids without outcomes are dead data — they don't improve the BidIndex Score, they don't power competitive pressure intelligence, and they don't compound into the data moat that the exit thesis depends on.

The follow-up automation feature is the single highest-leverage product change available to move outcome logging rate from ~50% to ~85–90%. It does this by creating mandatory outcome-capture moments within 21 days of every bid submission, embedded inside a workflow the user already has to do (following up with the GC).

### What This Feature Is Not

- This is **not** a marketing automation tool
- This is **not** a generic CRM follow-up engine
- This is **not** a Mailchimp replacement

This is a **bid follow-up workflow with persuasion psychology built in, designed to capture outcome data as a side effect of helping the user do their job better.**

Every design decision should be evaluated against this primary criterion: does this increase the rate at which users tell BidIntell whether a bid was Won / Lost / Ghosted / Declined?

### The Differentiator: Cialdini's Principles Built In

Every other follow-up tool on the market (HubSpot sequences, Mailchimp drips, CRM automation) treats persuasion as a hidden art that the salesperson brings. The software is dumb pipes. The estimator who's a "good closer" gets responses; the one who isn't, doesn't.

This feature encodes Cialdini's seven principles of influence directly into the AI drafting prompt. An introverted estimator who hates writing emails gets responses at the rate of a natural closer because the persuasion is built into the tool itself. This is a moat no generic follow-up tool can match, because they don't have the domain context to know which principle works for which type of GC, project, or trade.

---

## 2. Feature Overview

### User Story (One Sentence)

As a specialty sub estimator, after I submit a bid, I want BidIntell to handle the follow-up cadence with the GC using proven persuasion psychology — sending from my own email so it looks authentic — and prompt me to log the outcome at every touch, so I never forget a follow-up and never have to remember to update the system.

### End-to-End Workflow

1. **Bid is scored** (existing workflow). A follow-up schedule is automatically created with default sequence template applied. Status: `inactive`.
2. **User submits the bid offline** (to the GC via plan room, email, or upload portal). Returns to BidIntell and clicks `Submitted` on the project card.
3. **Sequence activates.** All touches are scheduled relative to `bid_submitted_at` based on the chosen template. Status: `active`.
4. **24 hours before each scheduled touch**, a background job:
   - Pulls full project context, GC history, and the Cialdini principle assigned to this touch
   - Calls Claude API to draft the follow-up email
   - Sends the user a digest email: "Your follow-up to [GC] is ready for review"
   - Sets touch status to `awaiting_approval`
5. **User reviews the draft** in the Follow-Ups tab. Three options:
   - **Approve & Send** — email sends from user's own connected email account (via OAuth)
   - **Edit** — modify before sending
   - **Skip this touch** — moves to next scheduled touch
6. **Before each send**, the user is asked: "Has the GC responded since last contact?"
   - **No, still waiting** → proceeds to send
   - **Yes, we won/lost/got ghosted** → opens outcome modal, cancels remaining touches
7. **When an outcome is logged** (at any point, by any path), all remaining touches in the schedule are cancelled.
8. **If all 3 touches send with no outcome logged**, the system auto-prompts: "Mark this bid as Ghosted?" One click logs the outcome.

### Why Manual Approval Per Touch Is Non-Negotiable

The system **never** sends an email to a GC without explicit user approval on every single touch. This is non-negotiable for three reasons:

1. Construction is a relationship business. One bad email burns trust permanently.
2. The estimator's name is on every email — they need to own each one.
3. Forcing manual approval creates a forced outcome-logging moment before each send, which is the entire point of the feature.

A user who batch-approves 30 follow-ups in one click breaks the model. The UI must require a per-touch review action.

---

## 3. Sequence Templates (User-Configurable)

### Design Principle

Estimators have different rhythms based on trade, GC type, project size, and personal style. A flooring sub working a public bid follows up differently than a private healthcare GC. The system must support user-defined cadence templates while shipping reasonable defaults out of the box.

### System Templates (Ship With These 4)

| Name | Touches | Timing (business days) | Use Case |
|---|---|---|---|
| Standard GC | 3 | Day 3, Day 10, Day 21 | Default for private commercial work |
| Public Bid | 2 | Day 14, Day 30 | Slower cadence for public/government bids |
| Repeat Client | 1 | Day 5 | Light touch for established relationships |
| Aggressive | 4 | Day 2, Day 7, Day 14, Day 28 | High-value or time-sensitive projects |

System templates are read-only and shipped with the system. Users can **clone** any system template and customize the clone. The clone becomes a user template, fully editable.

### Per-Template Configurability

- **Template name** (string, max 60 chars)
- **Number of touches** (1–6 max; beyond 6 is harassment)
- **Day offset per touch** (integer, calculated from `bid_submitted_at`)
- **Business days vs. calendar days** (boolean toggle, applies to entire template)
- **Cialdini principle per touch** (one of 7: reciprocity, commitment, social_proof, liking, authority, scarcity, unity)
- **Optional custom instruction per touch** (free-text override for AI drafting)
- **Default template flag** (one user template can be marked as default)

### Default Template Assignment Logic

When a user marks a bid as Submitted:
1. If the user has set a personal default template → use that
2. Otherwise → use system "Standard GC" template

User can override at the moment of marking Submitted via a dropdown.

---

## 4. Cialdini Principles — Implementation

This is the differentiating capability of this feature. Each of Cialdini's seven principles maps to a specific AI prompt instruction.

### Principle Reference Table

| Principle | Core Idea | Construction Application | Default Touch Position |
|---|---|---|---|
| Reciprocity | People feel obligated to return favors | Offer a scope clarification, related-trade insight, or constructability note **before** any ask | Touch 1 (opening contact) |
| Commitment & Consistency | People honor small commitments to maintain self-consistency | Ask a yes/no question requiring a 5-second factual reply | Touch 1 or 2 (early in cycle) |
| Social Proof | People look to similar others' behavior to guide their own | Reference industry norms or peer behavior (only when data supports it) | Touch 2 (mid-cycle) |
| Liking | We say yes to people we like | Reference specific prior project history or specific detail from this bid | Any touch |
| Authority | People defer to credible experts | Lightly reference relevant tenure or related project experience as offered expertise | Touch 3 (closing contact) |
| Scarcity | People value what's limited | Only invoke real, user-noted constraints (capacity, lead time, pricing window) | Touch 3 (closing contact) |
| Unity | People are influenced by those they identify with as "us" | Frame as fellow construction professionals navigating shared industry pressures | Any touch |

### Default Touch-to-Principle Assignment

For the system "Standard GC" template (3 touches):

| Touch | Day | Primary Principle | Secondary Principle |
|---|---|---|---|
| 1 | Day 3 | Reciprocity | Liking |
| 2 | Day 10 | Commitment | Unity |
| 3 | Day 21 | Authority | Scarcity (if applicable) |

Users can override any of these in their custom templates.

### AI Prompt Instructions Per Principle

The AI drafting function injects a principle-specific instruction block into the Claude API call. Exact text:

**Reciprocity:**
> "This email must offer something useful to the GC before any check-in on status. Reference a specific scope detail from the bid documents and provide a clarification, related-trade insight, or constructability note. The 'give' must come before any ask."

**Commitment:**
> "End the email with a yes/no question that requires only a 5-second reply confirming a fact the GC has already stated or implied. Examples: 'Could you confirm you have our number on the tab?' or 'Are we still on track for award by [the date the GC themselves stated]?' The micro-commitment makes follow-through more likely."

**Social Proof:**
> "Reference industry norms or peer behavior in a non-pressuring way. Do not invent statistics. Examples: 'Most of the subs we work with respond on award decisions within 14 days — wanted to check if your timeline differs.' Only use this principle if there is a credible, true reference point."

**Liking:**
> "If there is prior project history with this GC, reference one specific detail (a project name, a scope decision, a notable interaction). If there is no prior history, reference one specific detail from the current bid package that shows you read it carefully (a scope nuance, a spec section, a constructability question)."

**Authority:**
> "If the user has 10+ years of relevant tenure or has worked on similar project types, lightly reference it as offered expertise — not credentials. Examples: 'We installed the same operable partition system on [Similar Project] — happy to share lessons learned if it helps your scope review.' Never sound boastful."

**Scarcity:**
> "Only use scarcity framing if the user has explicitly noted a real constraint (capacity limit, material lead time, pricing window). Never manufacture urgency. If no real scarcity exists, do not invoke this principle even if assigned — fall back to authority or unity."

**Unity:**
> "Frame the relationship as fellow construction professionals navigating shared industry pressures, not vendor-to-buyer. Examples: 'I know how hard it is right now to chase down award decisions while running 6 active projects — happy to wait if you need another week.' This activates in-group identification."

### Hard Constraints (Always Apply)

Regardless of principle, every AI draft must:

- Never use exclamation points
- Never use phrases: "just checking in," "circle back," "touch base," "any update?," "circling back"
- Never apologize for following up
- Never sound eager or desperate
- Sign with the user's first name only
- Word count target: Touch 1 = 60 words; Touch 2 = 80 words; Touch 3 = 60 words
- Stay in the "Confidently Boring" brand voice — plain estimator language, no startup tone

---

## 5. Email Sending Architecture — OAuth Integration

### Why OAuth, Not noreply@bidintell.ai

A follow-up email from `noreply@bidintell.ai` to a GC project manager looks like spam, vendor blast, or automated tool — even if the content is excellent. The GC's first reaction is annoyance. Deliverability tanks. The feature fails to capture outcome data because the emails don't get read.

A follow-up from `ryan@subcompany.com` (the user's actual email) lands in the GC's normal inbox, looks authentic, maintains relationship trust, and gets responded to at order-of-magnitude higher rates.

**This is non-negotiable.** The feature requires OAuth-based sending from the user's own email account to function. There is no acceptable fallback to `noreply@bidintell.ai`.

### Supported Providers (v1 Launch)

1. **Google Workspace / Gmail** — covers approximately 60% of small contractors
2. **Microsoft 365 / Outlook** — covers approximately 30% of small contractors

Combined coverage: ~90% of the ICP. Users on other providers will be told the feature requires Google or Microsoft and will be added to a waitlist for additional provider support in v2.

### Google App Verification (Critical Path Item)

The `gmail.send` scope is classified by Google as a **restricted scope**. Production use requires going through Google's OAuth verification process, which includes:

- Privacy policy describing exactly what data is accessed
- Demo video showing the consent flow
- Justification for why this scope is necessary
- Security assessment for restricted scopes

**Timeline: 4–6 weeks.** This must start in parallel with the build, not after. Begin the verification process the same week the build kicks off.

Microsoft 365 has an equivalent verified-publisher process. Timeline is typically 2–3 weeks. Same parallel-track approach.

### OAuth Flow Architecture

**Google Workspace flow:**

1. User clicks "Connect Gmail" in Settings → Email Integration
2. Browser redirects to Google consent screen with required scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
3. User consents; Google redirects to BidIntell callback URL with authorization code
4. Backend exchanges code for `access_token` + `refresh_token`
5. Tokens are encrypted at rest and stored in `user_email_integrations` table
6. User sees confirmation: "Connected: ryan@subcompany.com"

**Per-send flow:**

1. User clicks "Approve & Send" on a follow-up draft
2. Backend reads user's `user_email_integrations` record
3. Decrypts refresh token
4. Requests fresh access token from Google OAuth endpoint
5. Builds RFC 822 message with `From:` set to user's connected email
6. POSTs to Gmail API: `/gmail/v1/users/me/messages/send`
7. On success: updates touch status to `sent`, records `sent_at`
8. On failure (token revoked, account disconnected, rate limit):
   - Marks integration `is_active = false`
   - Notifies user: "Reconnect your Gmail to continue sending follow-ups"

**Microsoft 365 flow:** Architecturally identical. Different API endpoint (`Microsoft Graph API: /users/me/sendMail`), different scope (`Mail.Send`), different OAuth provider (Microsoft Identity Platform).

### Token Security

Tokens must be encrypted at rest using Supabase Vault or a Netlify-managed encryption key. Refresh tokens never leave the backend — only access tokens are used per-send. Connection state is checked before every send; expired tokens trigger silent refresh; failed refreshes trigger reconnection notification to user.

**Never log tokens.** Never include them in error messages. Never include them in analytics.

### Sent Folder Behavior

When BidIntell sends through the user's Gmail/M365 account, the email appears in the user's own Sent folder. This is intentional and desirable — the user has a record of every follow-up that went out, and they can search their own Sent folder for context on any thread.

---

## 6. Database Schema Additions

### New Tables

**`follow_up_sequence_templates`**

```sql
CREATE TABLE follow_up_sequence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
    -- NULL for system templates; user_id for user-created templates
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
    -- Only one user template can be is_default = true per user
  is_system_template BOOLEAN DEFAULT false,
    -- System templates are read-only and visible to all users
  use_business_days BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) <= 60)
);

CREATE INDEX idx_seq_templates_user ON follow_up_sequence_templates(user_id);
CREATE INDEX idx_seq_templates_default ON follow_up_sequence_templates(user_id, is_default)
  WHERE is_default = true;

ALTER TABLE follow_up_sequence_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY seq_templates_user_isolation ON follow_up_sequence_templates
  FOR ALL
  USING (user_id = auth.uid() OR is_system_template = true);
```

**`follow_up_sequence_steps`**

```sql
CREATE TABLE follow_up_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES follow_up_sequence_templates(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  days_offset INTEGER NOT NULL,
    -- Offset from bid_submitted_at; business days or calendar days per template setting
  primary_principle TEXT NOT NULL DEFAULT 'reciprocity',
    -- One of: reciprocity, commitment, social_proof, liking, authority, scarcity, unity
  secondary_principle TEXT,
    -- Optional secondary principle to layer
  custom_instruction TEXT,
    -- Optional free-text override for AI drafting
  word_count_target INTEGER DEFAULT 70,
  CONSTRAINT step_number_range CHECK (step_number BETWEEN 1 AND 6),
  CONSTRAINT days_offset_positive CHECK (days_offset > 0),
  CONSTRAINT principle_valid CHECK (
    primary_principle IN (
      'reciprocity', 'commitment', 'social_proof',
      'liking', 'authority', 'scarcity', 'unity'
    )
  )
);

CREATE INDEX idx_seq_steps_template ON follow_up_sequence_steps(template_id, step_number);

ALTER TABLE follow_up_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY seq_steps_via_template ON follow_up_sequence_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM follow_up_sequence_templates t
      WHERE t.id = template_id
        AND (t.user_id = auth.uid() OR t.is_system_template = true)
    )
  );
```

**`follow_up_schedules`**

```sql
CREATE TABLE follow_up_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id UUID NOT NULL REFERENCES follow_up_sequence_templates(id),
  bid_submitted_at TIMESTAMPTZ,
    -- NULL until user marks bid Submitted; activates the cadence
  status TEXT NOT NULL DEFAULT 'inactive',
    -- Values: inactive, active, completed, cancelled
  cancelled_reason TEXT,
    -- Values: outcome_logged, user_cancelled, all_touches_sent, integration_failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT status_valid CHECK (
    status IN ('inactive', 'active', 'completed', 'cancelled')
  )
);

CREATE INDEX idx_schedules_project ON follow_up_schedules(project_id);
CREATE INDEX idx_schedules_user_status ON follow_up_schedules(user_id, status);

ALTER TABLE follow_up_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedules_user_isolation ON follow_up_schedules
  FOR ALL USING (user_id = auth.uid());
```

**`follow_up_touches`**

```sql
CREATE TABLE follow_up_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES follow_up_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  touch_number INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- Values: pending, awaiting_approval, approved, sent, skipped, cancelled, failed
  primary_principle TEXT NOT NULL,
  secondary_principle TEXT,
  draft_subject TEXT,
  draft_body TEXT,
  draft_reasoning TEXT,
    -- AI's one-sentence explanation of how the email applies the principle (for QA only)
  user_edited_subject TEXT,
  user_edited_body TEXT,
    -- If user modified the draft before sending
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  send_error TEXT,
    -- If status = 'failed', what went wrong (without sensitive token data)
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT status_valid CHECK (
    status IN ('pending', 'awaiting_approval', 'approved', 'sent', 'skipped', 'cancelled', 'failed')
  ),
  CONSTRAINT touch_number_range CHECK (touch_number BETWEEN 1 AND 6)
);

CREATE INDEX idx_touches_schedule ON follow_up_touches(schedule_id, touch_number);
CREATE INDEX idx_touches_status_scheduled ON follow_up_touches(status, scheduled_at);
CREATE INDEX idx_touches_user_status ON follow_up_touches(user_id, status);

ALTER TABLE follow_up_touches ENABLE ROW LEVEL SECURITY;

CREATE POLICY touches_user_isolation ON follow_up_touches
  FOR ALL USING (user_id = auth.uid());
```

**`user_email_integrations`**

```sql
CREATE TABLE user_email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    -- One integration per user; reconnecting replaces the existing row
  provider TEXT NOT NULL,
    -- Values: google, microsoft
  email_address TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes_granted TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  last_send_at TIMESTAMPTZ,
  total_sends INTEGER DEFAULT 0,
  CONSTRAINT provider_valid CHECK (provider IN ('google', 'microsoft'))
);

CREATE INDEX idx_email_integrations_user ON user_email_integrations(user_id);

ALTER TABLE user_email_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_integrations_user_isolation ON user_email_integrations
  FOR ALL USING (user_id = auth.uid());
```

### Additions to Existing Tables

**`projects` table additions:**

```sql
ALTER TABLE projects ADD COLUMN bid_submitted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN gc_contact_email TEXT;
ALTER TABLE projects ADD COLUMN gc_contact_name TEXT;
ALTER TABLE projects ADD COLUMN follow_up_schedule_id UUID REFERENCES follow_up_schedules(id);
```

These fields are populated when the user marks a bid as Submitted. The `gc_contact_email` is required to activate a schedule.

### System Template Seeding

System templates are inserted via migration at deployment time, not via the application. They are owned by no user (`user_id = NULL`) and have `is_system_template = true`.

```sql
-- Insert system templates with their steps
-- See migration file: migrations/2026_05_follow_up_system_templates.sql
INSERT INTO follow_up_sequence_templates (id, user_id, name, description, is_system_template, use_business_days)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Standard GC',
   'Default 3-touch cadence for private commercial work', true, true),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Public Bid',
   'Slower 2-touch cadence for public and government bids', true, true),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Repeat Client',
   'Single light-touch follow-up for established relationships', true, true),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Aggressive',
   '4-touch cadence for high-value or time-sensitive projects', true, true);

-- Standard GC steps
INSERT INTO follow_up_sequence_steps (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 3, 'reciprocity', 'liking', 60),
  ('00000000-0000-0000-0000-000000000001', 2, 10, 'commitment', 'unity', 80),
  ('00000000-0000-0000-0000-000000000001', 3, 21, 'authority', 'scarcity', 60);

-- Public Bid steps
INSERT INTO follow_up_sequence_steps (template_id, step_number, days_offset, primary_principle, word_count_target) VALUES
  ('00000000-0000-0000-0000-000000000002', 1, 14, 'reciprocity', 70),
  ('00000000-0000-0000-0000-000000000002', 2, 30, 'authority', 60);

-- Repeat Client steps
INSERT INTO follow_up_sequence_steps (template_id, step_number, days_offset, primary_principle, secondary_principle, word_count_target) VALUES
  ('00000000-0000-0000-0000-000000000003', 1, 5, 'liking', 'unity', 50);

-- Aggressive steps
INSERT INTO follow_up_sequence_steps (template_id, step_number, days_offset, primary_principle, word_count_target) VALUES
  ('00000000-0000-0000-0000-000000000004', 1, 2, 'reciprocity', 60),
  ('00000000-0000-0000-0000-000000000004', 2, 7, 'commitment', 70),
  ('00000000-0000-0000-0000-000000000004', 3, 14, 'social_proof', 70),
  ('00000000-0000-0000-0000-000000000004', 4, 28, 'authority', 60);
```

---

## 7. Netlify Functions Required

All functions live in `netlify/functions/` per existing project convention.

### `generate-followup-drafts.js`

**Type:** Scheduled function (daily cron)
**Schedule:** 6:00 AM Central daily
**Purpose:** Draft AI follow-up emails for any touches due within 24 hours

```javascript
// Pseudocode
async function handler() {
  // 1. Query touches that need drafting
  const dueTouches = await supabase
    .from('follow_up_touches')
    .select(`
      *,
      schedule:follow_up_schedules(
        *,
        project:projects(*),
        template:follow_up_sequence_templates(*)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date(Date.now() + 24 * 60 * 60 * 1000));

  // 2. For each touch, build context and generate draft
  for (const touch of dueTouches) {
    const context = await buildDraftContext(touch);
    const draft = await generateDraft(context);

    await supabase
      .from('follow_up_touches')
      .update({
        draft_subject: draft.subject,
        draft_body: draft.body,
        draft_reasoning: draft.reasoning,
        status: 'awaiting_approval',
      })
      .eq('id', touch.id);
  }

  // 3. Send digest email to users with pending approvals
  await sendDailyDigests();
}
```

### `generate-draft-context.js` (helper, not standalone function)

Builds the full context object passed to Claude API. Fields included:
- User info (name, company, trade)
- Project info (name, address, due date, BidIndex score, scope summary)
- GC info (name, contact, prior project history)
- Touch info (number, total, principle, prior touch history with responses if any)
- Sequence template info (name, custom instructions)

### `claude-draft-followup.js`

**Type:** Helper module
**Purpose:** Single point of integration with Claude API for draft generation

```javascript
async function generateDraft(context) {
  const prompt = buildPrompt(context);
  // Use existing Claude API integration pattern from analyze.js

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  return parseJSONResponse(response);
}
```

The prompt template is exhaustively specified in Section 4 above. Build a single function that assembles the prompt from the context object, injects the principle-specific instructions, and returns the JSON-parsed result.

### `send-followup-email.js`

**Type:** User-triggered endpoint (called from app.html)
**Purpose:** Send an approved follow-up via user's connected email account

```javascript
async function handler(event) {
  const { touchId, finalSubject, finalBody } = JSON.parse(event.body);

  // 1. Verify touch belongs to authenticated user
  const touch = await getTouchById(touchId, userId);
  if (!touch || touch.status !== 'awaiting_approval') {
    return { statusCode: 400, body: 'Invalid touch state' };
  }

  // 2. Get user's email integration
  const integration = await getEmailIntegration(userId);
  if (!integration || !integration.is_active) {
    return { statusCode: 400, body: 'No active email integration' };
  }

  // 3. Refresh access token if needed
  const accessToken = await getValidAccessToken(integration);

  // 4. Send via provider
  let result;
  if (integration.provider === 'google') {
    result = await sendViaGmail(accessToken, {
      from: integration.email_address,
      to: touch.recipient_email,
      subject: finalSubject || touch.draft_subject,
      body: finalBody || touch.draft_body,
    });
  } else if (integration.provider === 'microsoft') {
    result = await sendViaMicrosoft(accessToken, { /* same args */ });
  }

  // 5. Update touch status
  await supabase
    .from('follow_up_touches')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      user_edited_subject: finalSubject || null,
      user_edited_body: finalBody || null,
    })
    .eq('id', touchId);

  // 6. Track in user_email_integrations counters
  await incrementSendCounter(integration.id);

  return { statusCode: 200, body: JSON.stringify(result) };
}
```

### `cancel-followup-schedule.js`

**Type:** Triggered by outcome logging (called from app.html when user logs Won/Lost/Ghosted/Declined)
**Purpose:** Cancel all remaining touches when outcome is recorded

```javascript
async function cancelSchedule(projectId, reason) {
  // Find active schedule for this project
  const schedule = await supabase
    .from('follow_up_schedules')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle();

  if (!schedule) return; // No active schedule

  // Cancel all pending/awaiting_approval touches
  await supabase
    .from('follow_up_touches')
    .update({ status: 'cancelled' })
    .eq('schedule_id', schedule.id)
    .in('status', ['pending', 'awaiting_approval']);

  // Mark schedule complete
  await supabase
    .from('follow_up_schedules')
    .update({
      status: 'completed',
      cancelled_reason: reason, // 'outcome_logged' typically
    })
    .eq('id', schedule.id);
}
```

### `prompt-ghost-outcome.js`

**Type:** Scheduled function (daily cron)
**Schedule:** 7:00 AM Central daily
**Purpose:** After Touch 3 sends with no outcome logged, prompt user to mark as Ghosted

```javascript
async function handler() {
  // Find schedules where the last touch sent more than 7 days ago, no outcome logged
  const candidates = await findGhostCandidates();

  for (const schedule of candidates) {
    await sendGhostPromptEmail(schedule);
    // Email contains one-click link: "Mark [Project] as Ghosted"
  }
}
```

### `google-oauth-callback.js` and `microsoft-oauth-callback.js`

**Type:** OAuth redirect endpoints
**Purpose:** Handle the OAuth code-for-token exchange after user grants consent

Standard OAuth 2.0 implementation. Reference the existing Supabase auth pattern in `auth.html` for token handling conventions. Encrypt tokens before storing.

### `refresh-oauth-token.js`

**Type:** Helper module
**Purpose:** Refresh expired access tokens transparently

```javascript
async function getValidAccessToken(integration) {
  const now = Date.now();
  const expiresAt = new Date(integration.token_expires_at).getTime();

  if (now < expiresAt - 60000) {
    // Token still valid (with 60s buffer)
    return decryptToken(integration.access_token_encrypted);
  }

  // Refresh
  const refreshToken = decryptToken(integration.refresh_token_encrypted);
  const newTokens = await callProviderRefresh(integration.provider, refreshToken);

  // Update DB
  await supabase
    .from('user_email_integrations')
    .update({
      access_token_encrypted: encryptToken(newTokens.access_token),
      token_expires_at: new Date(now + newTokens.expires_in * 1000).toISOString(),
    })
    .eq('id', integration.id);

  return newTokens.access_token;
}
```

---

## 8. UI Components in `app.html`

### New UI Element: Submitted Button on Project Card

Every project card in the Projects tab gets a new action button. State machine:

| Project State | Button Display |
|---|---|
| Pending (just scored) | `[Mark as Submitted]` |
| Submitted, no touches sent | `Submitted • Touch 1 scheduled for [date]` |
| Submitted, touches in progress | `Submitted • [N] of [M] touches sent` |
| Outcome logged | (button hidden; outcome badge shows) |

Clicking `Mark as Submitted` opens a modal:
- **GC contact name** (text input; pre-fills from `clients` table if available)
- **GC contact email** (email input; required)
- **Sequence template** (dropdown; defaults to user's default template)
- **Submit button** → activates the schedule

### New UI Element: Follow-Up Status Badge

Below the project card title, a status badge:

- `Touch 1 awaiting your review` (orange) — touch in `awaiting_approval` state, action required
- `Touch 2 scheduled for May 28` (gray) — touch in `pending` state, no action needed yet
- `Cadence complete — log outcome?` (amber) — all touches sent, no outcome yet
- `Cadence cancelled — outcome logged` (green) — schedule completed normally

### New Nav Tab: Follow-Ups

A new top-level navigation tab in `app.html`, positioned between `Projects` and `Clients`.

The Follow-Ups tab has three views, toggled via sub-tabs:

**1. Needs Review** (default view)
- Lists all touches with `status = 'awaiting_approval'`
- Sorted by scheduled_at ascending (oldest first)
- Each row shows: project name, GC name, touch number, scheduled send date, principle being applied
- Clicking a row opens the Approval Modal

**2. Scheduled**
- Lists all touches with `status = 'pending'`
- Calendar view + list view toggle
- Read-only at the list level; clicking a row opens the project

**3. History**
- Lists all touches with `status IN ('sent', 'skipped', 'cancelled')`
- Filterable by date range, project, GC
- Shows final email body for sent touches (collapsible)

### New Modal: Approval Modal

Triggered by clicking a row in "Needs Review" or by clicking the status badge on a project card.

Modal contents (vertically stacked):

1. **Context header**: Project name, GC name, touch number ("Touch 2 of 3"), scheduled send date
2. **Principle banner**: "This touch applies Commitment & Consistency — the goal is a 5-second yes/no reply"
3. **Subject line** (editable text input)
4. **Email body** (editable textarea, prefilled with draft, 12+ rows tall)
5. **Pre-send prompt**: "Has the GC responded since last contact?"
   - `No, still waiting` (default selection)
   - `Yes, we won` → opens outcome modal (Won)
   - `Yes, we lost` → opens outcome modal (Lost)
   - `Yes, but no decision yet` → proceeds to send
6. **Action buttons**:
   - `Send` (primary, orange) — sends via user's connected email
   - `Save Draft` (secondary) — saves edits without sending; touch stays in `awaiting_approval`
   - `Skip This Touch` — sets touch to `skipped`, moves to next
   - `Cancel All Follow-Ups for This Bid` — sets schedule to `cancelled`

### New Settings Page: Email Integration

In Settings, new section: **Email Integration**

- If not connected: large CTA button `Connect Gmail` or `Connect Microsoft 365`, with explainer copy: "BidIntell sends follow-ups from your own email so they look authentic to the GC. We use industry-standard OAuth — your password is never shared with BidIntell."
- If connected: shows connected email address, last send date, total sends, `Disconnect` button
- Below: list of system + user templates, with edit/clone/delete actions

### New Settings Page: Follow-Up Sequence Templates

In Settings → Follow-Up Sequences:

- List of system templates (read-only, with `Clone` button)
- List of user templates (editable, with `Edit` / `Delete` / `Set as Default` buttons)
- `Create New Template` button → opens template editor

Template editor form:
- Template name (text input)
- Description (optional textarea)
- Business days toggle
- Step list (drag-to-reorder):
  - Step number (auto-numbered)
  - Days offset (number input)
  - Primary principle (dropdown)
  - Secondary principle (optional dropdown)
  - Custom instruction (optional textarea)
  - Word count target (number input)
- Save / Cancel buttons

---

## 9. Onboarding Flow For Existing Users

When the feature ships, existing users see a one-time modal on next login:

> **New: BidIntell now handles your bid follow-ups.**
>
> After you submit a bid, BidIntell drafts follow-up emails using proven persuasion psychology — and sends them from your own email so they look authentic.
>
> You approve every send. Every touch helps you stay top-of-mind and prompts you to log the outcome, so the BidIndex Score gets smarter for your business.
>
> [Watch 90-second demo] [Connect my email] [Maybe later]

- New users (signed up post-launch): feature is **on by default**; they're prompted to connect email in onboarding flow
- Existing users (signed up pre-launch): **opt-in** for the first 30 days, then feature becomes default-on with an opt-out option in Settings

---

## 10. Build Sequence (10 Weeks)

The build is structured to ship value early and de-risk dependencies in order.

### Week 1: Schema & Migrations
- Create all new tables (`follow_up_sequence_templates`, `follow_up_sequence_steps`, `follow_up_schedules`, `follow_up_touches`, `user_email_integrations`)
- Add columns to `projects` table
- Seed 4 system templates via migration
- Update SCHEMA.md to v2.1
- **Commit checkpoint:** schema deployed, validated, RLS tested

### Week 2: Sequence Templates UI
- Settings → Follow-Up Sequences page
- List system templates, allow cloning to user templates
- Template editor form
- Save/Edit/Delete user templates
- Set-as-default functionality
- **Commit checkpoint:** users can create custom sequence templates

### Week 3: Submitted Flow & Schedule Activation
- Add `Mark as Submitted` button to project card
- Submission modal (GC contact, template picker)
- Activate schedule: create `follow_up_schedules` row, generate `follow_up_touches` rows with correct scheduled_at
- Cancel logic when outcome is logged
- Follow-up status badges on project cards
- **Commit checkpoint:** schedules activate correctly, dates compute right with business-day logic

### Week 4: Google OAuth Integration
- `Connect Gmail` button in Settings → Email Integration
- `google-oauth-callback.js` endpoint
- Token encryption / decryption helpers
- Token refresh helper
- Disconnect flow
- **Commit checkpoint:** users can connect Gmail and we have valid refresh tokens stored encrypted
- **Parallel:** Begin Google OAuth verification submission

### Week 5: Microsoft 365 OAuth Integration
- `Connect Microsoft 365` button
- `microsoft-oauth-callback.js` endpoint
- Reuse token encryption / refresh patterns
- **Commit checkpoint:** users can connect M365
- **Parallel:** Begin Microsoft verification submission

### Week 6: AI Draft Generation
- `claude-draft-followup.js` helper module
- Prompt template assembly
- Principle-specific instruction injection
- `generate-followup-drafts.js` scheduled function (daily 6am)
- Test all 7 principles on real bid data
- **Commit checkpoint:** drafts generate correctly for all principles, brand voice intact

### Week 7: Approval & Send Flow
- Follow-Ups tab in main nav (Needs Review / Scheduled / History views)
- Approval modal
- `send-followup-email.js` endpoint (Google + Microsoft branches)
- Send error handling and retry logic
- **Commit checkpoint:** end-to-end send works through user's connected email

### Week 8: Outcome Capture Integration
- Pre-send "Has the GC responded?" prompt
- Outcome modal integration (uses existing modal)
- `cancel-followup-schedule.js` logic
- `prompt-ghost-outcome.js` scheduled function (daily 7am)
- **Commit checkpoint:** outcome logging rate measurable; entire feature loop closes

### Week 9: Onboarding & Polish
- One-time modal for existing users
- New-user onboarding step: Connect Email
- 90-second demo video (record once feature is stable)
- Settings page polish
- Error states, empty states, loading states
- **Commit checkpoint:** ready for soft launch

### Week 10: Soft Launch & Iteration
- Enable for 5–10 trusted beta users first
- Monitor send success rate, outcome logging rate change, user feedback
- Fix issues
- Default-on rollout to all users at end of week

---

## 11. Pricing Implications

**Status:** Locked May 20, 2026. Do not change without explicit founder approval.

### Tier Limits

**Solo ($49/mo)**
- Email integration: ✓ (Gmail + M365 OAuth)
- Active schedules per month: 15
- Custom sequence templates: clone-only, max 1 user template
- System templates: all 4 available

**Team ($99/mo)**
- Email integration: ✓
- Active schedules per month: unlimited
- Custom sequence templates: unlimited
- System templates: all 4 available

**Company ($179/mo)**
- All Team features
- Plus shared team templates (Phase 2 feature — schema-ready but not enforced in v1)

### Founding Member Override

Users with `FOUNDING30` or `FOUNDER30` coupon applied to their subscription:
- Unlimited schedules regardless of tier (override the 15 cap on Solo)
- Custom template limits still apply by tier (Solo founding members = clone-only, max 1)
- **This applies forever** — not a trial. It's a permanent grandfather right.

### Schedule Counting Rules

- A "schedule" counts toward the monthly cap on the date it activates (when user marks bid as Submitted)
- Cancellations do not refund the count
- Existing active schedules continue running even if user hits cap
- Cap resets on the 1st of each calendar month
- Schedules created in a free trial period count if the user converts; reset on first paid month

### UX Banners (Solo Users Only)

At 13 of 15 schedules used:
> "You've activated 13 of your 15 follow-up schedules this month. Team plans get unlimited — upgrade anytime."

At 15 of 15:
> "You've used all 15 follow-up schedules for this month. New schedules will activate June 1, or upgrade to Team for unlimited. Your existing schedules continue running normally."

### What Is NOT Gated

- All 7 Cialdini principles available on every tier
- AI draft generation is unlimited on every tier (no draft caps)
- Manual approval flow is universal (safety feature, not premium)
- All 4 system sequence templates available on every tier

### Implementation Notes

- Schedule cap enforcement lives in the `activate-schedule` function, **not the UI** (UI is a hint, server is the truth)
- Founding member detection: check Stripe subscription for coupon ID matching `FOUNDING30` or `FOUNDER30` — cache result on user record to avoid Stripe API calls on every schedule activation
- If a founding member's subscription lapses and they re-subscribe without the coupon, they lose grandfather status (this is correct behavior — communicate it clearly in any cancellation flow)

---

## 12. Critical Technical Rules

From `CLAUDE.md`, apply throughout:

- Never commit secrets to git — all API keys (Google OAuth client secret, Microsoft client secret, token encryption key) in Netlify env vars
- Always `git commit` before AND after changes
- Fix one thing at a time — do not refactor while debugging
- Tab detection: use `classList.contains('active')` — not `style.display`
- Supabase optional records: `maybeSingle()` not `single()`
- Never write to `user_revenue` from `app.html` — only `stripe-webhook.js` (unchanged from existing rule)
- New rule: **Never log OAuth tokens.** Never include them in error messages. Never include them in analytics. Scrub from any debug output.
- New rule: **All token storage encrypted at rest.** Use a single encryption key from Netlify env var, AES-256-GCM.

---

## 13. Operational Risks & Mitigations

### Risk: Build Time Sprawl

The spec above is 10 weeks of focused work. If feature creep takes hold (advanced template builder, drag-and-drop calendar, per-contact custom signatures, multi-account email, in-thread conversation tracking) it becomes 20 weeks. **Ship the minimum viable version exactly as specced.** Polish in v1.1.

### Risk: Google OAuth Verification Delay

Verification can take 4–6 weeks. If it slips to 8 weeks, the launch is gated. Mitigation: start verification submission in week 1 of the build, not week 9. Use Google's test mode during development (limited to 100 test users) to validate the flow without waiting for verification.

### Risk: GC Backlash from Automated-Feeling Emails

Even with Cialdini principles and AI drafting, a poorly tuned prompt produces robotic output. Mitigation: extensive QA in week 6, with Ryan reading 20–30 drafts and scoring them on "would I send this?" before any drafts go to real GCs.

### Risk: Rate Limit / Spam Flag from Email Providers

If a user approves 30 follow-ups in one session, Gmail/M365 may rate-limit or flag the account. Mitigation: build a per-user rate limit (max 10 sends per hour) in `send-followup-email.js`. If exceeded, queue remaining sends and process over time.

### Risk: User Edits Draft Into Something Worse

A user can edit the AI draft into anything before sending. Mitigation: this is acceptable — the user is the author of record. The only safeguard is the "Confidently Boring" tone of the original draft setting a good baseline. No edit-time validation needed in v1.

### Risk: Outcome Logging Rate Doesn't Move

If the feature ships but outcome logging stays at ~55%, the strategic premise is wrong. Mitigation: measure baseline outcome logging rate over the 30 days before launch (current ~50%). After 60 days post-launch, compare. Target: 80%+. If not hit, investigate why — most likely cause would be users skipping touches rather than approving them.

---

## 14. Marketing Positioning (Post-Launch)

This feature unlocks a new homepage hero and a clean sales pitch. Reference for content updates after launch:

**Homepage hero candidate:**

> Score your bids. Send your follow-ups. Win more work.
>
> BidIntell scores every bid 0–100, then drafts follow-ups using proven persuasion psychology — and sends them from your own email so they look exactly like you wrote them. Your response rate goes up. Your outcome data improves automatically. You stop forgetting follow-ups.

**One-line sales pitch:**

> Most subs sweat over follow-up emails. We write them for you using proven persuasion psychology, in your voice, and send from your own email so they don't get filtered as spam. Your response rate goes up. You don't think about follow-ups again.

**Demo flow update:**

The diagnostic call demo now includes a follow-up demo segment. After scoring a bid live, show the follow-up sequence editor, then show a generated draft for Touch 1. This is the moment that converts skeptical owner-operators.

---

## 15. Success Metrics (Post-Launch)

Track these in admin dashboard and weekly scorecard:

| Metric | Baseline | Target (60 days post-launch) |
|---|---|---|
| Outcome logging rate (30-day) | ~50% | ≥80% |
| Schedules activated per active user per month | N/A | ≥3 |
| Send success rate (sends that reach GC) | N/A | ≥95% |
| Touch approval rate (touches sent vs. skipped) | N/A | ≥70% |
| GC response rate per touch | N/A | Touch 1: 25%, Touch 2: 35%, Touch 3: 20% |
| Email integration connect rate (% of users) | N/A | ≥70% within 14 days of signup |
| Solo → Team upgrade rate post-feature | Current baseline | +30% improvement |

If outcome logging rate doesn't move from ~50% to ≥75% within 60 days, the feature has failed its strategic purpose and the design needs revisiting. This is the only metric that matters in the strategic sense.

---

## 16. What This Replaces / Updates in Project Docs

After this feature ships, update the following documents:

- `BidIntell_Product_Bible_v1_9.md` → v2.0
  - Move "Automated follow-ups" from Phase 2 to Phase 1.5 (Shipped)
  - Add Cialdini-principle drafting as a core feature
  - Update outcome logging architecture
- `SCHEMA.md` → v2.1
  - Document new tables: `follow_up_sequence_templates`, `follow_up_sequence_steps`, `follow_up_schedules`, `follow_up_touches`, `user_email_integrations`
  - Document new columns on `projects`
- `ARCHITECTURE.md` → v2.1
  - Document new Netlify Functions
  - Document OAuth flow architecture
  - Document encryption approach for tokens
- `CLAUDE.md` → add the two new technical rules about OAuth tokens
- `MEMORY.md` → log two decisions: (1) pulling this feature forward from Phase 2, (2) sequencing follow-up automation BEFORE completing the BuildingConnected API integration despite BC being partially built

---

## 17. Open Questions to Resolve Before Build Kicks Off

1. **Confirm pricing gating.** Is email integration Team-and-up, or available to Solo? Confirm what was promised to founding Solo members.

2. **Sample real follow-up email from Ryan.** To calibrate the AI tone to Ryan's actual voice, provide 1–3 real follow-up emails sent to GCs in the past. The Cialdini prompts are theoretical until grounded in real construction-veteran cadence.

3. **Decision on OAuth verification timeline.** Confirm the build kicks off the same week the Google verification submission is filed. If verification slips past week 8, what's the contingency?

4. **Decision on per-user send rate limit.** Default proposal: 10 sends per hour per user. Confirm or adjust.

5. **Decision on touch limit.** Default proposal: max 6 touches per sequence. Confirm or adjust.

6. **Decision on default-on rollout for existing users.** Default proposal: opt-in for 30 days, then default-on with opt-out option. Confirm or adjust.

---

## End of Spec

This document is the source of truth for the follow-up automation build. If any part of the build deviates from this spec, document the deviation in `MEMORY.md` with the reason for the change.

When the build is complete and the feature ships, archive this document as `BidIntell_FollowUp_Automation_Build_Spec_v1_SHIPPED.md` and note the actual ship date.
