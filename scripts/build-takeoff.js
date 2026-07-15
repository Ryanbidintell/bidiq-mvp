#!/usr/bin/env node
// scripts/build-takeoff.js
//
// Compiles content/takeoff/*.md → takeoff/index.html (card grid) +
// takeoff/[slug]/index.html (article pages). Hand-rolled markdown parser,
// zero npm dependencies. Run as part of Netlify build.
//
// Frontmatter per article:
//   title:           "Article Title"               (used for visible H1 + breadcrumb)
//   seoTitle:        "Short title <=48 chars"      (optional — drives <title>/og:title/twitter:title; falls back to title)
//   excerpt:         "1-2 sentence pull"           (used for the card grid on the hub)
//   seoDescription:  "<=160 char meta description" (optional — drives meta description + schema; falls back to excerpt)
//   category:        "Bid Strategy" | "Contract Risk" | "Win Rate" | etc.
//   readTime:        "8 min read"
//   publishedAt:     "2026-05-15"
//   slug:            "kebab-case-slug"
//
// Articles sorted by publishedAt desc on the index page.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'content', 'takeoff');
const OUTPUT_DIR = path.join(REPO_ROOT, 'takeoff');
const SITE_ORIGIN = 'https://bidintell.ai';

// =====================================================================
// Frontmatter parser — simple YAML-like key: value
// =====================================================================
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: match[2] };
}

// =====================================================================
// FAQ extractor — finds `## FAQ` / `## FAQs` section and pulls
// **Question?** + following paragraph pairs for FAQPage schema.
// Schema stays aligned with visible content because both come from
// the same source.
// =====================================================================
function extractFaqs(body) {
  const lines = body.split(/\r?\n/);
  const faqs = [];
  let inFaqSection = false;
  let currentQ = null;
  let currentA = [];
  const finalize = () => {
    if (currentQ) {
      const answer = currentA.join(' ').trim();
      if (answer) faqs.push({ question: currentQ, answer });
    }
    currentQ = null;
    currentA = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+FAQs?\s*$/i.test(line)) { inFaqSection = true; continue; }
    if (!inFaqSection) continue;
    // Next H1/H2 ends the FAQ section
    if (/^#{1,2}\s+/.test(line)) { finalize(); inFaqSection = false; continue; }
    const qMatch = line.match(/^\*\*([^*]+?)\*\*\s*$/);
    if (qMatch) { finalize(); currentQ = qMatch[1].trim(); continue; }
    if (line === '' && currentA.length > 0) { finalize(); continue; }
    if (currentQ && line && !line.startsWith('---')) currentA.push(line);
  }
  finalize();
  return faqs;
}

// =====================================================================
// Markdown → HTML (regex-based, supports the subset we need)
// =====================================================================
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GitHub-compatible slug: lowercase, strip punctuation except hyphens, spaces → hyphens
function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderInline(s) {
  // Process inline code first so we don't mangle markdown inside
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic (single asterisk, not part of bold)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function renderTable(rows) {
  const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
  const headers = cells(rows[0]);
  const dataRows = rows.slice(2);
  let out = '<div class="article-table-wrap"><table class="article-table">\n<thead><tr>';
  out += headers.map((h) => `<th>${renderInline(h)}</th>`).join('');
  out += '</tr></thead>\n<tbody>';
  for (const r of dataRows) {
    const c = cells(r);
    out += '<tr>' + c.map((x) => `<td>${renderInline(x)}</td>`).join('') + '</tr>\n';
  }
  out += '</tbody></table></div>';
  return out;
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push('<hr/>');
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      // Skip H1 in body — frontmatter title becomes the page H1 to avoid duplication.
      if (level === 1) { i++; continue; }
      const id = slugify(text);
      out.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote><p>${renderInline(buf.join(' '))}</p></blockquote>`);
      continue;
    }

    // Table (heuristic: starts with | and next line is the separator)
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    // Unordered list
    if (/^[\-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\-*]\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^[\-*]\s+/, '')));
        i++;
      }
      out.push('<ul>' + items.map((t) => `<li>${t}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\d+\.\s+/, '')));
        i++;
      }
      out.push('<ol>' + items.map((t) => `<li>${t}</li>`).join('') + '</ol>');
      continue;
    }

    // Blank line — paragraph separator
    if (line.trim() === '') { i++; continue; }

    // Paragraph — accumulate until blank/structural line
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('```') &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^[\-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith('|')
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) out.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

