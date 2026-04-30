// Serverless function for secure AI API calls
// Deploys to Netlify as /.netlify/functions/analyze

const { createClient } = require('@supabase/supabase-js');

const CLAUDE_API_KEY  = process.env.CLAUDE_API_KEY;
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Supabase client used only for JWT verification (anon key is sufficient)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Rate limiting — in-memory per cold-start; good enough once userId is verified
const rateLimits = new Map();
const MAX_REQUESTS_PER_HOUR = 50;

function checkRateLimit(userId) {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const requests = (rateLimits.get(userId) || []).filter(t => t > hourAgo);
    if (requests.length >= MAX_REQUESTS_PER_HOUR) return false;
    requests.push(now);
    rateLimits.set(userId, requests);
    return true;
}

async function callClaudeAPI(messages, systemPrompt, model = 'claude-sonnet-4-20250514') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages })
    });
    if (!response.ok) throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    return response.json();
}

async function callOpenAIAPI(messages, systemPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        })
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    return response.json();
}

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': 'https://bidintell.ai',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    // ── Auth: require a valid Supabase JWT ─────────────────────────────────────
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired session' }) };
    }

    // userId comes from the verified JWT — cannot be faked by the caller
    const userId = user.id;

    try {
        const { operation, text, systemPrompt } = JSON.parse(event.body);

        if (!operation || !text || !systemPrompt) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: operation, text, systemPrompt' }) };
        }

        if (!checkRateLimit(userId)) {
            return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit exceeded. Maximum 50 requests per hour.' }) };
        }

        const messages = [{ role: 'user', content: text }];
        const claudeModel = operation === 'doc_classify'
            ? 'claude-haiku-4-5-20251001'
            : 'claude-sonnet-4-20250514';

        let result, provider;

        try {
            const claudeResponse = await callClaudeAPI(messages, systemPrompt, claudeModel);
            result = { text: claudeResponse.content[0].text, model: claudeResponse.model, usage: claudeResponse.usage };
            provider = 'claude';
        } catch (claudeError) {
            console.error('Claude API failed, trying OpenAI:', claudeError.message);
            try {
                const openaiResponse = await callOpenAIAPI(messages, systemPrompt);
                result = { text: openaiResponse.choices[0].message.content, model: openaiResponse.model, usage: openaiResponse.usage };
                provider = 'openai';
            } catch (openaiError) {
                console.error('Both APIs failed:', openaiError.message);
                throw new Error('All AI providers unavailable');
            }
        }

        console.log(`[${operation}] ${provider} - User: ${userId} - Tokens: ${JSON.stringify(result.usage)}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, provider, result: result.text, model: result.model, usage: result.usage })
        };

    } catch (error) {
        console.error('API proxy error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Internal server error', success: false }) };
    }
};
