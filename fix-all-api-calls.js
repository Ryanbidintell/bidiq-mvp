/**
 * Complete API Call Replacement Script
 * Replaces all remaining direct API calls with callAI() backend function
 */

const fs = require('fs');
const path = require('path');

const APP_HTML_PATH = path.join(__dirname, 'app.html');

console.log('🔧 Replacing all direct API calls with callAI()...\n');

let content = fs.readFileSync(APP_HTML_PATH, 'utf8');

// 1. Replace OpenAI API call at line ~5297 (extraction function)
console.log('Step 1: Fixing OpenAI extraction call (line ~5297)...');
const openaiPattern = /try \{\s+const response = await fetch\('https:\/\/api\.openai\.com\/v1\/chat\/completions',\s*\{[\s\S]*?method: 'POST',[\s\S]*?headers: \{[\s\S]*?'Content-Type': 'application\/json',[\s\S]*?'Authorization': 'Bearer YOUR_KEY'[\s\S]*?\},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?model: 'gpt-4o',[\s\S]*?messages: \[\{ role: 'user', content: prompt \}\],[\s\S]*?temperature: 0\.1,[\s\S]*?max_tokens: 2000[\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?if \(!response\.ok\) \{[\s\S]*?const errText = await response\.text\(\);[\s\S]*?console\.error\('OpenAI API error:', response\.status, errText\);[\s\S]*?throw new Error\('OpenAI API error: ' \+ response\.status\);[\s\S]*?\}[\s\S]*?const data = await response\.json\(\);[\s\S]*?const content = data\.choices\[0\]\?\.message\?\.content \|\| '\{\}';/;

const openaiReplacement = `try {
                // Use backend API instead of direct OpenAI call
                const content = await callAI('extract_project_details', truncatedText, prompt);`;

content = content.replace(openaiPattern, openaiReplacement);

// 2. Replace Claude API call at line ~5435 (extraction function)
console.log('Step 2: Fixing Claude extraction call (line ~5435)...');
const claudePattern1 = /try \{\s+const response = await fetch\('https:\/\/api\.anthropic\.com\/v1\/messages',\s*\{[\s\S]*?method: 'POST',[\s\S]*?headers: \{[\s\S]*?'Content-Type': 'application\/json',[\s\S]*?'x-api-key': 'YOUR_KEY'[\s\S]*?'anthropic-version': '2023-06-01',[\s\S]*?'anthropic-dangerous-direct-browser-access': 'true'[\s\S]*?\},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?model: 'claude-sonnet-4-20250514',[\s\S]*?max_tokens: 2048,[\s\S]*?messages: \[\{ role: 'user', content: prompt \}\][\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?if \(!response\.ok\) \{[\s\S]*?const errText = await response\.text\(\);[\s\S]*?console\.error\('Claude API error:', response\.status, errText\);[\s\S]*?throw new Error\('Claude API error: ' \+ response\.status\);[\s\S]*?\}[\s\S]*?const data = await response\.json\(\);[\s\S]*?const content = data\.content\[0\]\?\.text \|\| '\{\}';/;

const claudeReplacement1 = `try {
                // Use backend API instead of direct Claude call
                const content = await callAI('extract_project_details', truncatedText, prompt);`;

content = content.replace(claudePattern1, claudeReplacement1);

// 3. Replace Claude API call at line ~8397 (chat question answering)
console.log('Step 3: Fixing Claude chat call (line ~8397)...');
const claudePattern2 = /\/\/ Call Claude API[\s\S]*?const response = await fetch\('https:\/\/api\.anthropic\.com\/v1\/messages',\s*\{[\s\S]*?method: 'POST',[\s\S]*?headers: \{[\s\S]*?'Content-Type': 'application\/json',[\s\S]*?'x-api-key': 'YOUR_KEY'[\s\S]*?'anthropic-version': '2023-06-01',[\s\S]*?'anthropic-dangerous-direct-browser-access': 'true'[\s\S]*?\},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?model: 'claude-sonnet-4-20250514',[\s\S]*?max_tokens: 500,[\s\S]*?messages: \[\{ role: 'user', content: prompt \}\][\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?if \(!response\.ok\) \{[\s\S]*?throw new Error\(`API error: \$\{response\.status\}`\);[\s\S]*?\}[\s\S]*?const data = await response\.json\(\);[\s\S]*?const answer = data\.content\[0\]\?\.text \|\| 'Sorry, I couldn\\'t generate a response\.';/;

const claudeReplacement2 = `// Use backend API instead of direct Claude call
                const answer = await callAI('answer_question', prompt, 'You are a helpful AI assistant analyzing construction bid documents.');
                if (!answer) {
                    throw new Error('Empty response from AI');
                }`;

content = content.replace(claudePattern2, claudeReplacement2);

// 4. Replace Claude API call at line ~10777 (AI chat)
console.log('Step 4: Fixing Claude AI chat call (line ~10777)...');
const claudePattern3 = /\/\/ Call Claude API[\s\S]*?const response = await fetch\('https:\/\/api\.anthropic\.com\/v1\/messages',\s*\{[\s\S]*?method: 'POST',[\s\S]*?headers: \{[\s\S]*?'Content-Type': 'application\/json',[\s\S]*?'x-api-key': 'YOUR_KEY'[\s\S]*?'anthropic-version': '2023-06-01',[\s\S]*?'anthropic-dangerous-direct-browser-access': 'true'[\s\S]*?\},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?model: 'claude-sonnet-4-20250514',[\s\S]*?max_tokens: 500,[\s\S]*?messages: messages[\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?if \(!response\.ok\) \{[\s\S]*?throw new Error\('API error: ' \+ response\.status\);[\s\S]*?\}[\s\S]*?const data = await response\.json\(\);[\s\S]*?const aiResponse = data\.content\[0\]\?\.text \|\| 'Sorry, I couldn\\'t generate a response\.';/;

const claudeReplacement3 = `// Use backend API instead of direct Claude call
                // Convert messages to a single prompt (backend expects single text input)
                const combinedPrompt = messages.map(m =>
                    m.role === 'user' ? 'User: ' + m.content : 'Assistant: ' + m.content
                ).join('\\n\\n');

                const aiResponse = await callAI('ai_chat', combinedPrompt, 'You are a helpful AI assistant for BidIntell.');
                if (!aiResponse) {
                    throw new Error('Empty response from AI');
                }`;

content = content.replace(claudePattern3, claudeReplacement3);

// Write back
fs.writeFileSync(APP_HTML_PATH, content, 'utf8');

console.log('\n✅ All API calls replaced!');
console.log('\n📝 Summary:');
console.log('  - OpenAI extraction call → callAI()');
console.log('  - Claude extraction call → callAI()');
console.log('  - Claude question answering → callAI()');
console.log('  - Claude AI chat → callAI()');
console.log('\n⚠️  IMPORTANT: Set these environment variables in Netlify:');
console.log('  - CLAUDE_API_KEY');
console.log('  - OPENAI_API_KEY');
console.log('  - POSTMARK_API_KEY');