// =====================================================================
// HTML templates — shared chrome (nav, CTA strip, footer, CSS vars)
// =====================================================================
function getStyles() {
  return `
:root {
  --paper: #F4F1EA;
  --paper-2: #ECE7DC;
  --paper-card: #FBFAF6;
  --ink: #17130E;
  --ink-deep: #0F0C08;
  --ink-body: #4A4238;
  --ink-body-2: #3A342B;
  --muted: #8A8072;
  --muted-dark: #6B6255;
  --line: #D8D1C2;
  --line-2: #E4DCCC;
  --accent: #E4562A;
  --accent-dark: #C8461F;
  --teal: #1F5C6E;
  --go: #3F8F5B;
  --review: #C98A2B;
  --pass: #C24A3A;
  --radius: 7px;
  --radius-lg: 12px;
  --display: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
  --font: 'IBM Plex Sans', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', monospace;
}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; font-size: 16px; }
body { font-family: var(--font); background: var(--paper); color: var(--ink-body); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
a { color: var(--teal); text-decoration: none; }
a:hover { color: var(--accent); }
img { max-width: 100%; display: block; }
.container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

/* NAV */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(244,241,234,0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.nav-inner { max-width: 1160px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 24px; }
.nav-logo { display: flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 800; font-size: 1.15rem; color: var(--ink); letter-spacing: -0.02em; }
.logo-mark { width: 30px; height: 30px; background: var(--accent); border-radius: 5px; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 0.9rem; font-weight: 900; color: #F4F1EA; letter-spacing: -0.02em; flex-shrink: 0; }
.nav-links { display: flex; align-items: center; gap: 28px; list-style: none; }
.nav-links a { font-size: 0.875rem; font-weight: 500; color: var(--ink-body-2); transition: color 0.2s; white-space: nowrap; }
.nav-links a:hover { color: var(--accent); }
.nav-links a.active { color: var(--ink); font-weight: 600; }
.nav-actions { display: flex; align-items: center; gap: 14px; }
.nav-signin { font-size: 0.875rem; font-weight: 600; color: var(--ink); white-space: nowrap; }
.nav-signin:hover { color: var(--accent); }
.nav-cta { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--accent); color: #F4F1EA !important; border-radius: var(--radius); font-weight: 700; font-size: 0.875rem; transition: background 0.2s, transform 0.15s; white-space: nowrap; }
.nav-cta:hover { background: var(--accent-dark); transform: translateY(-1px); }
.mobile-menu-btn { display: none; background: none; border: none; color: var(--ink-body); cursor: pointer; padding: 8px; }

/* HERO */
.page-hero { padding: 150px 0 66px; position: relative; }
.page-hero .container { position: relative; }
.eyebrow { display: inline-flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 0.78rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 18px; }
.page-hero h1 { font-family: var(--display); font-size: clamp(2rem, 4.4vw, 3.1rem); font-weight: 800; color: var(--ink); line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 18px; max-width: 820px; }
.page-hero .lede { font-size: 1.15rem; color: var(--ink-body); max-width: 640px; line-height: 1.6; }

/* ARTICLE CARDS */
.articles-section { padding: 40px 0 110px; }
.articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.article-card { background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 30px 26px; display: flex; flex-direction: column; transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s; }
.article-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 18px 40px -28px rgba(23,19,14,0.4); }
.category-tag { display: inline-block; font-family: var(--mono); font-size: 0.68rem; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
.article-card h2 { font-family: var(--display); font-size: 1.2rem; font-weight: 700; color: var(--ink); line-height: 1.28; letter-spacing: -0.015em; margin-bottom: 12px; }
.article-card h2 a { color: var(--ink); }
.article-card h2 a:hover { color: var(--accent); }
.article-card .excerpt { font-size: 0.92rem; color: var(--ink-body); line-height: 1.6; margin-bottom: 22px; flex-grow: 1; }
.article-card .card-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--line-2); font-family: var(--mono); font-size: 0.76rem; color: var(--muted); }
.article-card .read-more { color: var(--accent); font-weight: 600; }
.article-card .read-more:hover { color: var(--ink); }
@media (max-width: 960px) { .articles-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .articles-grid { grid-template-columns: 1fr; } }

/* RELATED GUIDES (article footer) */
.related-section { padding: 24px 0 80px; border-top: 1px solid var(--line); }
.related-heading { font-family: var(--display); font-size: 1.4rem; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 26px; }

/* ARTICLE PAGE */
.article-hero { padding: 130px 0 34px; position: relative; }
.article-hero .container { position: relative; max-width: 760px; }
.article-hero .breadcrumb { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); margin-bottom: 18px; }
.article-hero .breadcrumb a { color: var(--teal); }
.article-hero .breadcrumb a:hover { color: var(--accent); }
.article-hero .eyebrow { margin-bottom: 14px; }
.article-hero h1 { font-family: var(--display); font-size: clamp(1.875rem, 4vw, 2.6rem); font-weight: 800; color: var(--ink); line-height: 1.08; letter-spacing: -0.025em; margin-bottom: 18px; }
.article-hero .meta-row { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.article-hero .meta-row span { display: inline-flex; align-items: center; gap: 6px; }

.article-body-wrap { padding: 16px 0 90px; }
.article-body-wrap .container { max-width: 720px; }
.article-body { font-size: 1.05rem; line-height: 1.75; color: var(--ink-body); }
.article-body p { margin-bottom: 22px; }
.article-body h2 { font-family: var(--display); font-size: 1.55rem; font-weight: 800; color: var(--ink); margin-top: 46px; margin-bottom: 16px; letter-spacing: -0.02em; line-height: 1.2; }
.article-body h3 { font-family: var(--display); font-size: 1.22rem; font-weight: 700; color: var(--ink); margin-top: 34px; margin-bottom: 12px; letter-spacing: -0.015em; }
.article-body h4 { font-family: var(--display); font-size: 1.05rem; font-weight: 700; color: var(--ink); margin-top: 26px; margin-bottom: 10px; }
.article-body a { color: var(--teal); border-bottom: 1px solid rgba(31,92,110,0.35); transition: border-color 0.15s, color 0.15s; }
.article-body a:hover { color: var(--accent); border-color: var(--accent); }
.article-body strong { color: var(--ink); font-weight: 700; }
.article-body em { color: var(--ink-body); font-style: italic; }
.article-body ul, .article-body ol { margin: 0 0 22px 24px; }
.article-body li { margin-bottom: 8px; }
.article-body code { font-family: var(--mono); font-size: 0.9em; background: var(--paper-2); padding: 2px 6px; border-radius: 4px; color: var(--ink); }
.article-body pre { background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin: 0 0 22px; overflow-x: auto; }
.article-body pre code { background: transparent; padding: 0; font-size: 0.9rem; line-height: 1.6; color: var(--ink-body); }
.article-body blockquote { border-left: 3px solid var(--accent); padding: 6px 0 6px 22px; margin: 0 0 22px; color: var(--muted-dark); font-style: italic; }
.article-body blockquote p { margin: 0; }
.article-body hr { border: none; border-top: 1px solid var(--line); margin: 40px 0; }
.article-body .article-table-wrap { overflow-x: auto; margin: 0 0 28px; }
.article-body .article-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.article-body .article-table th, .article-body .article-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--line); }
.article-body .article-table th { background: var(--paper-2); color: var(--ink); font-weight: 600; font-family: var(--mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
.article-body .article-table td { color: var(--ink-body); }
.article-body .article-table tr:last-child td { border-bottom: none; }

/* CTA STRIP */
.cta-section { padding: 88px 0; background: var(--ink); text-align: center; }
.cta-section .container { position: relative; z-index: 1; }
.cta-section h2 { font-family: var(--display); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 800; color: #F4F1EA; letter-spacing: -0.025em; margin-bottom: 14px; }
.cta-section p { font-size: 1.05rem; color: #B8AF9F; margin-bottom: 30px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.7; }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 15px 30px; background: var(--accent); color: #F4F1EA; border: none; border-radius: var(--radius); font-family: var(--font); font-size: 0.98rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: -0.01em; text-decoration: none; }
.btn-primary:hover { background: var(--accent-dark); transform: translateY(-2px); box-shadow: 0 10px 26px rgba(228,86,42,0.3); color: #F4F1EA; }

/* FOOTER */
.footer { padding: 44px 0 48px; background: var(--ink-deep); }
.footer-inner { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
.footer-left { display: flex; align-items: center; gap: 12px; }
.footer-wordmark { font-family: var(--display); font-weight: 800; font-size: 1rem; color: #F4F1EA; }
.footer-links { display: flex; gap: 22px; list-style: none; flex-wrap: wrap; }
.footer-links a { font-size: 0.82rem; color: var(--muted); transition: color 0.2s; }
.footer-links a:hover { color: #F4F1EA; }
.footer-copy-line { border-top: 1px solid #1E1913; margin-top: 28px; padding-top: 20px; text-align: center; font-family: var(--mono); font-size: 0.72rem; color: #544C41; }

@media (max-width: 860px) {
  .nav-links { display: none; }
}
@media (max-width: 768px) {
  .footer-inner { flex-direction: column; align-items: flex-start; }
}
`;
}

