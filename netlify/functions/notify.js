// Serverless function for sending notifications and emails
// Deploys to Netlify as /.netlify/functions/notify

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

async function sendEmail({ to, subject, htmlBody }) {
    const isInternalOnly = to === 'ryan@fsikc.com';
    const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': POSTMARK_API_KEY
        },
        body: JSON.stringify({
            From: 'hello@bidintell.ai',
            To: to,
            ...(isInternalOnly ? {} : { Bcc: 'ryan@bidintell.ai' }),
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: 'outbound'
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
                to: 'ryan@fsikc.com',
                subject: `🚨 BidIntell Error: ${errorType}`,
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

            await sendEmail({ to: 'ryan@fsikc.com', subject: contactSubject, htmlBody: contactHtml });

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
                htmlBody: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#0B0F14;padding:20px 28px;border-radius:8px 8px 0 0;border-bottom:3px solid #F26522;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="background:#F26522;border-radius:5px;width:28px;height:28px;text-align:center;vertical-align:middle;font-family:monospace;font-weight:700;font-size:11px;color:#ffffff;letter-spacing:-1px;">BI</td>
                <td style="padding-left:10px;font-weight:700;font-size:18px;color:#F8FAFC;">BidIntell</td>
              </tr></table>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Hero stat -->
      <tr>
        <td style="background:#141A23;padding:28px 28px 0;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#F8FAFC;">Your bid economics snapshot</p>
          <p style="margin:0 0 24px;font-size:14px;color:#94A3B8;">Based on the numbers you entered in the calculator.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#1C2533;border-radius:6px;padding:20px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94A3B8;">Potential additional margin / year</p>
                <p style="margin:0;font-size:40px;font-weight:700;color:#22C55E;font-family:monospace;line-height:1;">${fmt(addlMargin)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Stats table -->
      <tr>
        <td style="background:#141A23;padding:20px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
            <tr>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#94A3B8;">Bids reviewed / year</td>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#F8FAFC;text-align:right;font-family:monospace;font-weight:600;">${bids}</td>
            </tr>
            <tr>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#94A3B8;">Hours per bid evaluation</td>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#F8FAFC;text-align:right;font-family:monospace;font-weight:600;">${hours} hrs</td>
            </tr>
            <tr>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#94A3B8;">Current win rate</td>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#F8FAFC;text-align:right;font-family:monospace;font-weight:600;">${winRate}%</td>
            </tr>
            <tr>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#94A3B8;">Average project value</td>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#F8FAFC;text-align:right;font-family:monospace;font-weight:600;">${fmt(avgValue)}</td>
            </tr>
            <tr>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#94A3B8;">Net margin</td>
              <td style="padding:11px 0;border-bottom:1px solid #384254;color:#F8FAFC;text-align:right;font-family:monospace;font-weight:600;">${margin}%</td>
            </tr>
            <tr>
              <td style="padding:11px 0;color:#94A3B8;">Estimating hours saved / year</td>
              <td style="padding:11px 0;color:#22C55E;text-align:right;font-family:monospace;font-weight:600;">−${hoursSaved} hrs</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="background:#141A23;padding:0 28px 28px;text-align:center;">
          <a href="https://bidintell.ai/#apply" style="display:inline-block;background:#F26522;color:#ffffff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">Get Started Free →</a>
        </td>
      </tr>

      <!-- Footer text -->
      <tr>
        <td style="background:#0B0F14;padding:20px 28px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;font-size:13px;color:#5A6A7E;line-height:1.6;">These numbers are based on industry averages and your inputs. Actual results will vary — and get more accurate the more you use BidIntell to track real outcomes.</p>
          <p style="margin:0;font-size:13px;color:#5A6A7E;">— Ryan<br><em>Founder, BidIntell</em></p>
        </td>
      </tr>

      <!-- Legal -->
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94A3B8;">BidIntell &middot; <a href="https://bidintell.ai" style="color:#94A3B8;text-decoration:none;">bidintell.ai</a> &middot; <a href="https://bidintell.ai/legal" style="color:#94A3B8;text-decoration:none;">Privacy &amp; Terms</a></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`
            });

            // Internal notification
            await sendEmail({
                to: 'ryan@fsikc.com',
                subject: `📊 New ROI calculator lead: ${userEmail}`,
                htmlBody: `<p>New ROI calculator lead captured.</p><p><strong>Email:</strong> ${userEmail}</p><p><strong>Numbers:</strong> ${bids} bids/yr, ${hours} hrs/bid, ${winRate}% win rate, ${fmt(avgValue)} avg value, ${margin}% margin</p><p><strong>Projected additional margin:</strong> ${fmt(addlMargin)}/yr</p>`
            });

            // Log to admin_events for founder dashboard (fire-and-forget)
            const sbUrl = process.env.SUPABASE_URL || 'https://szifhqmrddmdkgschkkw.supabase.co';
            const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (sbKey) {
                fetch(`${sbUrl}/rest/v1/admin_events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': sbKey,
                        'Authorization': `Bearer ${sbKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        event_type: 'roi_lead',
                        user_id: null,
                        event_data: { email: userEmail, bids, hours, winRate, avgValue, margin, hoursSaved, addlMargin }
                    })
                }).catch(err => console.warn('roi_lead event log failed:', err));
            }

            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // ── Magic link (bypass Supabase email, send via Postmark) ────────────
        if (emailType === 'magic_link') {
            const { userEmail } = body;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
            const supabaseUrl = 'https://szifhqmrddmdkgschkkw.supabase.co';

            const generateLink = async (type) => {
                const payload = { type, email: userEmail, redirect_to: 'https://bidintell.ai/app' };
                // Some Supabase versions require a password field for signup type
                if (type === 'signup') payload.password = Math.random().toString(36).slice(-12) + 'A1!';
                return fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            };

            // Try magic link (existing user) first; fall back to signup (new user)
            let linkRes = await generateLink('magiclink');
            let isNewUser = false;
            if (!linkRes.ok) {
                const firstErr = await linkRes.json().catch(() => ({}));
                console.log('magiclink failed, trying signup fallback. Error:', JSON.stringify(firstErr));
                linkRes = await generateLink('signup');
                isNewUser = true;
                if (!linkRes.ok) {
                    const err2 = await linkRes.json().catch(() => ({}));
                    throw new Error(`generate_link failed (magiclink: ${firstErr.message || firstErr.msg || '?'}, signup: ${err2.message || err2.msg || linkRes.status})`);
                }
            }

            const linkData = await linkRes.json();
            console.log('generate_link response keys:', Object.keys(linkData));
            const action_link = linkData.action_link || linkData.properties?.action_link;
            if (!action_link) throw new Error(`No action_link in response: ${JSON.stringify(linkData)}`);

            // Extract first name from Supabase user_metadata (populated by OAuth providers)
            const rawName = linkData.user_metadata?.full_name || linkData.user_metadata?.name || linkData.user_metadata?.first_name || '';
            const firstName = rawName.split(' ')[0] || '';

            // Pass the full action_link to our /auth intermediate page.
            // We don't rebuild the URL ourselves — Supabase may use token or token_hash
            // depending on project version. SafeLinks protection is still intact because
            // /auth shows a button and never auto-redirects.
            const safeLoginUrl = `https://bidintell.ai/auth?link=${encodeURIComponent(action_link)}`;

            // Send login link email to user — this MUST succeed
            await sendEmail({
                to: userEmail,
                subject: firstName ? `Your BidIntell login link, ${firstName}` : `Your BidIntell login link`,
                htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; color: #111;">
                        <div style="padding: 32px 0 16px; text-align: center;">
                            <span style="display: inline-block; background: #F26522; color: white; font-weight: 800; font-size: 15px; letter-spacing: -0.02em; padding: 8px 14px; border-radius: 6px;">BidIntell</span>
                        </div>
                        <div style="padding: 8px 32px 40px;">
                            <h2 style="font-size: 22px; font-weight: 700; color: #111; margin: 0 0 12px;">${firstName ? `Hey ${firstName} — here's your login link` : `Here's your login link`}</h2>
                            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">Click the button below to sign in to BidIntell. This link expires in 24 hours and can only be used once.</p>
                            <div style="text-align: center; margin: 0 0 32px;">
                                <a href="${safeLoginUrl}" style="display: inline-block; background: #F26522; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 36px; border-radius: 6px;">Sign in to BidIntell &rarr;</a>
                            </div>
                            <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0;">If you didn't request this link, you can safely ignore this email.<br>Questions? Reply to this email — we read every one.</p>
                        </div>
                        <div style="border-top: 1px solid #eee; padding: 16px 32px; text-align: center;">
                            <p style="font-size: 12px; color: #aaa; margin: 0;">BidIntell · <a href="https://bidintell.ai" style="color: #aaa;">bidintell.ai</a> · <a href="https://bidintell.ai/legal" style="color: #aaa;">Privacy &amp; Terms</a></p>
                        </div>
                    </div>
                `
            });

            // Internal notification — fire and forget, never block user on this
            sendEmail({
                to: 'ryan@fsikc.com',
                subject: isNewUser ? `New signup: ${userEmail}` : `Login link sent: ${userEmail}`,
                htmlBody: isNewUser
                    ? `<p>New user — magic link sent.</p><p><strong>Email:</strong> ${userEmail}</p>`
                    : `<p>Login link sent to existing user.</p><p><strong>Email:</strong> ${userEmail}</p>`
            }).catch(e => console.log('Notification email failed (non-blocking):', e.message));

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
