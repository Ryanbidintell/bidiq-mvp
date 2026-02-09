# API Key Migration - Manual Updates Needed

## Completed ✅
1. Removed API keys from app.html (Claude, OpenAI, Postmark)
2. Created `callAI()` helper function (lines ~1865-1900)
3. Created `sendErrorNotification()` helper function (lines ~1902-1920)
4. Created `netlify/functions/notify.js` for email notifications
5. Already have `netlify/functions/analyze.js` for AI calls

## Manual Updates Needed

Due to file size, you need to manually replace the following function calls in `app.html`:

### 1. sendErrorEmail function (~line 1977)
**Replace entire function with:**
```javascript
async function sendErrorEmail(errorType, errorDetails) {
    try {
        await sendErrorNotification(errorType, errorDetails, null);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
```

### 2. detectContractRisks function (~line 2527)
**Change function signature from:**
```javascript
async function detectContractRisks(fullText, apiKey) {
```
**To:**
```javascript
async function detectContractRisks(fullText) {
```

**Replace the fetch call (~line 2590-2610) with:**
```javascript
const response = await callAI('detect_risks', fullText, prompt);
const risks = JSON.parse(response);
```

### 3. extractBuildingType function (~line 2650)
**Change function signature - remove apiKey parameter**

**Replace the fetch call with:**
```javascript
const response = await callAI('extract_building_type', `${projectName}\n${scopeSummary}\n\n${fullText.substring(0, 8000)}`, prompt);
const result = JSON.parse(response);
```

### 4. All other direct API calls
Search for these patterns and replace with `callAI()`:
- `fetch('https://api.openai.com/` → use `callAI()`
- `fetch('https://api.anthropic.com/` → use `callAI()`
- `'Authorization': \`Bearer ${OPENAI_API_KEY}\`` → remove
- `'x-api-key': CLAUDE_API_KEY` → remove

## Find and Replace Commands

Run these searches in your editor:

1. Search: `CLAUDE_API_KEY`
   - Replace all remaining usage with backend calls

2. Search: `OPENAI_API_KEY`
   - Replace all remaining usage with backend calls

3. Search: `POSTMARK_API_KEY`
   - Should only be in backend function now

4. Search: `apiKey` (parameter)
   - Remove from all function signatures

## Environment Variables to Set in Netlify

```bash
CLAUDE_API_KEY=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
OPENAI_API_KEY=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
POSTMARK_API_KEY=88f4c6a3-e3fc-481c-a8bf-783e295c4572
```

## Testing After Migration

1. Test PDF upload and analysis
2. Test AI chat
3. Test error notifications
4. Check all console logs for API key leaks

## Lines to Check

- Line ~1977: sendErrorEmail
- Line ~2527: detectContractRisks
- Line ~2650: extractBuildingType
- Line ~5230: OpenAI API call
- Line ~5368: Claude API call (another instance)
- Line ~8330: Claude API call (report generation)
- Line ~10710: Claude API call (chat)