function getNav(activePath) {
  const takeoffActive = activePath === '/takeoff/' ? ' class="active"' : '';
  return `<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <div class="logo-mark">BI</div>
      BidIntell
    </a>
    <ul class="nav-links">
      <li><a href="/#how">How It Works</a></li>
      <li><a href="/#features">Features</a></li>
      <li><a href="/#scoring">BidIndex</a></li>
      <li><a href="/takeoff/"${takeoffActive}>Take-Off</a></li>
      <li><a href="/#pricing">Pricing</a></li>
    </ul>
    <div class="nav-actions">
      <a href="/app?utm_source=website&utm_medium=takeoff&utm_campaign=nav" class="nav-signin">Sign In</a>
      <a href="/app?utm_source=website&utm_medium=takeoff&utm_campaign=nav&utm_content=takeoff_nav" class="nav-cta">Start Free Trial</a>
    </div>
    <button class="mobile-menu-btn" aria-label="Menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
  </div>
</nav>`;
}

function getCtaSection() {
  return `<section class="cta-section">
  <div class="container">
    <h2>Score your next bid in under 2 minutes.</h2>
    <p>7-day free trial. No credit card at signup.</p>
    <a href="/app?utm_source=website&utm_medium=takeoff&utm_campaign=cta&utm_content=bottom" class="btn-primary" onclick="if(typeof gtag==='function')gtag('event','cta_click',{cta_location:'takeoff_bottom',cta_text:'Score Your First Bid Free'})">Score Your First Bid Free</a>
  </div>
</section>`;
}

