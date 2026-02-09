# Deploy BidIntell to Netlify

## Quick Deploy (5 minutes)

### 1. Install Netlify CLI
```bash
npm i -g netlify-cli
```

### 2. Login and Deploy
```bash
cd C:\Users\RyanElder\bidiq-mvp
netlify login
netlify init
netlify deploy --prod
```

### 3. Set Environment Variables
In Netlify Dashboard → Site settings → Environment variables:
```
CLAUDE_API_KEY=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
OPENAI_API_KEY=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
```

### 4. Custom Domain
Domain settings → Add domain → beta.bidintell.ai
Update DNS: CNAME → [your-site].netlify.app

### 5. Test API
```bash
curl -X POST https://your-site.netlify.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","operation":"test","text":"test","systemPrompt":"test"}'
```

Done! 🎉
