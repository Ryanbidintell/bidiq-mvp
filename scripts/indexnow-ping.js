#!/usr/bin/env node
/**
 * IndexNow submitter for bidintell.ai
 *
 * Notifies IndexNow-participating engines that URLs are new or updated.
 * IndexNow feeds Bing, Yandex, Seznam and Naver — NOT Google. Bing matters here
 * because it is the index behind Microsoft Copilot.
 *
 * Usage:
 *   node scripts/indexnow-ping.js                  # URLs with lastmod in the last 7 days
 *   node scripts/indexnow-ping.js --days 30        # widen the window
 *   node scripts/indexnow-ping.js --all            # every URL in sitemap.xml
 *   node scripts/indexnow-ping.js --dry-run        # print the payload, send nothing
 *   node scripts/indexnow-ping.js https://bidintell.ai/takeoff/foo/   # explicit URLs
 *
 * Why this is NOT wired into the Netlify build:
 * every build regenerates all of /takeoff, so a build hook would resubmit the
 * whole site on every deploy. IndexNow asks you to submit only genuinely
 * new/changed URLs, and repeatedly submitting unchanged ones is the documented way
 * to get your key throttled or ignored. Run this after publishing instead.
 *
 * The key is intentionally public — it is served at KEY.txt so the engines can
 * verify ownership. It is not a secret and does not belong in env vars.
 */

const fs = require('fs');
const path = require('path');

const HOST = 'bidintell.ai';
const KEY = 'cbcf230203b24e19a3fb62d88f5d9848';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const SITEMAP = path.join(__dirname, '..', 'sitemap.xml');
const MAX_URLS = 10000; // IndexNow per-request ceiling

function parseArgs(argv) {
    const opts = { days: 7, all: false, dryRun: false, urls: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--all') opts.all = true;
        else if (a === '--dry-run') opts.dryRun = true;
        else if (a === '--days') {
            const n = parseInt(argv[++i], 10);
            if (Number.isNaN(n) || n < 0) {
                console.error('--days needs a non-negative number');
                process.exit(1);
            }
            opts.days = n;
        } else if (a.startsWith('http')) opts.urls.push(a);
        else {
            console.error(`Unknown argument: ${a}`);
            process.exit(1);
        }
    }
    return opts;
}

/** Pull <loc> and <lastmod> pairs out of sitemap.xml without adding an XML dep. */
function readSitemap() {
    if (!fs.existsSync(SITEMAP)) {
        console.error(`sitemap.xml not found at ${SITEMAP}`);
        process.exit(1);
    }
    const xml = fs.readFileSync(SITEMAP, 'utf8');
    const entries = [];
    const blockRe = /<url>([\s\S]*?)<\/url>/g;
    let m;
    while ((m = blockRe.exec(xml)) !== null) {
        const block = m[1];
        const loc = (block.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/) || [])[1];
        const lastmod = (block.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/) || [])[1] || null;
        if (loc) entries.push({ loc: loc.trim(), lastmod: lastmod && lastmod.trim() });
    }
    return entries;
}

function selectUrls(opts) {
    if (opts.urls.length) return opts.urls;

    const entries = readSitemap();
    if (opts.all) return entries.map(e => e.loc);

    const cutoff = Date.now() - opts.days * 86400000;
    const fresh = entries.filter(e => {
        if (!e.lastmod) return false;
        const t = Date.parse(e.lastmod);
        return !Number.isNaN(t) && t >= cutoff;
    });
    return fresh.map(e => e.loc);
}

function validate(urls) {
    const bad = urls.filter(u => {
        try { return new URL(u).hostname !== HOST; }
        catch { return true; }
    });
    if (bad.length) {
        // IndexNow rejects the whole request (422) if any URL is off-host.
        console.error(`Refusing to submit — these URLs are not on ${HOST}:`);
        bad.forEach(u => console.error(`  ${u}`));
        process.exit(1);
    }
}

async function submit(urls) {
    const body = JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls,
    });

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
    });
    const text = await res.text().catch(() => '');

    // IndexNow returns 200 (accepted) or 202 (accepted, key validation pending).
    const ok = res.status === 200 || res.status === 202;
    console.log(`\nIndexNow responded ${res.status} ${res.statusText}${text ? ` — ${text.trim()}` : ''}`);
    if (!ok) {
        const hints = {
            400: 'Bad request — malformed payload.',
            403: `Key not valid. Confirm ${KEY_LOCATION} is live and contains exactly the key.`,
            422: 'URLs do not match the host, or the key is not in the expected location.',
            429: 'Too many requests — you are submitting too often.',
        };
        if (hints[res.status]) console.error(hints[res.status]);
        process.exit(1);
    }
    console.log('Accepted. Bing/Yandex/Seznam/Naver have been notified (this is not Google).');
}

(async () => {
    const opts = parseArgs(process.argv.slice(2));
    const urls = selectUrls(opts);

    if (!urls.length) {
        console.log(`Nothing to submit: no sitemap entries with lastmod in the last ${opts.days} day(s).`);
        console.log('Use --days N to widen the window, or --all to submit everything.');
        return;
    }
    if (urls.length > MAX_URLS) {
        console.error(`${urls.length} URLs exceeds the ${MAX_URLS}-per-request limit.`);
        process.exit(1);
    }

    validate(urls);

    console.log(`Submitting ${urls.length} URL(s) to IndexNow`);
    console.log(`key location: ${KEY_LOCATION}`);
    urls.forEach(u => console.log(`  ${u}`));

    if (opts.dryRun) {
        console.log('\n--dry-run: nothing sent.');
        return;
    }
    await submit(urls);
})();
