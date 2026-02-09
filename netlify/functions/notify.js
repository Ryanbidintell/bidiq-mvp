// Serverless function for sending error notifications
// Deploys to Netlify as /.netlify/functions/notify

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { errorType, errorMessage, userEmail, stackTrace } = JSON.parse(event.body);

        // Send email via Postmark
        const response = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_API_KEY
            },
            body: JSON.stringify({
                From: 'hello@bidintell.ai',
                To: 'ryan@bidintell.ai',
                Subject: `🚨 BidIQ Error: ${errorType}`,
                HtmlBody: `
                    <h2>Error Report</h2>
                    <p><strong>Type:</strong> ${errorType}</p>
                    <p><strong>User:</strong> ${userEmail || 'Not logged in'}</p>
                    <p><strong>Message:</strong> ${errorMessage}</p>
                    <h3>Stack Trace:</h3>
                    <pre>${stackTrace || 'No stack trace available'}</pre>
                    <p><em>Sent from BidIntell Error Monitor</em></p>
                `
            })
        });

        if (!response.ok) {
            throw new Error(`Postmark API error: ${response.status}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Notification error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to send notification',
                success: false
            })
        };
    }
};
