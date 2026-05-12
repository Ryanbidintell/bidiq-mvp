# CLAUDE CODE PROMPT — DEPLOY THE DIAGNOSTIC SYSTEM

**How to use this:** Open Claude Code in your bidiq-mvp directory. Paste the prompt below. Claude Code will execute step-by-step, asking you for the env vars and credentials at the appropriate moments.

**Estimated time:** 60-90 minutes from paste to live, including the ~30 minutes of manual GCP/Calendly setup that requires your login.

**Prerequisites before you paste this:**
- You've extracted `BidIntell_Diagnostic_Playbook.zip` to a known location (note the path)
- You've got admin access to your Netlify dashboard
- You've got admin access to your Calendly account
- You've got a Google account where the Drive/Sheets will live

---

## PASTE THIS INTO CLAUDE CODE

```
I'm deploying the BidIntell Diagnostic Program. The full playbook is at [PATH/TO/EXTRACTED/diagnostic_playbook/]. Read CLAUDE.md, ARCHITECTURE.md, and SCHEMA.md first to ground yourself in the codebase, then follow the steps below.

DO NOT skip steps. DO NOT batch them — work through them in order, confirming each one with me before moving on. This is production code; one wrong env var or one bad route breaks the whole motion.

OBJECTIVE
Deploy two things into the existing bidintell.ai codebase:
  1. The /diagnostic landing page (matches existing index.html aesthetic)
  2. The diagnostic-prep agent (Netlify function that fires on Calendly webhook)

STEP 1 — VERIFY ENVIRONMENT

Read the following files in this order. Confirm each one exists and tell me what you find:
  - ARCHITECTURE.md
  - CLAUDE.md
  - netlify.toml
  - package.json
  - netlify/functions/ directory listing
  - index.html (just check the :root CSS variables match what the playbook expects: --brand-primary should be #4F46E5)

If anything is unexpected (missing files, different brand colors, conflicting routes), STOP and tell me before proceeding.

STEP 2 — DEPLOY THE LANDING PAGE

The landing page file is at [PATH]/diagnostic_playbook/diagnostic_landing_page.html.

Tasks:
  a. Copy diagnostic_landing_page.html to the bidiq-mvp root as diagnostic.html
  b. Add this redirect rule to netlify.toml in the [[redirects]] section:
       [[redirects]]
         from = "/diagnostic"
         to = "/diagnostic.html"
         status = 200
  c. In diagnostic.html, find these placeholders and tell me what they currently say so I can confirm replacement values:
       - data-url="https://calendly.com/ryan-bidintell/diagnostic..."
       - CLARITY_PROJECT_ID
  d. After I give you the real values, do the find-and-replace
  e. git add, commit with message "feat(diagnostic): add /diagnostic landing page", but DO NOT PUSH yet — I want to review the diff first

STEP 3 — REVIEW LANDING PAGE DIFF

Show me:
  - git diff for netlify.toml
  - The two replaced placeholders in diagnostic.html (just the changed lines)

I'll approve the push.

STEP 4 — INSTALL AGENT DEPENDENCIES

Read [PATH]/diagnostic_playbook/agent/package-additions.json. Verify these aren't already in the existing package.json:
  - @anthropic-ai/sdk@^0.32.1
  - googleapis@^144.0.0

If missing, run:
  npm install @anthropic-ai/sdk@^0.32.1 googleapis@^144.0.0

If @anthropic-ai/sdk already exists at a lower version, tell me before upgrading — analyze.js may use it and I want to confirm we won't break anything.

STEP 5 — DEPLOY AGENT FILES

  a. Create directory: netlify/functions/diagnostic-agent/
  b. Copy these from [PATH]/diagnostic_playbook/agent/ into netlify/functions/diagnostic-agent/:
       - lib-claude-research.js
       - lib-google-drive.js
       - lib-google-sheets.js
       - prompts.js
  c. Copy diagnostic-prep.js from [PATH]/diagnostic_playbook/agent/ to netlify/functions/diagnostic-prep.js (note: this one goes in the functions root, not the subdirectory)
  d. Verify the require() paths inside diagnostic-prep.js resolve correctly given the new structure (they should — paths in the source assume this layout)
  e. Run: node -c netlify/functions/diagnostic-prep.js
     and:  node -c netlify/functions/diagnostic-agent/lib-claude-research.js
     etc., on each file. Tell me if any fail syntax check.

STEP 6 — CONFIGURE GOOGLE CLOUD (I DO THIS, YOU GUIDE)

You can't do this part — it requires my Google login. But walk me through it step-by-step and wait at each step until I confirm I've done it. The steps are:

  1. Open console.cloud.google.com — create new project "BidIntell Diagnostic Agent"
  2. Enable Drive API and Sheets API in the project
  3. IAM & Admin → Service Accounts → Create Service Account named "diagnostic-agent"
  4. Grant it role: Editor (we'll restrict later if needed)
  5. Create a JSON key for the service account, download it
  6. Tell me the service account email address (will look like diagnostic-agent@bidintell-diagnostic.iam.gserviceaccount.com)

While I do that, you prepare the base64 conversion command for me:
  cat <path-to-key.json> | base64 -w0

Then guide me through:
  7. Create folder structure in Drive: /BidIntell/Diagnostics/Prospects/
  8. Share the Prospects folder with the service account email as Editor
  9. Tell me the Prospects folder ID (visible in URL after /folders/)
  10. Upload BidIntell_Diagnostic_Tracker.xlsx to Drive as a Google Sheet (right-click → Open with Google Sheets → save)
  11. Share the spreadsheet with the service account email as Editor
  12. Tell me the spreadsheet ID (visible in URL between /d/ and /edit)

STEP 7 — SET NETLIFY ENV VARS

Once I have all the values from Step 6, walk me through adding these in the Netlify dashboard:
  - GOOGLE_SERVICE_ACCOUNT_KEY (base64 of the JSON key)
  - GOOGLE_DRIVE_PARENT_FOLDER_ID (the Prospects folder ID)
  - GOOGLE_SHEETS_TRACKER_ID (the spreadsheet ID)
  - CALENDLY_WEBHOOK_SECRET (set to "test-skip" temporarily for testing)
  - DIAGNOSTIC_NOTIFY_EMAIL (set to ryan@fsikc.com per MEMORY.md note that ryan@bidintell.ai has no mailbox)

Confirm with me that ANTHROPIC_API_KEY and POSTMARK_API_KEY already exist (they should from existing functions).

STEP 8 — COMMIT AND DEPLOY THE AGENT

  a. git add netlify/functions/diagnostic-prep.js netlify/functions/diagnostic-agent/ package.json package-lock.json
  b. git status — show me what's staged before committing
  c. git commit -m "feat(diagnostic): add diagnostic-prep agent (webhook → research → drive → sheet → email)"
  d. Show me the commit
  e. WAIT for me to approve before git push

STEP 9 — TEST THE AGENT (DEV MODE)

After Netlify deploys (2-3 min), test with curl. Use the test payload from [PATH]/diagnostic_playbook/agent/README.md (the curl example in section "Step 7: Test").

  a. Run the curl
  b. Show me the response
  c. If 200 with success:true, check:
       - New folder in Drive (I'll verify visually)
       - New row in tracker sheet (I'll verify visually)
       - Email in my inbox at ryan@fsikc.com (I'll verify)
  d. If anything fails, get the error from Netlify function logs and tell me

STEP 10 — CONFIGURE CALENDLY WEBHOOK (I DO THIS, YOU GUIDE)

Walk me through:
  1. Calendly → Account → Integrations → Webhooks → Create
  2. URL: https://bidintell.ai/.netlify/functions/diagnostic-prep
  3. Events: invitee.created
  4. Scope: limit to "BidIntell Bid Selection Diagnostic" event only
  5. Save the signing secret
  6. Update CALENDLY_WEBHOOK_SECRET env var in Netlify (replace "test-skip" with the real secret)

STEP 11 — END-TO-END TEST WITH REAL CALENDLY BOOKING

  a. Tell me to book a fake diagnostic on bidintell.ai/diagnostic with my own email + a test company name
  b. After I book, monitor Netlify function logs for the webhook firing
  c. Verify all 4 outputs (Drive folder, 3 docs in folder, sheet row, email)
  d. If any fail, debug and fix

STEP 12 — UPDATE DOCUMENTATION

Before we close out:
  a. Update CLAUDE.md to add the diagnostic-prep function under "Backend (netlify/functions/)"
  b. Update ARCHITECTURE.md with the new function
  c. Add a note to MEMORY.md: "Deployed diagnostic agent on [date] — webhook → research → drive → sheet → email. Test booking confirmed working."
  d. git commit docs update with message "docs: add diagnostic-prep agent to architecture/memory"

GROUND RULES THROUGHOUT
  - Don't push without showing me the diff first
  - Don't batch steps — confirm each one
  - If you find any inconsistency between the playbook and the existing codebase, STOP and ask me before resolving
  - If a syntax check fails on any agent file, STOP and report
  - If npm install changes existing dependency versions in package.json, STOP and tell me what's changing before committing
  - Never commit a JSON key file or any file containing secrets to git
  - Never echo or print env var values in plain text — always reference them by name only

When all 12 steps are complete, summarize:
  - What was deployed
  - What env vars are set
  - What URL the landing page is live at
  - What the Calendly webhook URL is
  - What's left for me to do manually

Begin with Step 1.
```