function getFooter() {
  return `<footer class="footer">
  <div class="container">
    <div class="footer-inner">
      <div class="footer-left">
        <div class="logo-mark">BI</div>
        <span class="footer-wordmark">BidIntell</span>
      </div>
      <ul class="footer-links">
        <li><a href="/">Home</a></li>
        <li><a href="/takeoff/">Take-Off</a></li>
        <li><a href="/diagnostic">Diagnostic</a></li>
        <li><a href="/bid-no-bid-checklist">Bid/No-Bid Checklist</a></li>
        <li><a href="/legal#privacy">Privacy</a></li>
        <li><a href="/legal#terms">Terms</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
    <div class="footer-copy-line">© 2026 BidIntell · Built by the industry, for the industry.</div>
  </div>
</footer>`;
}

function getAnalytics() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XGYJLV0E6G"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-XGYJLV0E6G');</script>
<script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vtnhbrqro2");</script>`;
}

function formatDate(iso) {
  // Returns e.g. "May 15, 2026"
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// =====================================================================
// Index page
// =====================================================================
function renderIndex(articles) {
  const cards = articles.map((a) => `
        <article class="article-card">
          <p class="category-tag">${escapeHtml(a.meta.category || 'Article')}</p>
          <h2><a href="/takeoff/${a.meta.slug}/">${escapeHtml(a.meta.title)}</a></h2>
          <p class="excerpt">${escapeHtml(a.meta.excerpt || '')}</p>
          <div class="card-meta">
            <span>${escapeHtml(a.meta.readTime || '')}</span>
            <a href="/takeoff/${a.meta.slug}/" class="read-more">Read more →</a>
          </div>
        </article>`).join('\n');

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': articles.map((a, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'url': `${SITE_ORIGIN}/takeoff/${a.meta.slug}/`,
      'name': a.meta.title,
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Take-Off: Bid Strategy for Commercial Subs | BidIntell</title>
  <meta name="description" content="Practical bid strategy guides for commercial subcontractors — bid qualification, win-rate math, contract risk, pricing. Written for estimators, by the field.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_ORIGIN}/takeoff/">
  <link rel="icon" href="/favicon.png">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_ORIGIN}/takeoff/">
  <meta property="og:title" content="Take-Off: Bid Strategy for Commercial Subs | BidIntell">
  <meta property="og:description" content="Practical bid strategy guides for commercial subcontractors — bid qualification, win-rate math, contract risk, pricing. Written for estimators, by the field.">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
  <meta property="og:site_name" content="BidIntell">
  <meta property="og:locale" content="en_US">
  <meta http-equiv="content-language" content="en-US">

  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${SITE_ORIGIN}/takeoff/">
  <meta property="twitter:title" content="Take-Off: Bid Strategy for Commercial Subs | BidIntell">
  <meta property="twitter:description" content="Practical bid strategy guides for commercial subcontractors — bid qualification, win-rate math, contract risk, pricing.">
  <meta property="twitter:image" content="${SITE_ORIGIN}/og-image.png">

  <link rel="alternate" type="text/markdown" title="LLM-friendly site description" href="/llms.txt">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "${SITE_ORIGIN}/takeoff/#collection",
        "name": "Take-Off: Bid Strategy for Commercial Subs",
        "description": "Practical bid strategy guides for commercial subcontractors — bid qualification, win-rate math, contract risk, pricing.",
        "url": "${SITE_ORIGIN}/takeoff/",
        "inLanguage": "en-US",
        "isPartOf": { "@id": "${SITE_ORIGIN}/#website" },
        "publisher": { "@type": "Organization", "name": "BidIntell", "url": "${SITE_ORIGIN}" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE_ORIGIN}/" },
          { "@type": "ListItem", "position": 2, "name": "Take-Off", "item": "${SITE_ORIGIN}/takeoff/" }
        ]
      },
      ${JSON.stringify(itemList, null, 6).replace(/^/gm, '      ').trim()}
    ]
  }
  </script>

  ${getAnalytics()}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${getStyles()}</style>
