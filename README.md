# 🎯 BidIQ MVP Deployment Package

**Date:** January 29, 2026  
**Status:** Ready for Beta Launch

---

## Quick File Reference

### 🌐 Deploy These Files

| File | Rename To | Purpose |
|------|-----------|---------|
| `BidIQ_Landing_Page.html` | `index.html` | Landing page + Beta signup (bidintell.ai) |
| `BidIQ_MVP_App.html` | `app.html` | Main app after login (bidintell.ai/app) |
| `BidIQ_Founder_Dashboard.html` | `admin.html` | Your admin panel (keep private) |
| `roi-calculator.html` | `roi.html` | Marketing tool (optional) |

### 🗄️ Run in Supabase

| File | Purpose |
|------|---------|
| `supabase_schema_complete.sql` | Creates all database tables |

### 📚 Reference Documents

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment instructions |
| `BidIQ_Product_Bible_v1_4.md` | Product specifications |
| `BidIQ_Brand_Guide.md` | Brand & messaging guidelines |
| `bidiq_email_templates.md` | Email templates for beta management |

---

## ⚡ Quick Start

1. **Run** `supabase_schema_complete.sql` in Supabase SQL Editor
2. **Update** API keys in HTML files (search for `SUPABASE_URL`)
3. **Rename** files as shown above
4. **Deploy** to Netlify or Vercel
5. **Test** full user flow
6. **Launch** to beta users!

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 🔑 Keys You Need

Before deploying, get these credentials:

1. **Supabase Project URL** - From Supabase Dashboard → Settings → API
2. **Supabase Anon Key** - Same location
3. **Claude API Key** - From console.anthropic.com
4. **Your Admin Email** - For founder dashboard access

---

## ✅ Pre-Launch Checklist

- [ ] Database schema deployed
- [ ] API keys updated in all HTML files
- [ ] Files renamed correctly
- [ ] Deployed to hosting
- [ ] Domain configured
- [ ] Full flow tested
- [ ] Beta users identified

---

**Good luck with the launch! 🚀**
