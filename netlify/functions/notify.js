// Serverless function for sending notifications and emails
// Deploys to Netlify as /.netlify/functions/notify

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

async function sendEmail({ to, subject, htmlBody }) {
    const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: 'hello@bidintell.ai',
            To: to,
            Subject: subject,
            HtmlBody: htmlBody
        })
    });
    if (!response.ok) throw new Error(`Postmark API error: ${response.status}`);
    return response;
}

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        const body = JSON.parse(event.body);
        const { emailType } = body;

        // ── Error notification (original behavior) ──────────────────────────
        if (!emailType || emailType === 'error') {
            const { errorType, errorMessage, userEmail, stackTrace } = body;
            await sendEmail({
                to: 'ryan@bidintell.ai',
                subject: `🚨 BidIQ Error: ${errorType}`,
                htmlBody: `
                    <h2>Error Report</h2>
                    <p><strong>Type:</strong> ${errorType}</p>
                    <p><strong>User:</strong> ${userEmail || 'Not logged in'}</p>
                    <p><strong>Message:</strong> ${errorMessage}</p>
                    <h3>Stack Trace:</h3>
                    <pre>${stackTrace || 'No stack trace available'}</pre>
                    <p><em>Sent from BidIntell Error Monitor</em></p>
                `
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── Beta application submitted ───────────────────────────────────────
        if (emailType === 'beta_application') {
            const { fullName, userEmail } = body;

            // Confirmation to applicant
            await sendEmail({
                to: userEmail,
                subject: `You're on the BidIntell beta list, ${fullName.split(' ')[0]}!`,
                htmlBody: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                        <h2 style="color: #4F46E5;">You're on the list! 🎉</h2>
                        <p>Hey ${fullName.split(' ')[0]},</p>
                        <p>Thanks for applying to the BidIntell beta. We're reviewing applications and will send you access shortly.</p>
                        <p>BidIntell helps subcontractors stop wasting time on bad bids — analyzing documents, scoring opportunities, and detecting risky contract clauses in minutes.</p>
                        <p>We'll be in touch soon with your login link.</p>
                        <p style="margin-top: 32px;">— Ryan<br><em>Founder, BidIntell</em></p>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #888;">BidIntell · <a href="https://bidintell.ai">bidintell.ai</a></p>
                    </div>
                `
            });

            // Notification to Ryan
            await sendEmail({
                to: 'ryan@fsikc.com',
                subject: `🔔 New BidIntell beta application: ${fullName}`,
                htmlBody: `
                    <h2>New Beta Application</h2>
                    <p><strong>Name:</strong> ${fullName}</p>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><a href="https://bidintell.ai/admin" style="background:#4F46E5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">View in Admin Panel →</a></p>
                `
            });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── Beta user approved ───────────────────────────────────────────────
        if (emailType === 'beta_approval') {
            const { fullName, userEmail } = body;

            await sendEmail({
                to: userEmail,
                subject: `Your BidIntell beta access is ready, ${fullName.split(' ')[0]}!`,
                htmlBody: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                        <h2 style="color: #4F46E5;">Your access is ready! 🚀</h2>
                        <p>Hey ${fullName.split(' ')[0]},</p>
                        <p>Great news — your BidIntell beta account is approved and ready to go.</p>
                        <p><a href="https://bidintell.ai/app" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Open BidIntell →</a></p>
                        <p style="margin-top: 24px;">A few things to get started:</p>
                        <ol>
                            <li>Complete the short setup (takes 2 minutes)</li>
                            <li>Upload your first bid document</li>
                            <li>Get your BidIndex score and contract risk analysis</li>
                        </ol>
                        <p>Reply to this email any time if you have questions — I personally read every message.</p>
                        <p style="margin-top: 32px;">— Ryan<br><em>Founder, BidIntell</em></p>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #888;">BidIntell · <a href="https://bidintell.ai">bidintell.ai</a></p>
                    </div>
                `
            });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── Contact form submission ──────────────────────────────────────────
        if (emailType === 'contact_form') {
            const { fullName, userEmail, company, subject, message } = body;

            const contactHtml = `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
                ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
                <p><strong>Topic:</strong> ${subject}</p>
                <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;">
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; color: #333;">${message}</p>
                <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #888;">Sent from bidintell.ai/contact · ${new Date().toLocaleString()}</p>
            `;
            const contactSubject = `[BidIntell Contact] ${subject} — from ${fullName}`;

            // Send to both inboxes so it doesn't get lost
            await Promise.all([
                sendEmail({ to: 'ryan@fsikc.com', subject: contactSubject, htmlBody: contactHtml }),
                sendEmail({ to: 'ryan@bidintell.ai', subject: contactSubject, htmlBody: contactHtml })
            ]);

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown emailType' }) };

    } catch (error) {
        console.error('Notification error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Failed to send notification', success: false })
        };
    }
};
