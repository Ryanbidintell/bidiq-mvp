# BidIQ Beta Email Templates

Use these templates when managing beta applications. Copy/paste into your email client or set up in Postmark/Resend.

---

## 1. Application Received (Auto-send on submit)

**Subject:** We got your BidIQ beta application! 🎯

**Body:**
```
Hi {{contact_name}},

Thanks for applying to the BidIQ beta! We're excited you're interested in smarter bid decisions.

Here's what happens next:
1. We'll review your application within 24-48 hours
2. If approved, you'll get an email with instructions to create your account
3. You'll have free access to BidIQ during the beta period

In the meantime, here's what BidIQ will help you do:
• Analyze bid documents in minutes, not hours
• Get personalized GO/NO-GO recommendations based on YOUR business
• Track your GC relationships and win rates
• Never waste time on bids you shouldn't be chasing

Questions? Just reply to this email.

— The BidIQ Team
hello@bidintell.ai
```

---

## 2. Beta Approved ✅

**Subject:** You're in! 🎉 Welcome to the BidIQ beta

**Body:**
```
Hi {{contact_name}},

Great news — you've been approved for the BidIQ beta!

**Here's how to get started:**

1. Go to: https://app.bidintell.ai (or your hosted URL)
2. Click "Sign Up"
3. Use this email address: {{email}}
4. Create a password
5. Complete the quick setup (takes 2 minutes)

**During the beta, you'll have FREE access to:**
✅ AI-powered bid document analysis
✅ Personalized 0-100 scoring based on your business
✅ GC relationship tracking
✅ Outcome tracking to build your win rate data

**What we ask in return:**
• Use BidIQ on at least 5 real bids
• Give us honest feedback (reply to this email anytime)
• Tell us what's working and what's not

**Questions?** Just reply to this email or reach out at hello@bidintell.ai.

Welcome aboard — let's bid smarter, not harder.

— Ryan
Founder, BidIQ
```

---

## 3. Beta Rejected / Waitlist

**Subject:** BidIQ beta application update

**Body:**
```
Hi {{contact_name}},

Thanks for your interest in BidIQ. Unfortunately, we're not able to add you to the beta at this time.

We're keeping the beta small so we can give each user personalized attention. As spots open up, we'll reach out to folks on our waitlist.

If you'd like to stay in the loop:
• Follow us on LinkedIn: [link]
• We'll email you when we launch publicly

Thanks for understanding, and we hope to work with you soon.

— The BidIQ Team
```

---

## 4. Weekly Check-in (send after 1 week of use)

**Subject:** How's BidIQ working for you?

**Body:**
```
Hi {{contact_name}},

You've been using BidIQ for about a week now — how's it going?

I'd love to hear:
• Have you analyzed any bids yet?
• Is the scoring making sense for your business?
• Anything confusing or frustrating?

Your feedback directly shapes what we build next. Even a one-line reply helps.

If you have 15 minutes this week, I'd also love to jump on a quick call to hear your thoughts in more detail. Just reply with a time that works.

Thanks for being a beta tester!

— Ryan
Founder, BidIQ
hello@bidintell.ai
```

---

## 5. Outcome Reminder (send 14 days after bid analysis)

**Subject:** Quick question about your recent bid

**Body:**
```
Hi {{contact_name}},

Two weeks ago you analyzed "{{project_name}}" in BidIQ.

Do you know the outcome yet? Logging whether you won, lost, or got ghosted helps BidIQ get smarter about which bids are worth your time.

Just log into BidIQ and click "Outcome" on that project, or reply to this email with:
• Won
• Lost (and who won, if you know)
• Ghosted (no response from GC)
• Didn't bid

Takes 30 seconds and makes BidIQ better for everyone.

Thanks!
— BidIQ
```

---

## Postmark/Resend Setup Notes

If you want to automate these emails:

1. **Application Received:** Trigger via Supabase Edge Function on `beta_applications` INSERT
2. **Approval Email:** Trigger via Edge Function on `beta_applications` UPDATE where status = 'approved'
3. **Weekly Check-in:** Set up a cron job to query users who signed up 7 days ago
4. **Outcome Reminder:** Query projects created 14 days ago with outcome = 'pending'

For now, you can send these manually from your email client. Automation comes in Phase 2.
