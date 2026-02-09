/**
 * Script to fix all API key issues in app.html
 * Run with: node fix-api-keys.js
 */

const fs = require('fs');
const path = require('path');

const APP_HTML_PATH = path.join(__dirname, 'app.html');

console.log('🔧 Fixing API key security issues in app.html...\n');

// Read the file
let content = fs.readFileSync(APP_HTML_PATH, 'utf8');
const originalLength = content.length;

// 1. Remove hardcoded API keys (lines 1858-1861)
console.log('Step 1: Removing hardcoded API keys...');
content = content.replace(
    /const CLAUDE_API_KEY = ['"].*?['"];/g,
    '// CLAUDE_API_KEY removed - now in backend'
);
content = content.replace(
    /const OPENAI_API_KEY = ['"].*?['"];/g,
    '// OPENAI_API_KEY removed - now in backend'
);
content = content.replace(
    /const POSTMARK_API_KEY = ['"].*?['"];/g,
    '// POSTMARK_API_KEY removed - now in backend'
);

// 2. Fix sendErrorEmail function (line ~1977)
console.log('Step 2: Fixing sendErrorEmail function...');
const sendErrorEmailOld = /async function sendErrorEmail\(errorType, errorDetails\)\s*{[\s\S]*?try\s*{[\s\S]*?await fetch.*?Postmark.*?[\s\S]*?}\s*catch.*?{[\s\S]*?}\s*}/;
const sendErrorEmailNew = `async function sendErrorEmail(errorType, errorDetails) {
        try {
            await sendErrorNotification(errorType, errorDetails, null);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }`;
content = content.replace(sendErrorEmailOld, sendErrorEmailNew);

// 3. Fix detectContractRisks function signature
console.log('Step 3: Fixing detectContractRisks function...');
content = content.replace(
    /async function detectContractRisks\(fullText,\s*apiKey\)/g,
    'async function detectContractRisks(fullText)'
);

// 4. Fix detectContractRisks API call (around line 2590-2610)
// Replace the fetch call with callAI
const detectRisksPattern = /const response = await fetch\(['"]https:\/\/api\.anthropic\.com\/v1\/messages['"],\s*{[\s\S]*?'x-api-key':\s*apiKey,[\s\S]*?}\);[\s\S]*?const data = await response\.json\(\);[\s\S]*?const risks = JSON\.parse\(data\.content\[0\]\.text\);/;
const detectRisksReplacement = `const response = await callAI('detect_risks', fullText, prompt);
                const risks = JSON.parse(response);`;
content = content.replace(detectRisksPattern, detectRisksReplacement);

// 5. Fix extractBuildingType function
console.log('Step 4: Fixing extractBuildingType function...');
content = content.replace(
    /async function extractBuildingType\(projectName,\s*scopeSummary,\s*fullText,\s*apiKey\)/g,
    'async function extractBuildingType(projectName, scopeSummary, fullText)'
);

// 6. Replace all direct OpenAI API calls
console.log('Step 5: Replacing OpenAI API calls...');
content = content.replace(
    /['"]Authorization['"]\s*:\s*`Bearer \$\{OPENAI_API_KEY\}`/g,
    "'Authorization': 'Bearer YOUR_KEY' // This should use callAI() instead"
);

// 7. Replace all direct Claude API calls
console.log('Step 6: Replacing Claude API calls...');
content = content.replace(
    /['"]x-api-key['"]\s*:\s*CLAUDE_API_KEY/g,
    "'x-api-key': 'YOUR_KEY' // This should use callAI() instead"
);

// 8. Fix function calls that pass API keys
console.log('Step 7: Fixing function calls...');
content = content.replace(
    /detectContractRisks\(fullText,\s*CLAUDE_API_KEY\)/g,
    'detectContractRisks(fullText)'
);
content = content.replace(
    /extractBuildingType\([^)]+,\s*CLAUDE_API_KEY\)/g,
    (match) => match.replace(/,\s*CLAUDE_API_KEY/, '')
);

// Write the file back
fs.writeFileSync(APP_HTML_PATH, content, 'utf8');

console.log('\n✅ Done!');
console.log(`File size: ${originalLength} → ${content.length} bytes`);
console.log('\n⚠️  NEXT STEPS:');
console.log('1. Review the changes in app.html');
console.log('2. Search for remaining API key references');
console.log('3. Test the application');
console.log('4. Set environment variables in Netlify:');
console.log('   - CLAUDE_API_KEY');
console.log('   - OPENAI_API_KEY');
console.log('   - POSTMARK_API_KEY');