</head>
<body>
  ${getNav('/takeoff/')}

  <section class="page-hero">
    <div class="container">
      <p class="eyebrow">Take-Off</p>
      <h1>Practical guides for estimators who are done guessing.</h1>
      <p class="lede">Short reads on bid strategy, contract risk, and building a smarter estimating operation.</p>
    </div>
  </section>

  <section class="articles-section">
    <div class="container">
      <div class="articles-grid">
${cards}
      </div>
    </div>
  </section>

  ${getCtaSection()}
  ${getFooter()}
</body>
</html>
`;
}

// =====================================================================
// Related guides block — picks up to 3 other articles, same category
// first, then most recent. Internal-linking + GEO discovery, real URLs.
// =====================================================================
function pickRelated(current, allArticles, limit = 3) {
  return allArticles
    .filter((a) => a.meta.slug !== current.meta.slug)
    .sort((a, b) => {
      const aSame = a.meta.category === current.meta.category ? 0 : 1;
      const bSame = b.meta.category === current.meta.category ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return (b.meta.publishedAt || '').localeCompare(a.meta.publishedAt || '');
    })
    .slice(0, limit);
}

function renderRelated(related) {
  if (!related.length) return '';
  const cards = related.map((a) => `
        <article class="article-card">
          <p class="category-tag">${escapeHtml(a.meta.category || 'Article')}</p>
          <h2><a href="/takeoff/${a.meta.slug}/">${escapeHtml(a.meta.title)}</a></h2>
          <p class="excerpt">${escapeHtml(a.meta.excerpt || '')}</p>
          <div class="card-meta">
            <span>${escapeHtml(a.meta.readTime || '')}</span>
            <a href="/takeoff/${a.meta.slug}/" class="read-more">Read more →</a>
          </div>
        </article>`).join('\n');
  return `<section class="related-section">
    <div class="container">
      <h2 class="related-heading">Related guides</h2>
      <div class="articles-grid">
