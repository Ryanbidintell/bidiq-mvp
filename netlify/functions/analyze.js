// Serverless function for secure AI API calls
// Deploys to Netlify as /.netlify/functions/analyze

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Rate limiting (simple in-memory, use Redis for production)
const rateLimits = new Map();
const MAX_REQUESTS_PER_HOUR = 50;

function checkRateLimit(userId) {
    const now = Date.now();
    const hourAgo = now - 3600000;

    if (!rateLimits.has(userId)) {
        rateLimits.set(userId, []);
    }

    const userRequests = rateLimits.get(userId).filter(time => time > hourAgo);

    if (userRequests.length >= MAX_REQUESTS_PER_HOUR) {
        return false;
    }

    userRequests.push(now);
    rateLimits.set(userId, userRequests);
    return true;
}

async function callClaudeAPI(messages, systemPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages
        })
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
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
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { userId, operation, text, systemPrompt} = JSON.parse(event.body);

        // Validate request
        if (!userId || !operation || !text || !systemPrompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: userId, operation, text, systemPrompt'
                })
            };
        }

        // Rate limiting
        if (!checkRateLimit(userId)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    error: 'Rate limit exceeded. Maximum 50 requests per hour.'
                })
            };
        }

        // Prepare messages
        const messages = [{ role: 'user', content: text }];

        let result;
        let provider;

        // Try Claude first, fallback to OpenAI
        try {
            const claudeResponse = await callClaudeAPI(messages, systemPrompt);
            result = {
                text: claudeResponse.content[0].text,
                model: claudeResponse.model,
                usage: claudeResponse.usage
            };
            provider = 'claude';
        } catch (claudeError) {
            console.error('Claude API failed, trying OpenAI:', claudeError.message);

            try {
                const openaiResponse = await callOpenAIAPI(messages, systemPrompt);
                result = {
                    text: openaiResponse.choices[0].message.content,
                    model: openaiResponse.model,
                    usage: openaiResponse.usage
                };
                provider = 'openai';
            } catch (openaiError) {
                console.error('Both APIs failed:', openaiError.message);
                throw new Error('All AI providers unavailable');
            }
        }

        // Log usage for tracking (send to Supabase in production)
        console.log(`[${operation}] ${provider} - User: ${userId} - Tokens: ${JSON.stringify(result.usage)}`);

        // Return result
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                provider,
                result: result.text,
                model: result.model,
                usage: result.usage
            })
        };

    } catch (error) {
        console.error('API proxy error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error',
                success: false
            })
        };
    }
};
