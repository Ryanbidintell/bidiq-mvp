// seo-weekly.js — Netlify Scheduled Function
// Runs every Friday at 2pm UTC (9am CT)
// Pulls Google Search Console data + lead funnel from Supabase
// Uses Claude to surface actionable insights, emails ryan@bidintell.ai

const { google }  = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const RECIPIENT       = 'ryan@bidintell.ai';
const SITE_URL        = process.env.SEARCH_CONSOLE_SITE_URL || 'sc-domain:bidintell.ai';
const POSTMARK_KEY    = process.env.POSTMARK_API_KEY;
const CLAUDE_KEY      = process.env.CLAUDE_API_KEY;
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Google auth ──────────────────────────────────────────────────────────────

function getSearchConsoleClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return google.webmasters({ version: 'v3', auth });
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function isoDate(d) { return d.toISOString().split('T')[0]; }

function dateRange(daysBack, windowDays = 7) {
    const end   = new Date();
    end.setDate(end.getDate() - daysBack);
    const start = new Date(end);
    start.setDate(start.getDate() - windowDays + 1);
    return { startDate: isoDate(start), endDate: isoDate(end) };
}

// ── Search Console queries ───────────────────────────────────────────────────

async function querySearchConsole(sc, range, dimensions, rowLimit = 25) {
    try {
        const res = await sc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: { ...range, dimensions, rowLimit, dataState: 'all' },
        });
        return res.data.rows || [];
    } catch (err) {
        console.warn(`Search Console query failed (${dimensions.join(',')}):`, err.message);
        return [];
    }
}

async function getSearchConsoleData() {
    let sc;
    try { sc = getSearchConsoleClient(); }
    catch (err) {
        console.error('Failed to init Search Console client:', err.message);
        return null;
    }

    const thisWeek = dateRange(3, 7);    // last 7 days (3-day lag for GSC data)
    const lastWeek = dateRange(10, 7);   // prior 7 days

    const [queriesNow, queriesPrev, pagesNow, pagesPrev, totalsNow, totalsPrev] = await Promise.all([
        querySearchConsole(sc, thisWeek, ['query'], 25),
        querySearchConsole(sc, lastWeek, ['query'], 25),
        querySearchConsole(sc, thisWeek, ['page'],  15),
        querySearchConsole(sc, lastWeek, ['page'],  15),
        querySearchConsole(sc, thisWeek, [],         1),  // aggregate totals
        querySearchConsole(sc, lastWeek, [],          1),
    ]);

    // Build delta maps
    const prevQueryMap = new Map(queriesPrev.map(r => [r.keys[0], r]));
    const prevPageMap  = new Map(pagesPrev.map(r => [r.keys[0], r]));

    const queries = queriesNow.map(r => {
        const prev = prevQueryMap.get(r.keys[0]) || {};
        return {
            query:       r.keys[0],
            clicks:      r.clicks,
            impressions: r.impressions,
            ctr:         +(r.ctr * 100).toFixed(1),
            position:    +r.position.toFixed(1),
            clicksDelta: r.clicks - (prev.clicks || 0),
            posDelta:    prev.position ? +(prev.position - r.position).toFixed(1) : null,
        };
    });

    const pages = pagesNow.map(r => {
        const prev = prevPageMap.get(r.keys[0]) || {};
        const slug = r.keys[0].replace('https://bidintell.ai', '') || '/';
        return {
            page:        slug,
            clicks:      r.clicks,
            impressions: r.impressions,
            ctr:         +(r.ctr * 100).toFixed(1),
            position:    +r.position.toFixed(1),
            clicksDelta: r.clicks - (prev.clicks || 0),
        };
    });

    const totals = totalsNow[0] ? {
        clicks:      totalsNow[0].clicks,
        impressions: totalsNow[0].impressions,
        ctr:         +(totalsNow[0].ctr * 100).toFixed(1),
        position:    +totalsNow[0].position.toFixed(1),
        prevClicks:      totalsPrev[0]?.clicks || 0,
        prevImpressions: totalsPrev[0]?.impressions || 0,
    } : null;

    return { queries, pages, totals, thisWeek, lastWeek };
}

