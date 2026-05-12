# DIAGNOSTIC PREP AGENT — ARCHITECTURE & SETUP

**Purpose:** Automate the prep workflow when a prospect books a diagnostic. Webhook fires from Calendly → Netlify function runs → company research, tailored script, Drive folder, tracking row, email summary to Ryan.

**Stack:** Netlify Functions (Node.js), Claude API (Anthropic SDK), Google Drive API, Google Sheets API, web_search via Claude tool use, Postmark for email notification.

**Cost:** ~$0.10 per diagnostic prep run (Claude API + minor). All other infra is free tier.

---

## END-TO-END FLOW

```
1. Prospect books via Calendly (bidintell.ai/diagnostic page)
        │
        ├─→ Calendly form captures: name, email, company, role, trade,
        │   revenue band, "what are you hoping to get out of this"
        │
        ▼
2. Calendly webhook fires → /.netlify/functions/diagnostic-prep
        │
        ▼
3. Function runs (parallel where possible):
   a. Web search: "[Company] [Trade] [Geography]"
   b. Web search: company website + recent project signals
   c. LinkedIn URL guess + enrich (via web search, not API)
   d. Claude API call: synthesize research → company brief
   e. Claude API call: tailor 5-question call script to this prospect
   f. Google Drive API: create folder /BidIntell/Diagnostics/Prospects/[ID]_[Name]/
   g. Google Drive API: drop intake form, brief, and tailored script as files
   h. Google Sheets API: append new row to tracking sheet (Prospects tab)
   i. Postmark: send Ryan a "new diagnostic booked" summary email with
      links to the Drive folder and the tailored script
        │
        ▼
4. Ryan gets email ~2-3 minutes after prospect books
   - Opens Drive folder before the call
   - Reviews company brief + tailored script
   - Runs the call with Granola recording
        │
        ▼
5. After the call (manual): Ryan drops Granola transcript into Drive folder.
   Phase 2 enhancement: a second function watches the folder and auto-runs
   memo generation. For now, manual via the diagnostic project in Claude.
```

---

## WHY THIS ARCHITECTURE

**Netlify Functions** — already where analyze.js, notify.js, stripe-webhook.js live. Same auth, same env vars, same deploy pipeline. Adding diagnostic-prep.js is consistent with the rest of bidintell.ai.

**Claude API for research synthesis** — you already have ANTHROPIC_API_KEY in env. Claude with web_search tool can do company research in one call rather than orchestrating 4 separate searches. Output is a structured brief, not raw search results.

**Google Drive + Sheets API** — service account credentials, single one-time setup. Avoids needing a database for prep artifacts. Drive search and share-links work natively.

**Postmark for the founder email** — already configured for hello@bidintell.ai. Same template engine as your magic links and ROI breakdown emails.

**No external tools (Make/Zapier)** — keeps everything debuggable in your existing codebase. No third-party monthly fees. No vendor that can deprecate the integration on you.

---

## ENV VARS NEEDED IN NETLIFY

```
ANTHROPIC_API_KEY              # already exists
POSTMARK_API_KEY               # already exists
GOOGLE_SERVICE_ACCOUNT_KEY     # NEW — JSON key file contents (base64)
GOOGLE_DRIVE_PARENT_FOLDER_ID  # NEW — ID of /BidIntell/Diagnostics/Prospects
GOOGLE_SHEETS_TRACKER_ID       # NEW — ID of the tracker spreadsheet
CALENDLY_WEBHOOK_SECRET        # NEW — for webhook signature verification
DIAGNOSTIC_NOTIFY_EMAIL        # NEW — ryan@fsikc.com (since ryan@bidintell.ai
                               # has no mailbox per MEMORY.md note)
```

---

## ONE-TIME SETUP (DO THESE BEFORE DEPLOYING)

### 1. Google Cloud setup (~15 min)

1. Go to console.cloud.google.com
2. Create new project: "BidIntell Diagnostic Agent"
3. Enable APIs: Google Drive API, Google Sheets API
4. Create service account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Name: `diagnostic-agent`
   - Role: Editor (scoped to Drive + Sheets via API restrictions)
   - Create key → JSON → download
5. Share target Drive folder + Tracker spreadsheet with the service account email
   - The service account will have an email like `diagnostic-agent@bidintell-diagnostic.iam.gserviceaccount.com`
   - Right-click the parent Drive folder → Share → Add this email as Editor
   - Open the tracker spreadsheet → Share → Add this email as Editor
