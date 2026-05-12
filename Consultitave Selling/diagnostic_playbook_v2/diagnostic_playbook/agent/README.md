# DIAGNOSTIC AGENT — DEPLOY GUIDE

**Audience:** You (Ryan) or Claude Code, deploying this into the existing bidintell-mvp codebase.

This folder contains the agent code that automates diagnostic booking prep. Drop these files into your existing repo and configure env vars.

---

## FILES IN THIS FOLDER

| File | Where it goes in your repo | What it does |
|---|---|---|
| `diagnostic-prep.js` | `netlify/functions/diagnostic-prep.js` | Main webhook handler (orchestrator) |
| `lib-claude-research.js` | `netlify/functions/diagnostic-agent/lib-claude-research.js` | Anthropic SDK wrapper for research + script tailoring |
| `lib-google-drive.js` | `netlify/functions/diagnostic-agent/lib-google-drive.js` | Drive folder + file creation |
| `lib-google-sheets.js` | `netlify/functions/diagnostic-agent/lib-google-sheets.js` | Sheets row append |
| `prompts.js` | `netlify/functions/diagnostic-agent/prompts.js` | Claude prompts (versioned, edit voice here) |
| `package-additions.json` | reference only | Lists deps to add to your existing package.json |
| `00_AGENT_ARCHITECTURE.md` | (keep in playbook folder) | Architecture spec — read this first |
| `README.md` | (this file, keep in playbook folder) | Deploy guide |

---

## DEPLOY CHECKLIST

### Step 1: Add files to your repo

```bash
cd ~/path/to/bidiq-mvp

mkdir -p netlify/functions/diagnostic-agent
cp <playbook>/agent/diagnostic-prep.js netlify/functions/
cp <playbook>/agent/lib-claude-research.js netlify/functions/diagnostic-agent/
cp <playbook>/agent/lib-google-drive.js netlify/functions/diagnostic-agent/
cp <playbook>/agent/lib-google-sheets.js netlify/functions/diagnostic-agent/
cp <playbook>/agent/prompts.js netlify/functions/diagnostic-agent/
```

### Step 2: Add npm dependencies

```bash
npm install @anthropic-ai/sdk@^0.32.1 googleapis@^144.0.0
```

### Step 3: Google Cloud setup

See `00_AGENT_ARCHITECTURE.md` for full details. Summary:

1. Create GCP project: "BidIntell Diagnostic Agent"
2. Enable Drive API + Sheets API
3. Create service account, download JSON key
4. Share `/BidIntell/Diagnostics/Prospects/` folder with service account email (Editor)
5. Share the tracker spreadsheet with service account email (Editor)

### Step 4: Add env vars in Netlify

```
ANTHROPIC_API_KEY              ← already exists
POSTMARK_API_KEY               ← already exists
GOOGLE_SERVICE_ACCOUNT_KEY     ← base64 of the service account JSON key
GOOGLE_DRIVE_PARENT_FOLDER_ID  ← Drive folder ID from URL
GOOGLE_SHEETS_TRACKER_ID       ← Sheet ID from URL
CALENDLY_WEBHOOK_SECRET        ← Calendly signing key (or "test-skip" for dev)
DIAGNOSTIC_NOTIFY_EMAIL        ← ryan@fsikc.com (per MEMORY.md, ryan@bidintell.ai has no mailbox)
```

To base64-encode the service account JSON:

```bash
cat ~/Downloads/diagnostic-agent-key.json | base64 -w0 | pbcopy
# (-w0 disables line wrapping; on macOS use: cat key.json | base64 | tr -d '\n' | pbcopy)
```

### Step 5: Configure Calendly webhook

1. Calendly → Account → Integrations → Webhooks → Create
2. URL: `https://bidintell.ai/.netlify/functions/diagnostic-prep`
3. Events: `invitee.created`
4. Scope: limit to the "BidIntell Bid Selection Diagnostic" event
5. Copy the signing secret → save as `CALENDLY_WEBHOOK_SECRET` in Netlify

### Step 6: Deploy

```bash
git add .
git commit -m "feat: add diagnostic prep agent (webhook → research → drive → sheet → email)"
git push
```

Netlify auto-deploys on push.

### Step 7: Test

With `CALENDLY_WEBHOOK_SECRET=test-skip` set:

```bash
curl -X POST https://bidintell.ai/.netlify/functions/diagnostic-prep \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "email": "test@example.com",
      "name": "Mike Test",
      "questions_and_answers": [
        {"question": "Company name and your role", "answer": "Test Flooring — Owner"},
        {"question": "Trade or scope you specialize in", "answer": "Commercial flooring"},
        {"question": "Approximate annual revenue", "answer": "$5M – $10M"},
        {"question": "One sentence on what you are hoping to get out of this", "answer": "Want to know which GCs to stop bidding"}
      ],
      "scheduled_event": {
        "start_time": "2026-05-20T15:00:00Z"
      }
    }
  }'
```

Expected: 200 response with `{ success: true, prospectId: "P001", folderUrl: "...", status: {...} }`.

Check:
- New folder in Drive
- 3 Google Docs inside it (00_company_brief, 01_tailored_script, 02_intake_answers)
- New row in tracker sheet
- Email in your inbox

After successful test, set `CALENDLY_WEBHOOK_SECRET` back to the real Calendly signing key.

---

## OBSERVABILITY

Function logs are in Netlify dashboard → Functions → diagnostic-prep → Logs.

The orchestrator's response body includes a `status` object showing which steps succeeded and which fell back. The founder email also includes a status footer for transparency.

If you want richer monitoring, the obvious add later is logging each run to a `diagnostic_agent_runs` table in Supabase. Not needed at 5/week throughput.

---

## EDITING PROMPT VOICE

If memos/scripts start feeling off:

1. Edit `prompts.js` — that's the single source of truth for voice
2. Push the change — Netlify auto-redeploys
3. Test against a known-good prospect
4. Compare output to a previously-good run

Don't edit prompts inside the orchestrator. Keep them in `prompts.js`.

---

## COSTS AT VOLUME

| Volume | Claude API/mo | Total/mo |
|---|---|---|
| 5 diagnostics/week | ~$2 | ~$2 |
| 20 diagnostics/week | ~$8 | ~$8 |
| 50 diagnostics/week | ~$20 | ~$20 |

All other infra is free tier through 100+/week.

---

## FUTURE ENHANCEMENTS (PHASE 2)

Not building now, but planned:

1. **Auto-memo generation:** Drive trigger watches the prospect folder; when a Granola transcript drops in, fire a function that generates the diagnostic memo using the same prompts approach.

2. **Auto follow-up scheduling:** When memo is sent, schedule a calendar reminder for 5-7 days later to send the follow-up email.

3. **Pattern dashboard:** Aggregate the structured fields from the tracker into a small admin dashboard at bidintell.ai/admin/diagnostics.

4. **Calendly two-way sync:** When you manually log a no-show or reschedule, push back to Calendly.

These are obvious wins but not week-1. Ship the basic agent first, run 10 diagnostics through it, then build the next layer based on actual friction.

---

**End of deploy guide.**