// ── Lead funnel from Supabase ─────────────────────────────────────────────────

async function getLeadFunnel() {
    const now      = new Date();
    const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeks = new Date(now); twoWeeks.setDate(twoWeeks.getDate() - 14);

    const [signupsNow, signupsPrev, roiLeadsNow, roiLeadsPrev, demoLeadsNow] = await Promise.all([
        supabase.from('user_settings').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('user_settings').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeks.toISOString()).lt('created_at', weekAgo.toISOString()),
        supabase.from('admin_events').select('*', { count: 'exact', head: true }).eq('event_type', 'roi_lead').gte('created_at', weekAgo.toISOString()),
        supabase.from('admin_events').select('*', { count: 'exact', head: true }).eq('event_type', 'roi_lead').gte('created_at', twoWeeks.toISOString()).lt('created_at', weekAgo.toISOString()),
        supabase.from('admin_events').select('event_data').eq('event_type', 'demo_booked').gte('created_at', weekAgo.toISOString()),
    ]);

    return {
        signups:    { now: signupsNow.count || 0,   prev: signupsPrev.count || 0 },
        roiLeads:   { now: roiLeadsNow.count || 0,  prev: roiLeadsPrev.count || 0 },
        demoLeads:  (demoLeadsNow.data || []).length,
    };
}

// ── Technical health checks ──────────────────────────────────────────────────

async function checkPageHealth() {
    const pages = [
        { name: 'Homepage',        url: 'https://bidintell.ai/' },
        { name: 'App',             url: 'https://bidintell.ai/app' },
        { name: 'Diagnostic',      url: 'https://bidintell.ai/diagnostic' },
        { name: 'ROI Calculator',  url: 'https://bidintell.ai/roi-calculator' },
        { name: 'Demo',            url: 'https://bidintell.ai/demo' },
        { name: 'Sitemap',         url: 'https://bidintell.ai/sitemap.xml' },
    ];
    const results = await Promise.all(pages.map(async p => {
        try {
            const res = await fetch(p.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
            return { ...p, status: res.status, ok: res.status < 400 };
        } catch (err) {
            return { ...p, status: 0, ok: false, error: err.message };
        }
    }));
    return results;
}

// ── Claude insight generation ─────────────────────────────────────────────────

async function generateInsights(gscData, funnel) {
    if (!CLAUDE_KEY || !gscData) return null;

    const topQueries = gscData.queries.slice(0, 20).map(q =>
        `${q.query} | ${q.clicks} clicks | ${q.impressions} impressions | CTR ${q.ctr}% | pos ${q.position} | Δclicks ${q.clicksDelta > 0 ? '+' : ''}${q.clicksDelta}`
    ).join('\n');

    const topPages = gscData.pages.slice(0, 10).map(p =>
        `${p.page} | ${p.clicks} clicks | pos ${p.position} | Δclicks ${p.clicksDelta > 0 ? '+' : ''}${p.clicksDelta}`
    ).join('\n');

    const totalsLine = gscData.totals
        ? `Total this week: ${gscData.totals.clicks} clicks / ${gscData.totals.impressions} impressions / CTR ${gscData.totals.ctr}% / avg position ${gscData.totals.position}. Prior week: ${gscData.totals.prevClicks} clicks / ${gscData.totals.prevImpressions} impressions.`
        : 'No aggregate data available.';

    const funnelLine = `Signups: ${funnel.signups.now} this week (${funnel.signups.prev} prior). ROI leads: ${funnel.roiLeads.now} (${funnel.roiLeads.prev} prior). Demo requests: ${funnel.demoLeads}.`;

    const prompt = `You are the SEO and growth advisor for BidIntell (bidintell.ai), a pre-bid intelligence SaaS for specialty subcontractors in commercial construction.

Product context: BidIntell helps specialty subs (MEP, flooring, drywall, glazing, etc.) score bid invites before spending time on them. ICP: estimators and ops leads at specialty subs doing commercial work.

Here is this week's Search Console data:

OVERALL: ${totalsLine}

TOP QUERIES (query | clicks | impressions | CTR | avg position | click delta vs last week):
${topQueries || 'No query data.'}

TOP PAGES (page | clicks | avg position | click delta):
${topPages || 'No page data.'}

LEAD FUNNEL: ${funnelLine}

Provide a concise weekly SEO briefing in plain text (no markdown headers, no bullet symbols like * or -). Structure it as 3 short paragraphs:

1. MOMENTUM (2-3 sentences): What moved this week? Any queries gaining traction or pages picking up clicks? Be specific — name the actual queries.

2. OPPORTUNITIES (2-3 sentences): Which queries rank on page 2 (position 11-20) that could reach page 1 with a content push? Which high-impression / low-CTR queries need better meta titles? Name specific queries and what to do.

3. THIS WEEK'S ONE ACTION (1-2 sentences): The single highest-leverage thing to do in the next 7 days based on this data. Be specific — a page to update, a title tag to rewrite, a topic to publish.

Keep it tight. Peer-to-peer tone — you are talking directly to the founder. No exclamation points. No AI hype words.`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        if (!res.ok) throw new Error(`Claude error ${res.status}`);
        const data = await res.json();
        return data.content[0].text;
    } catch (err) {
        console.warn('Claude insights failed:', err.message);
        return null;
    }
}

