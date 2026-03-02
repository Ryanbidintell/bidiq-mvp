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

        // ── Beta-to-paid transition warning ─────────────────────────────────
        if (emailType === 'beta_to_paid_warning') {
            const { fullName, userEmail, planName, planPrice } = body;
            const firstName = (fullName || 'there').split(' ')[0];
            const plan = planName || 'Starter';
            const price = planPrice || '$49';

            await sendEmail({
                to: userEmail,
                subject: `Important: BidIntell billing starts April 1`,
                htmlBody: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                        <div style="background: #0B0F14; padding: 24px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #F26522;">
                            <div style="font-weight: 700; font-size: 20px; color: #F8FAFC;">BidIntell</div>
                        </div>
                        <div style="padding: 32px 24px; background: #141A23; border-radius: 0 0 8px 8px;">
                            <h2 style="color: #F8FAFC; margin-bottom: 16px;">Hey ${firstName} — heads up on billing</h2>
                            <p style="color: #CBD5E1; line-height: 1.7;">Thanks for being a founding member of BidIntell. We're wrapping up the free beta period and wanted to give you advance notice before anything changes.</p>

                            <div style="background: #1C2533; border: 1px solid #384254; border-left: 3px solid #F26522; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
                                <div style="font-weight: 700; color: #F8FAFC; margin-bottom: 8px;">What's changing</div>
                                <p style="color: #CBD5E1; margin: 0; font-size: 14px; line-height: 1.7;"><strong style="color: #F8FAFC;">April 1, 2026:</strong> The free beta ends and billing begins at <strong style="color: #F8FAFC;">${price}/month</strong> (${plan} plan).<br>As a founding member, you've locked in your pricing for as long as you stay subscribed.</p>
                            </div>

                            <p style="color: #CBD5E1; line-height: 1.7;"><strong style="color: #F8FAFC;">No action needed</strong> — your account continues automatically. We'll send a reminder closer to the date.</p>

                            <p style="color: #CBD5E1; line-height: 1.7;">If you'd like to update or cancel before billing starts, you can do that anytime from the app:</p>

                            <div style="text-align: center; margin: 28px 0;">
                                <a href="https://bidintell.ai/app" style="background: #F26522; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">Manage My Plan →</a>
                            </div>

                            <p style="color: #94A3B8; font-size: 14px; line-height: 1.7;">Questions? Just reply to this email — I personally read everything.</p>

                            <p style="color: #94A3B8; margin-top: 24px; font-size: 14px;">— Ryan<br><em>Founder, BidIntell</em></p>
                        </div>
                        <p style="font-size: 11px; color: #5A6A7E; text-align: center; margin-top: 16px;">BidIntell · <a href="https://bidintell.ai" style="color: #5A6A7E;">bidintell.ai</a> · <a href="https://bidintell.ai/legal" style="color: #5A6A7E;">Privacy & Terms</a></p>
                    </div>
                `
            });

            // Notify Ryan too
            await sendEmail({
                to: 'ryan@fsikc.com',
                subject: `✅ Beta-to-paid warning sent to ${fullName} (${userEmail})`,
                htmlBody: `<p>Beta-to-paid transition email sent to <strong>${fullName}</strong> (${userEmail}) for the <strong>${plan}</strong> plan at <strong>${price}/mo</strong>.</p>`
            });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── ROI calculator breakdown ─────────────────────────────────────────
        if (emailType === 'roi_breakdown') {
            const { userEmail, bids, hours, winRate, avgValue, margin, hoursSaved, addlMargin } = body;

            const fmt = (n) => {
                if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
                if (n >= 10000)   return '$' + Math.round(n / 1000) + 'K';
                return '$' + Math.round(n).toLocaleString();
            };

            await sendEmail({
                to: userEmail,
                subject: `Your BidIntell ROI breakdown`,
                htmlBody: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                        <div style="background: #0B0F14; padding: 24px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #F26522;">
                            <div style="font-weight: 700; font-size: 20px; color: #F8FAFC;">BidIntell</div>
                        </div>
                        <div style="padding: 32px 24px; background: #141A23; border-radius: 0 0 8px 8px;">
                            <h2 style="color: #F8FAFC; margin-bottom: 8px;">Your bid economics snapshot</h2>
                            <p style="color: #94A3B8; margin-bottom: 24px; font-size: 14px;">Based on the numbers you entered in the calculator.</p>

                            <div style="background: #1C2533; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                                <div style="font-size: 13px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Potential additional margin / year</div>
                                <div style="font-size: 2.5rem; font-weight: 700; color: #22C55E; font-family: monospace; line-height: 1;">${fmt(addlMargin)}</div>
                            </div>

                            <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:24px;">
                                <tr style="border-bottom:1px solid #384254;">
                                    <td style="padding:10px 0; color:#94A3B8;">Bids reviewed / year</td>
                                    <td style="padding:10px 0; color:#F8FAFC; text-align:right; font-family:monospace;">${bids}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #384254;">
                                    <td style="padding:10px 0; color:#94A3B8;">Hours per bid evaluation</td>
                                    <td style="padding:10px 0; color:#F8FAFC; text-align:right; font-family:monospace;">${hours} hrs</td>
                                </tr>
                                <tr style="border-bottom:1px solid #384254;">
                                    <td style="padding:10px 0; color:#94A3B8;">Current win rate</td>
                                    <td style="padding:10px 0; color:#F8FAFC; text-align:right; font-family:monospace;">${winRate}%</td>
                                </tr>
                                <tr style="border-bottom:1px solid #384254;">
                                    <td style="padding:10px 0; color:#94A3B8;">Average project value</td>
                                    <td style="padding:10px 0; color:#F8FAFC; text-align:right; font-family:monospace;">${fmt(avgValue)}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #384254;">
                                    <td style="padding:10px 0; color:#94A3B8;">Net margin</td>
                                    <td style="padding:10px 0; color:#F8FAFC; text-align:right; font-family:monospace;">${margin}%</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0; color:#94A3B8;">Estimating hours saved / year</td>
                                    <td style="padding:10px 0; color:#22C55E; text-align:right; font-family:monospace;">−${hoursSaved} hrs</td>
                                </tr>
                            </table>

                            <div style="text-align:center; margin-bottom:24px;">
                                <a href="https://bidintell.ai/#apply" style="background:#F26522;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;">Get Started Free →</a>
                            </div>

                            <p style="color:#94A3B8; font-size:13px; line-height:1.6;">These numbers are based on industry averages and your inputs. Actual results will vary — and get more accurate the more you use BidIntell to track real outcomes.</p>

                            <p style="color:#5A6A7E; margin-top:24px; font-size:13px;">— Ryan<br><em>Founder, BidIntell</em></p>
                        </div>
                        <p style="font-size:11px; color:#5A6A7E; text-align:center; margin-top:16px;">BidIntell · <a href="https://bidintell.ai" style="color:#5A6A7E;">bidintell.ai</a> · <a href="https://bidintell.ai/legal" style="color:#5A6A7E;">Privacy &amp; Terms</a></p>
                    </div>
                `
            });

            // Internal notification
            await sendEmail({
                to: 'ryan@fsikc.com',
                subject: `📊 New ROI calculator lead: ${userEmail}`,
                htmlBody: `<p>New ROI calculator lead captured.</p><p><strong>Email:</strong> ${userEmail}</p><p><strong>Numbers:</strong> ${bids} bids/yr, ${hours} hrs/bid, ${winRate}% win rate, ${fmt(avgValue)} avg value, ${margin}% margin</p><p><strong>Projected additional margin:</strong> ${fmt(addlMargin)}/yr</p>`
            });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── Magic link (bypass Supabase email, send via Postmark) ────────────
        if (emailType === 'magic_link') {
            const { userEmail, fullName } = body;
            const firstName = (fullName || 'there').split(' ')[0];
            const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
            const supabaseUrl = 'https://szifhqmrddmdkgschkkw.supabase.co';

            // Validate key before calling Supabase
            if (!serviceRoleKey) {
                throw new Error('SUPABASE_SERVICE_KEY env var is not set');
            }
            try {
                const parts = serviceRoleKey.trim().split('.');
                if (parts.length !== 3) throw new Error('not a JWT');
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                if (payload.role !== 'service_role') {
                    throw new Error(`key has role="${payload.role}" — must be "service_role". You may have pasted the anon key instead.`);
                }
            } catch (e) {
                throw new Error(`SUPABASE_SERVICE_KEY invalid: ${e.message}`);
            }

            // Generate magic link via Supabase admin API
            const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'magiclink',
                    email: userEmail,
                    redirect_to: 'https://bidintell.ai/app'
                })
            });

            if (!linkRes.ok) {
                const err = await linkRes.json().catch(() => ({}));
                throw new Error(`generate_link failed: ${err.message || linkRes.status}`);
            }

            const { action_link } = await linkRes.json();

            // Send branded welcome email with the link
            await sendEmail({
                to: userEmail,
                subject: `Your BidIntell login link, ${firstName}!`,
                htmlBody: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                        <div style="background: #0B0F14; padding: 24px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #F26522;">
                            <div style="font-weight: 700; font-size: 20px; color: #F8FAFC;">BidIntell</div>
                        </div>
                        <div style="padding: 32px 24px; background: #141A23; border-radius: 0 0 8px 8px;">
                            <h2 style="color: #F8FAFC; margin-bottom: 16px;">You're in, ${firstName}!</h2>
                            <p style="color: #CBD5E1; line-height: 1.7;">Click the button below to log in and start your first analysis. The link expires in 24 hours.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${action_link}" style="background: #F26522; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Open BidIntell →</a>
                            </div>
                            <p style="color: #94A3B8; font-size: 13px; line-height: 1.6;">Access is free through March 31, 2026. Every bid you analyze and outcome you record makes the system smarter for you.</p>
                            <p style="color: #5A6A7E; margin-top: 24px; font-size: 13px;">— Ryan<br><em>Founder, BidIntell</em></p>
                        </div>
                        <p style="font-size: 11px; color: #5A6A7E; text-align: center; margin-top: 16px;">BidIntell · <a href="https://bidintell.ai" style="color: #5A6A7E;">bidintell.ai</a> · <a href="https://bidintell.ai/legal" style="color: #5A6A7E;">Privacy &amp; Terms</a></p>
                    </div>
                `
            });

            // Notify Ryan
            await sendEmail({
                to: 'ryan@fsikc.com',
                subject: `🎉 New BidIntell signup: ${fullName} (${userEmail})`,
                htmlBody: `<p>New signup — magic link sent via Postmark.</p><p><strong>Name:</strong> ${fullName}</p><p><strong>Email:</strong> ${userEmail}</p>`
            });

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
