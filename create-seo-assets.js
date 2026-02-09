/**
 * Quick SEO Assets Creation Script
 * Creates placeholder favicon and OG image
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

console.log('🎨 Creating SEO assets...\n');

// Create a simple text-based favicon (will download emoji later)
console.log('Step 1: Creating favicon placeholder...');
console.log('  → Download from: https://emojicdn.elk.sh/🎯');
console.log('  → Save as: favicon.png');

// Create OG image instructions
console.log('\nStep 2: OG Image creation guide:');
console.log('  → Size: 1200x630px');
console.log('  → Tools: Canva.com (free) or Figma');
console.log('  → Include:');
console.log('     - BidIntell logo/name');
console.log('     - Tagline: "AI Decision Intelligence for Construction Bidding"');
console.log('     - Professional construction-themed background');
console.log('  → Export as: og-image.png');
console.log('  → Compress at: tinypng.com');
console.log('  → Save to: /bidiq-mvp/og-image.png');

// Create a simple HTML file to generate placeholder OG image
const ogImageHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BidIntell OG Image</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Arial', sans-serif;
            color: white;
        }
        .logo {
            font-size: 80px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .tagline {
            font-size: 32px;
            text-align: center;
            max-width: 900px;
            line-height: 1.4;
            opacity: 0.95;
        }
        .icon {
            font-size: 120px;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="icon">🎯</div>
    <div class="logo">BidIntell</div>
    <div class="tagline">AI Decision Intelligence for Construction Bidding</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'og-image-template.html'), ogImageHTML, 'utf8');
console.log('\n✅ Created og-image-template.html');
console.log('   → Open this file in browser');
console.log('   → Screenshot it at exactly 1200x630px');
console.log('   → Or use a tool like Puppeteer to generate it');

console.log('\n📝 Quick commands to create assets:');
console.log('\nFor Favicon:');
console.log('  curl "https://emojicdn.elk.sh/🎯" -o favicon.png');
console.log('\nFor OG Image (manual):');
console.log('  1. Open og-image-template.html in browser');
console.log('  2. Take screenshot (use browser dev tools to set viewport to 1200x630)');
console.log('  3. Save as og-image.png');
console.log('  4. Compress at tinypng.com');

console.log('\n⚠️  Or use online tools:');
console.log('  Favicon: https://favicon.io');
console.log('  OG Image: https://www.canva.com (search "Open Graph Image")');