// ── Email ─────────────────────────────────────────────────────────────────────

function delta(now, prev, higherIsBetter = true) {
    const d = now - prev;
    if (d === 0) return `<span style="color:#64748b;">—</span>`;
    const good = higherIsBetter ? d > 0 : d < 0;
    const color = good ? '#22c55e' : '#ef4444';
    const sign  = d > 0 ? '+' : '';
    return `<span style="color:${color}; font-size:11px; font-weight:600;">${sign}${d}</span>`;
}

function posDelta(d) {
    if (d === null) return '';
    if (d === 0)    return `<span style="color:#64748b; font-size:10px;">—</span>`;
    const good  = d > 0; // positive = moved up (lower number = better)
    const color = good ? '#22c55e' : '#ef4444';
    const sign  = d > 0 ? '↑' : '↓';
    return `<span style="color:${color}; font-size:10px;">${sign}${Math.abs(d)}</span>`;
}

function buildEmail(gscData, funnel, healthChecks, insights, dateRange) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // ── totals banner ───────────────────────────────────────────────────────
    const totalsHtml = gscData?.totals ? (() => {
        const t = gscData.totals;
        const clicksDelta    = t.clicks      - t.prevClicks;
        const impressDelta   = t.impressions - t.prevImpressions;
        const cDeltaColor    = clicksDelta    >= 0 ? '#22c55e' : '#ef4444';
        const iDeltaColor    = impressDelta   >= 0 ? '#22c55e' : '#ef4444';
        return `
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; margin-bottom:16px; overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr style="background:#0f172a;">
            <td colspan="4" style="padding:10px 20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">
              This Week — Search Console (${dateRange.startDate} → ${dateRange.endDate})
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px; text-align:center; border-right:1px solid #0B0F14;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${t.clicks}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">Clicks</div>
              <div style="font-size:11px; color:${cDeltaColor}; margin-top:2px;">${clicksDelta >= 0 ? '+' : ''}${clicksDelta} vs last wk</div>
            </td>
            <td style="padding:16px 20px; text-align:center; border-right:1px solid #0B0F14;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${t.impressions}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">Impressions</div>
              <div style="font-size:11px; color:${iDeltaColor}; margin-top:2px;">${impressDelta >= 0 ? '+' : ''}${impressDelta} vs last wk</div>
            </td>
            <td style="padding:16px 20px; text-align:center; border-right:1px solid #0B0F14;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${t.ctr}%</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">CTR</div>
            </td>
            <td style="padding:16px 20px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${t.position}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">Avg Position</div>
            </td>
          </tr>
        </table>`;
    })() : `<div style="background:#1e293b; border-radius:8px; padding:16px 20px; margin-bottom:16px; color:#64748b; font-size:13px;">No Search Console data available this week.</div>`;

    // ── top queries table ───────────────────────────────────────────────────
    const queryRows = (gscData?.queries || []).slice(0, 15).map(q => `
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px; font-size:12px; color:#F8FAFC; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${q.query}</td>
          <td style="padding:8px 12px; font-size:12px; color:#F8FAFC; text-align:right;">${q.clicks} ${delta(q.clicks, q.clicks - q.clicksDelta)}</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${q.impressions}</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${q.ctr}%</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${q.position} ${posDelta(q.posDelta)}</td>
        </tr>`).join('');

    const queriesHtml = queryRows ? `
        <table style="width:100%; border-collapse:collapse; background:#0f172a; border-radius:8px; margin-bottom:16px; overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr style="background:#0a0e13;">
            <td colspan="5" style="padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Top Queries</td>
          </tr>
          <tr style="background:#0a0e13; border-bottom:1px solid #1e293b;">
            <th style="padding:6px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Query</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Clicks</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Impressions</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">CTR</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Position</th>
          </tr>
          ${queryRows}
        </table>` : '';

    // ── top pages table ─────────────────────────────────────────────────────
    const pageRows = (gscData?.pages || []).slice(0, 8).map(p => `
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px; font-size:12px; color:#F8FAFC; font-family:monospace;">${p.page}</td>
          <td style="padding:8px 12px; font-size:12px; color:#F8FAFC; text-align:right;">${p.clicks} ${delta(p.clicks, p.clicks - p.clicksDelta)}</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${p.impressions}</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${p.ctr}%</td>
          <td style="padding:8px 12px; font-size:12px; color:#94a3b8; text-align:right;">${p.position}</td>
        </tr>`).join('');

    const pagesHtml = pageRows ? `
        <table style="width:100%; border-collapse:collapse; background:#0f172a; border-radius:8px; margin-bottom:16px; overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr style="background:#0a0e13;">
            <td colspan="5" style="padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Top Pages</td>
          </tr>
          <tr style="background:#0a0e13; border-bottom:1px solid #1e293b;">
            <th style="padding:6px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Page</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Clicks</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Impressions</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">CTR</th>
            <th style="padding:6px 12px; text-align:right; font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#475569; font-weight:600;">Avg Pos</th>
          </tr>
          ${pageRows}
        </table>` : '';

    // ── lead funnel ─────────────────────────────────────────────────────────
    const funnelHtml = `
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; margin-bottom:16px; overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr style="background:#0f172a;">
            <td colspan="3" style="padding:10px 20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Lead Funnel — This Week</td>
          </tr>
          <tr>
            <td style="padding:16px 20px; text-align:center; border-right:1px solid #0B0F14;">
              <div style="font-size:26px; font-weight:700; color:#F26522;">${funnel.signups.now}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">Sign-ups</div>
              <div style="font-size:11px; margin-top:2px;">${delta(funnel.signups.now, funnel.signups.prev)} vs last wk</div>
            </td>
            <td style="padding:16px 20px; text-align:center; border-right:1px solid #0B0F14;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${funnel.roiLeads.now}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">ROI Leads</div>
              <div style="font-size:11px; margin-top:2px;">${delta(funnel.roiLeads.now, funnel.roiLeads.prev)} vs last wk</div>
            </td>
            <td style="padding:16px 20px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:#F8FAFC;">${funnel.demoLeads}</div>
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-top:4px;">Demo Requests</div>
            </td>
          </tr>
        </table>`;

    // ── Claude insights ─────────────────────────────────────────────────────
    const insightsHtml = insights ? `
        <div style="background:#1e293b; border-left:3px solid #F26522; border-radius:4px; padding:16px 20px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#F26522; margin-bottom:10px;">AI Analysis</div>
          <div style="font-size:13px; color:#94a3b8; line-height:1.7; white-space:pre-wrap;">${insights}</div>
        </div>` : '';

    // ── technical health ────────────────────────────────────────────────────
    const healthRows = healthChecks.map(h => {
        const icon  = h.ok ? '✅' : '❌';
        const color = h.ok ? '#16a34a' : '#dc2626';
        return `
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:8px 12px; font-size:12px; color:#F8FAFC;">${h.name}</td>
          <td style="padding:8px 12px; font-size:12px; font-family:monospace; color:#64748b;">${h.url.replace('https://bidintell.ai', '')}</td>
          <td style="padding:8px 12px; font-size:12px; color:${color}; font-weight:600; text-align:right;">${icon} ${h.status || 'ERR'}</td>
        </tr>`;
    }).join('');

    const healthHtml = `
        <table style="width:100%; border-collapse:collapse; background:#0f172a; border-radius:8px; margin-bottom:16px; overflow:hidden;" cellpadding="0" cellspacing="0">
          <tr style="background:#0a0e13;">
            <td colspan="3" style="padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Page Health</td>
          </tr>
          ${healthRows}
        </table>`;

    const failures = healthChecks.filter(h => !h.ok).length;
    const subject = gscData?.totals
        ? `BidIntell SEO — ${gscData.totals.clicks} clicks · ${funnel.signups.now} signups · ${failures > 0 ? `⚠️ ${failures} page error` : '✅ all clear'}`
        : `BidIntell SEO Weekly — ${dateStr}`;

    const html = `
    <div style="background:#0B0F14; color:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:32px 24px; max-width:680px; margin:0 auto;">

      <div style="margin-bottom:24px;">
        <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#F26522;">BIDINTELL SEO</div>
        <h1 style="margin:8px 0 4px; font-size:20px; font-weight:700;">Weekly Report</h1>
        <p style="margin:0; color:#64748b; font-size:13px;">${dateStr}</p>
      </div>

      ${totalsHtml}
      ${insightsHtml}
      ${funnelHtml}
      ${queriesHtml}
      ${pagesHtml}
      ${healthHtml}

      <p style="margin-top:20px; font-size:11px; color:#334155;">
        Sent automatically every Friday · <a href="https://search.google.com/search-console" style="color:#F26522;">Search Console</a> · <a href="https://bidintell.ai/admin" style="color:#64748b;">Admin</a>
      </p>
    </div>`;

    return { subject, html };
}

// ── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    // Internal/scheduled endpoint — block public HTTP abuse (email spam / AI cost).
    // Allow Netlify scheduled runs (body carries next_run) or a CRON_SECRET request.
    {
        let _sched = false;
        try { _sched = !!JSON.parse((event && event.body) || '{}').next_run; } catch (_) {}
        const _sec = process.env.CRON_SECRET;
        const _h = (event && event.headers) || {};
        const _q = (event && event.queryStringParameters) || {};
        if (!(_sched || (_sec && (_h['x-cron-secret'] === _sec || _q.cron_secret === _sec)))) {
            return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized internal endpoint' }) };
        }
    }
    console.log('[seo-weekly] Started:', new Date().toISOString());

    const [gscData, funnel, healthChecks] = await Promise.all([
        getSearchConsoleData(),
        getLeadFunnel(),
        checkPageHealth(),
    ]);

    const insights = await generateInsights(gscData, funnel);
    const { subject, html } = buildEmail(gscData, funnel, healthChecks, insights, gscData?.thisWeek || {});

    try {
        const res = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_KEY
            },
            body: JSON.stringify({
                From: 'BidIntell SEO <hello@bidintell.ai>',
                To: RECIPIENT,
                Subject: subject,
                HtmlBody: html,
                MessageStream: 'outbound'
            })
        });
        if (!res.ok) throw new Error(`Postmark error ${res.status}: ${await res.text()}`);
        console.log('[seo-weekly] Email sent:', subject);
    } catch (err) {
        console.error('[seo-weekly] Email failed:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, queries: gscData?.queries?.length || 0, funnel })
    };
};