${cards}
      </div>
    </div>
  </section>`;
}

// =====================================================================
// Article page
// =====================================================================
function renderArticle(article, allArticles = []) {
  const m = article.meta;
  const bodyHtml = renderMarkdown(article.body);
  const canonical = `${SITE_ORIGIN}/takeoff/${m.slug}/`;
  const seoTitle = m.seoTitle || m.title;
  const seoDescription = m.seoDescription || m.excerpt || '';
  const faqs = extractFaqs(article.body);
  const related = pickRelated(article, allArticles);
  const faqSchemaEntry = faqs.length === 0 ? '' : `,
      {
        "@type": "FAQPage",
        "@id": "${canonical}#faq",
        "mainEntity": [
          ${faqs.map((f) => `{ "@type": "Question", "name": ${JSON.stringify(f.question)}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.answer)} } }`).join(',\n          ')}
        ]
      }`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)} | BidIntell</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.png">

  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
  <meta property="og:site_name" content="BidIntell">
  <meta property="og:locale" content="en_US">
  <meta http-equiv="content-language" content="en-US">
  <meta property="article:published_time" content="${escapeHtml(m.publishedAt || '')}">
  <meta property="article:section" content="${escapeHtml(m.category || '')}">

  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${canonical}">
  <meta property="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta property="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta property="twitter:image" content="${SITE_ORIGIN}/og-image.png">

  <link rel="alternate" type="text/markdown" title="LLM-friendly site description" href="/llms.txt">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "${canonical}#article",
        "headline": ${JSON.stringify(m.title)},
        "description": ${JSON.stringify(seoDescription)},
        "url": "${canonical}",
        "datePublished": "${escapeHtml(m.publishedAt || '')}",
        "dateModified": "${escapeHtml(m.publishedAt || '')}",
        "inLanguage": "en-US",
        "articleSection": ${JSON.stringify(m.category || '')},
        "author": { "@type": "Organization", "name": "BidIntell", "url": "${SITE_ORIGIN}" },
        "publisher": {
          "@type": "Organization",
          "name": "BidIntell",
          "url": "${SITE_ORIGIN}",
          "logo": { "@type": "ImageObject", "url": "${SITE_ORIGIN}/og-image.png" }
        },
        "image": "${SITE_ORIGIN}/og-image.png",
        "mainEntityOfPage": { "@type": "WebPage", "@id": "${canonical}" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE_ORIGIN}/" },
          { "@type": "ListItem", "position": 2, "name": "Take-Off", "item": "${SITE_ORIGIN}/takeoff/" },
          { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(m.title)}, "item": "${canonical}" }
        ]
      }${faqSchemaEntry}
    ]
  }
  </script>

  ${getAnalytics()}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${getStyles()}</style>
</head>
<body>
  ${getNav('/takeoff/')}

  <section class="article-hero">
    <div class="container">
      <p class="breadcrumb"><a href="/takeoff/">← All Take-Off guides</a></p>
      <p class="eyebrow">${escapeHtml(m.category || '')}</p>
      <h1>${escapeHtml(m.title)}</h1>
      <p class="meta-row">
        ${m.readTime ? `<span>${escapeHtml(m.readTime)}</span>` : ''}
        ${m.publishedAt ? `<span>Published ${escapeHtml(formatDate(m.publishedAt))}</span>` : ''}
      </p>
    </div>
  </section>

  <section class="article-body-wrap">
    <div class="container">
      <div class="article-body">
${bodyHtml}
      </div>
    </div>
  </section>

  ${renderRelated(related)}
  ${getCtaSection()}
  ${getFooter()}
</body>
</html>
`;
}

// =====================================================================
// Sitemap update
// =====================================================================
function updateSitemap(articles) {
  const sitemapPath = path.join(REPO_ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return;
  let xml = fs.readFileSync(sitemapPath, 'utf8');

  // Remove any existing /takeoff URLs so we can rewrite cleanly
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/bidintell\.ai\/takeoff[\s\S]*?<\/url>/g, '');

  const today = new Date().toISOString().split('T')[0];
  const newEntries = [
    `  <url>\n    <loc>${SITE_ORIGIN}/takeoff/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    ...articles.map((a) => `  <url>\n    <loc>${SITE_ORIGIN}/takeoff/${a.meta.slug}/</loc>\n    <lastmod>${escapeHtml(a.meta.publishedAt || today)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`),
  ].join('\n');

  xml = xml.replace(/<\/urlset>/, `${newEntries}\n</urlset>`);
  fs.writeFileSync(sitemapPath, xml);
  console.log(`  • Updated sitemap.xml with ${articles.length + 1} /takeoff entries`);
}

// =====================================================================
// Main
// =====================================================================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  console.log('Building /takeoff...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.log(`  • No content directory at ${CONTENT_DIR} — skipping.`);
    return;
  }

  ensureDir(OUTPUT_DIR);

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('  • No .md files found — generating empty index.');
  }

  const articles = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.slug || !meta.title) {
      console.warn(`  ⚠ Skipping ${file} — missing required frontmatter (title, slug).`);
      continue;
    }
    articles.push({ file, meta, body });
  }

  // Sort by publishedAt desc, fallback to filename
  articles.sort((a, b) => {
    const da = a.meta.publishedAt || '';
    const db = b.meta.publishedAt || '';
    return db.localeCompare(da);
  });

  // Write each article page
  for (const a of articles) {
    const dir = path.join(OUTPUT_DIR, a.meta.slug);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), renderArticle(a, articles));
    console.log(`  • takeoff/${a.meta.slug}/index.html`);
  }

  // Write the index
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndex(articles));
  console.log(`  • takeoff/index.html (${articles.length} cards)`);

  updateSitemap(articles);

  console.log('✓ /takeoff built.');
}

main();