6. Base64-encode the JSON key and add to Netlify env as `GOOGLE_SERVICE_ACCOUNT_KEY`:
   ```bash
   cat service-account-key.json | base64 -w0
   ```

### 2. Google Drive structure

Create this folder structure in Drive (manually, one time):

```
/BidIntell/
└── /Diagnostics/
    ├── /Prospects/        ← agent creates subfolders here
    ├── /Memos_All/         ← final memos copied here
    └── /Templates/
```

Get the folder ID for `/Prospects/` from the Drive URL — it's the long string after `/folders/`. Add to Netlify env as `GOOGLE_DRIVE_PARENT_FOLDER_ID`.

### 3. Google Sheets tracker

Upload `BidIntell_Diagnostic_Tracker.xlsx` to Google Drive as a Google Sheet (right-click → Open with Google Sheets → Save as Google Sheet).

Get the spreadsheet ID from the URL — long string after `/d/` and before `/edit`. Add to Netlify env as `GOOGLE_SHEETS_TRACKER_ID`.

### 4. Calendly webhook

1. Calendly → Account → Integrations → Webhooks → Create
2. URL: `https://bidintell.ai/.netlify/functions/diagnostic-prep`
3. Events: `invitee.created` (someone books)
4. Scope: Limit to your "BidIntell Bid Selection Diagnostic" event only
5. Generate signing key → save to Netlify env as `CALENDLY_WEBHOOK_SECRET`

### 5. Deploy the function

The function file (`diagnostic-prep.js`) goes in `netlify/functions/`. Same as your existing functions. Netlify auto-deploys on git push.

---

## TESTING THE AGENT

Before pointing real Calendly bookings at it, test with a curl:

```bash
curl -X POST https://bidintell.ai/.netlify/functions/diagnostic-prep \
  -H "Content-Type: application/json" \
  -H "Calendly-Webhook-Signature: test-skip" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "email": "test@example.com",
      "name": "Test Sub Owner",
      "questions_and_answers": [
        {"question": "Company name and your role", "answer": "Test Flooring Co — Owner"},
        {"question": "Trade or scope", "answer": "Commercial flooring"},
        {"question": "Approximate annual revenue", "answer": "$5M – $10M"},
        {"question": "What are you hoping to get out of this", "answer": "Want to know which GCs to stop bidding"}
      ],
      "scheduled_event": {
        "start_time": "2026-05-20T15:00:00Z"
      }
    }
  }'
```

Set `CALENDLY_WEBHOOK_SECRET` to `test-skip` temporarily to bypass signature check, or implement a debug mode flag.

You should see:
1. Function returns 200
2. New folder appears in Drive within 60s
3. Files inside: `00_company_brief.md`, `01_tailored_script.md`, `02_intake_answers.md`
4. New row appears in tracker sheet
5. Email arrives in your inbox with summary

If any step fails, function logs are in Netlify dashboard → Functions → diagnostic-prep → logs.

---

## FAILURE MODES & FALLBACKS

**Web search fails or returns nothing useful:**
- Brief gets generated with whatever exists ("limited public footprint — focus the call on Q4 directly")
- Function still completes successfully

**Drive API fails:**
- Function logs error, sends email to Ryan saying "agent ran but Drive failed — manually set up folder for [Name]"
- Tracker row still gets created

**Sheets API fails:**
- Function logs error, includes intake answers in the founder email
- Ryan adds the row manually

**Claude API fails:**
- Function falls back to a generic script template
- Email to Ryan flags it: "agent ran but research failed — using generic script"

The function is designed to **degrade gracefully** — partial success is better than total failure. Nothing in the workflow has a hard dependency on a single API working.

---

## COSTS PER RUN

- Claude API (Sonnet 4.6 with web_search): ~$0.05-0.10 per prep run
- Postmark email: free tier (~100/day allowance)
- Google Drive/Sheets API: free tier
- Netlify Functions: free tier (125k requests/mo)

**Total: ~$0.10 per diagnostic prep.** At 5 diagnostics/week that's $2/month. Negligible.

---

## NEXT FILES IN THIS FOLDER

- `diagnostic-prep.js` — the actual Netlify function
- `lib-claude-research.js` — Claude research helper
- `lib-google-drive.js` — Drive folder creation
- `lib-google-sheets.js` — Sheets row append
- `prompts.js` — Claude prompts for research and script tailoring
- `package-additions.json` — npm dependencies to add
- `README.md` — quickstart for Claude Code or future-you to deploy this

---

**End of architecture spec.**