---

## NOTES ON USING THIS PROMPT

**Replace `[PATH]` before pasting.** The path needs to point to where you extracted the playbook zip. On Windows it might be `C:\Users\RyanElder\OneDrive - Facility Systems\bidiq-mvp\diagnostic_playbook\` — on Mac/Linux something like `/Users/ryan/Downloads/diagnostic_playbook/`.

**Don't paste this prompt in pieces.** Claude Code works best when given the whole plan upfront. It'll work through it sequentially, asking you for credentials and confirmations at the right moments.

**If Claude Code goes off-script**, just say "stop, go back to step N." It's been told not to batch and not to push without showing diffs — those are the most important guardrails. If you find it's pushing through steps too fast, those guardrails aren't being respected and you should pause it.

**You can pause anywhere.** The whole thing is checkpointed by step. If you have to stop after step 6 and come back tomorrow, that's fine — Claude Code can pick up at step 7 with no loss of context.

**Step 6 (Google Cloud setup) is the longest chunk you do alone.** Plan for ~25 minutes of clicking through Google Cloud Console. Have a coffee.

**If anything breaks at step 11**, the most common causes:
1. Service account doesn't have Editor permission on the Drive folder OR the spreadsheet (re-share)
2. Base64 encoding got line-wrapped (use `base64 -w0` on Linux, or `base64 | tr -d '\n'` on Mac)
3. Spreadsheet isn't a Google Sheet (it's still .xlsx — open with Google Sheets and save)

---

**You don't have to do this Saturday. But when you do, this prompt is your one-shot deploy script.**
