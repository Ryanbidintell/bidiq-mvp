// Send FOUNDING30 coupon email to all beta users
// Usage: node scripts/send-founding30.js
// BCC: ryan@bidintell.ai on every send

const POSTMARK_API_KEY = 'a66ac8e5-fa8e-47ce-ac5d-3ef35318371e';
const FROM = 'hello@bidintell.ai';
const BCC = 'ryan@bidintell.ai';
const COUPON = 'FOUNDING30';

const users = [
  { email: 'cstergos@fdccontract.com',    company: 'FDC Contract',              name: 'Chris'   },
  { email: 'justin@regentsflooring.com',  company: 'Regents Flooring',          name: 'Justin'  },
  { email: 'hhigley@whstovall.com',       company: 'WH Stovall',                name: null      },
  { email: 'm_payne@schuttelumber.com',   company: 'Schutte Lumber',            name: null      },
  { email: 'brennank@summitsealants.com', company: 'Summit Sealants',           name: 'Brennan' },
  { email: 'awelsh@peikc.com',            company: null,                        name: null      },
];

function buildEmail(user) {
  const greeting = user.name ? `Hi ${user.name},` : 'Hi,';
  const companyLine = user.company ? ` at ${user.company}` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <span style="font-size:22px;font-weight:700;color:#F8FAFC;">BidIntell</span>
    </div>

    <p style="color:#CBD5E1;font-size:15px;line-height:1.7;margin-bottom:16px;">${greeting}</p>

    <p style="color:#CBD5E1;font-size:15px;line-height:1.7;margin-bottom:16px;">
      You've been one of our beta users${companyLine}, and I want to make sure you get the best deal before the window closes.
    </p>

    <p style="color:#CBD5E1;font-size:15px;line-height:1.7;margin-bottom:24px;">
      As a founding member, you get <strong style="color:#F8FAFC;">30% off any plan — forever</strong>, as long as you stay subscribed.
    </p>

    <!-- Coupon box -->
    <div style="background:#1E293B;border:2px dashed #3B82F6;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
      <div style="font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your founding member coupon</div>
      <div style="font-size:32px;font-weight:700;color:#3B82F6;letter-spacing:3px;">${COUPON}</div>
      <div style="font-size:13px;color:#64748B;margin-top:8px;">Enter at checkout · 30% off forever</div>
    </div>

    <!-- Pricing -->
    <div style="background:#1E293B;border-radius:12px;padding:20px;margin-bottom:28px;">
      <div style="font-size:13px;color:#94A3B8;margin-bottom:12px;font-weight:600;">Plans after your discount</div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #334155;">
        <span style="color:#CBD5E1;font-size:14px;">Solo <span style="color:#64748B;font-size:12px;">(1 seat)</span></span>
        <span style="color:#F8FAFC;font-size:14px;font-weight:600;"><s style="color:#64748B;font-size:12px;">$49</s> $34/mo</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #334155;">
        <span style="color:#CBD5E1;font-size:14px;">Team <span style="color:#64748B;font-size:12px;">(up to 3 seats)</span></span>
        <span style="color:#F8FAFC;font-size:14px;font-weight:600;"><s style="color:#64748B;font-size:12px;">$99</s> $69/mo</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;">
        <span style="color:#CBD5E1;font-size:14px;">Company <span style="color:#64748B;font-size:12px;">(up to 8 seats)</span></span>
        <span style="color:#F8FAFC;font-size:14px;font-weight:600;"><s style="color:#64748B;font-size:12px;">$179</s> $125/mo</span>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://app.bidintell.ai" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;">
        Subscribe with ${COUPON} →
      </a>
    </div>

    <p style="color:#94A3B8;font-size:13px;line-height:1.6;margin-bottom:8px;">
      You'll enter the coupon code at checkout. There's a 7-day free trial — no charge until you're sure it's working for you.
    </p>

    <p style="color:#94A3B8;font-size:13px;line-height:1.6;margin-bottom:24px;">
      Questions? Just reply to this email.
    </p>

    <div style="border-top:1px solid #1E293B;padding-top:20px;">
      <p style="color:#475569;font-size:12px;margin:0;">— Ryan Elder, Founder<br>BidIntell · <a href="https://bidintell.ai" style="color:#475569;">bidintell.ai</a></p>
    </div>

  </div>
</body>
</html>`;

  return {
    From: FROM,
    To: user.email,
    Bcc: BCC,
    Subject: `Your founding member code: ${COUPON} (30% off forever)`,
    HtmlBody: html,
    MessageStream: 'outbound'
  };
}

async function send(payload) {
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_KEY
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function main() {
  console.log(`Sending FOUNDING30 to ${users.length} users...\n`);
  for (const user of users) {
    try {
      const payload = buildEmail(user);
      const result = await send(payload);
      console.log(`✅ ${user.email} — MessageID: ${result.MessageID}`);
    } catch (err) {
      console.error(`❌ ${user.email} — ${err.message}`);
    }
  }
  console.log('\nDone. Check ryan@bidintell.ai for BCCs.');
}

main();
