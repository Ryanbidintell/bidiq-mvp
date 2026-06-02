// netlify/functions/alert.js
// ─────────────────────────────────────────────────────────────────────────────
// BidIntell alert / monitoring system.
//
// Purpose: surface SILENT FAILURES. Background and scheduled functions catch
// errors and console.error them — invisible. This module gives every function
// (and the front end) one place to raise an alert that:
//
//   1. ALWAYS logs to admin_events (event_type='system_alert') — a durable
//      record you can review in the admin dashboard, even when no email goes out.
//   2. Emails ryan@bidintell.ai via Postmark ONLY on real failures
//      (severity >= ALERT_EMAIL_MIN_SEVERITY, default 'error') AND only when
//      the same alert hasn't already emailed inside the throttle window.
//   3. NEVER throws. Alerting must never break the thing it's monitoring.
//
// Why throttled + failure-only: all scheduled emails were shut off 2026-05-15
// because routine nudges were noisy. This system is the opposite — silent when
// healthy, one email when something breaks, and it won't spam the same break.
//
// Three ways to use it:
//   • require it from another function:  const { sendAlert, withAlerting } = require('./alert');
//   • POST to /.netlify/functions/alert  (front end / external callers)
//   • GET  /.netlify/functions/alert     (config + connectivity self-check, no email)
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// weekly-health-check / daily-snapshot use SUPABASE_SERVICE_KEY; notify.js used
// SUPABASE_SERVICE_ROLE_KEY for its admin_events insert. Accept either.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;

// All system/agent emails go here (see CLAUDE.md "Email Routing Rule").
const ALERT_EMAIL = 'ryan@bidintell.ai';
const FROM_EMAIL = 'BidIntell System <hello@bidintell.ai>';

const SEVERITY_RANK = { info: 10, warning: 20, error: 30, critical: 40 };
const EMAIL_MIN_SEVERITY = (process.env.ALERT_EMAIL_MIN_SEVERITY || 'error').toLowerCase();
// Don't email the same dedupeKey more than once per this many minutes (default 6h).
const THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES || '360', 10);

const SEVERITY_STYLE = {
    info:     { icon: 'ℹ️', label: 'INFO',     color: '#3b82f6' },
    warning:  { icon: '⚠️', label: 'WARNING',  color: '#d97706' },
    error:    { icon: '❌', label: 'ERROR',    color: '#dc2626' },
    critical: { icon: '🚨', label: 'CRITICAL', color: '#dc2626' },
};

// Lazy client so merely requiring this module never crashes when env is absent
// (e.g. local syntax checks, or a function whose env isn't fully provisioned).
let _supabase = null;
function getSupabase() {
    if (_supabase) return _supabase;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    return _supabase;
}

function normalizeSeverity(sev) {
    const s = String(sev || 'error').toLowerCase();
    return SEVERITY_RANK[s] ? s : 'error';
}

// A stable key used to throttle duplicate emails. Caller can pass an explicit
// dedupeKey; otherwise we derive one from source + title so the same recurring
// failure collapses to one email per window.
function resolveDedupeKey(dedupeKey, source, title) {
    if (dedupeKey) return String(dedupeKey).slice(0, 200);
    return `${source || 'unknown'}::${(title || '').slice(0, 120)}`;
}

// Has an alert with this dedupeKey ALREADY emailed inside the throttle window?
// Returns true → suppress this email (still logged). Fail-open: if we can't
// check (no client / query error), return false so real alerts still go out.
async function emailRecentlySent(supabase, dedupeKey) {
    if (!supabase || THROTTLE_MINUTES <= 0) return false;
    try {
        const cutoff = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('admin_events')
            .select('id')
            .eq('event_type', 'system_alert')
            .eq('event_data->>dedupe_key', dedupeKey)
            .eq('event_data->>emailed', 'true')
            .gte('created_at', cutoff)
            .limit(1);
        if (error) {
            console.warn('alert: throttle check failed (failing open):', error.message);
            return false;
        }
        return Array.isArray(data) && data.length > 0;
    } catch (e) {
        console.warn('alert: throttle check threw (failing open):', e.message);
        return false;
    }
}

function buildEmailHtml({ severity, source, title, detail, context, dedupeKey, throttleMinutes }) {
    const style = SEVERITY_STYLE[severity] || SEVERITY_STYLE.error;
    const ctxRows = context && typeof context === 'object'
        ? Object.entries(context).map(([k, v]) => {
            let val = typeof v === 'string' ? v : JSON.stringify(v);
            if (val && val.length > 800) val = val.slice(0, 800) + '… (truncated)';
            return `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-family:monospace;font-size:12px;word-break:break-word;">${escapeHtml(val)}</td>
            </tr>`;
        }).join('')
        : '';

    return `
    <div style="background:#0B0F14;color:#F8FAFC;font-family:sans-serif;padding:32px;max-width:680px;margin:0 auto;">
      <div style="margin-bottom:20px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F26522;">BIDINTELL SYSTEM ALERT</span>
        <h1 style="margin:8px 0 4px;font-size:20px;color:${style.color};">${style.icon} ${style.label} — ${escapeHtml(source || 'unknown')}</h1>
        <p style="margin:0;color:#94a3b8;font-size:13px;">${new Date().toUTCString()}</p>
      </div>

      <div style="background:#1e293b;border-left:3px solid ${style.color};border-radius:6px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${escapeHtml(title || 'Alert')}</div>
        <div style="color:#cbd5e1;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(detail || '(no detail)')}</div>
      </div>

      ${ctxRows ? `<table style="width:100%;border-collapse:collapse;background:#111827;border-radius:6px;overflow:hidden;margin-bottom:20px;"><tbody>${ctxRows}</tbody></table>` : ''}

      <p style="margin-top:8px;font-size:12px;color:#475569;">
        Dedupe key: <code style="color:#64748b;">${escapeHtml(dedupeKey)}</code><br>
        Repeat alerts for this key are suppressed for ${throttleMinutes} min. ·
        <a href="https://bidintell.ai/admin" style="color:#F26522;">Admin dashboard</a>
      </p>
    </div>`;
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Never throws. A network/DNS failure must NOT prevent the durable admin_events
// log from being written, so we catch here and return a reason instead.
async function sendPostmark(subject, html) {
    if (!POSTMARK_API_KEY) {
        console.warn('alert: POSTMARK_API_KEY not set — skipping email');
        return { ok: false, reason: 'no_postmark_key' };
    }
    try {
        const res = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Postmark-Server-Token': POSTMARK_API_KEY,
            },
            body: JSON.stringify({
                From: FROM_EMAIL,
                To: ALERT_EMAIL,
                Subject: subject,
                HtmlBody: html,
                MessageStream: 'outbound',
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            return { ok: false, reason: `postmark_${res.status}`, detail: text.slice(0, 300) };
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: 'postmark_throw', detail: e && e.message };
    }
}

async function logToAdminEvents(supabase, record) {
    if (!supabase) return { ok: false, reason: 'no_supabase_client' };
    try {
        const { error } = await supabase.from('admin_events').insert({
            event_type: 'system_alert',
            user_id: record.userId || null,
            event_data: {
                severity:   record.severity,
                source:     record.source,
                title:      record.title,
                detail:     record.detail,
                context:    record.context || null,
                dedupe_key: record.dedupeKey,
                emailed:    record.emailed,
                throttled:  record.throttled,
                ts:         new Date().toISOString(),
            },
        });
        if (error) return { ok: false, reason: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

/**
 * Raise an alert. Never throws.
 *
 * @param {object} opts
 * @param {string} opts.source     - which subsystem (e.g. 'stripe-webhook')
 * @param {string} [opts.severity] - 'info' | 'warning' | 'error' | 'critical' (default 'error')
 * @param {string} opts.title      - short headline
 * @param {string} [opts.detail]   - longer description / error message
 * @param {string} [opts.dedupeKey]- throttle key; defaults to source::title
 * @param {object} [opts.context]  - extra fields (stack, ids, counts...) shown in the email
 * @param {string} [opts.userId]   - optional user id to attach to the admin_events row
 * @returns {Promise<{logged:boolean, emailed:boolean, throttled:boolean, errors:string[]}>}
 */
async function sendAlert(opts = {}) {
    const result = { logged: false, emailed: false, throttled: false, errors: [] };
    try {
        const severity = normalizeSeverity(opts.severity);
        const source = opts.source || 'unknown';
        const title = opts.title || 'Alert';
        const detail = opts.detail || '';
        const context = opts.context || null;
        const dedupeKey = resolveDedupeKey(opts.dedupeKey, source, title);

        const supabase = getSupabase();
        const wantsEmail = SEVERITY_RANK[severity] >= SEVERITY_RANK[EMAIL_MIN_SEVERITY];

        let throttled = false;
        if (wantsEmail) {
            throttled = await emailRecentlySent(supabase, dedupeKey);
        }

        let emailed = false;
        if (wantsEmail && !throttled) {
            const subject = `${(SEVERITY_STYLE[severity] || SEVERITY_STYLE.error).icon} BidIntell ${severity.toUpperCase()}: ${title}`.slice(0, 180);
            const html = buildEmailHtml({ severity, source, title, detail, context, dedupeKey, throttleMinutes: THROTTLE_MINUTES });
            const mail = await sendPostmark(subject, html);
            emailed = mail.ok;
            if (!mail.ok) result.errors.push(`email:${mail.reason}${mail.detail ? ' ' + mail.detail : ''}`);
        }
        result.throttled = throttled;
        result.emailed = emailed;

        // Always log — even if email was throttled, skipped, or failed.
        const log = await logToAdminEvents(supabase, {
            severity, source, title, detail, context, dedupeKey,
            emailed, throttled, userId: opts.userId,
        });
        result.logged = log.ok;
        if (!log.ok) result.errors.push(`log:${log.reason}`);

        // Console line so it's also visible in Netlify function logs.
        console.log(`alert[${severity}] ${source}: ${title} — logged=${result.logged} emailed=${emailed} throttled=${throttled}`);
    } catch (e) {
        // Absolute last resort. sendAlert must never throw into a caller's catch.
        console.error('alert: sendAlert itself failed:', e && e.message);
        result.errors.push(`fatal:${e && e.message}`);
    }
    return result;
}

/**
 * Wrap a Netlify handler so any UNHANDLED throw raises an alert, then re-throws
 * to preserve the function's original failure semantics. Use for functions that
 * don't already have a top-level try/catch.
 */
function withAlerting(handler, opts = {}) {
    const source = opts.source || 'function';
    return async function wrapped(event, context) {
        try {
            return await handler(event, context);
        } catch (err) {
            await sendAlert({
                source,
                severity: opts.severity || 'error',
                title: `Unhandled error in ${source}`,
                detail: err && err.message,
                dedupeKey: opts.dedupeKey || `${source}-unhandled`,
                context: { stack: err && err.stack },
            });
            throw err;
        }
    };
}

// ── HTTP handler ──────────────────────────────────────────────────────────────
// GET  → connectivity / config self-check (no email sent).
// POST → raise an alert. Public callers (front end) are clamped to max 'error'
//        severity and source is prefixed 'client:' so they can't forge critical
//        system alerts. Throttling protects against email-spam abuse.
exports.handler = async function (event) {
    const headers = {
        'Access-Control-Allow-Origin': 'https://bidintell.ai',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    if (event.httpMethod === 'GET') {
        const supabase = getSupabase();
        let dbOk = false, dbErr = null;
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('admin_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_type', 'system_alert');
                dbOk = !error;
                dbErr = error ? error.message : null;
            } catch (e) { dbErr = e.message; }
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                service: 'alert',
                config: {
                    supabase: !!supabase,
                    postmark: !!POSTMARK_API_KEY,
                    email_min_severity: EMAIL_MIN_SEVERITY,
                    throttle_minutes: THROTTLE_MINUTES,
                    alert_email: ALERT_EMAIL,
                },
                admin_events_reachable: dbOk,
                admin_events_error: dbErr,
            }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    // Clamp public callers: cap severity at 'error', tag the source.
    let severity = normalizeSeverity(body.severity);
    if (SEVERITY_RANK[severity] > SEVERITY_RANK.error) severity = 'error';
    const source = `client:${(body.source || 'frontend').toString().slice(0, 60)}`;

    const result = await sendAlert({
        source,
        severity,
        title: (body.title || 'Client-reported issue').toString().slice(0, 160),
        detail: (body.detail || body.message || '').toString().slice(0, 4000),
        dedupeKey: body.dedupeKey,
        context: body.context && typeof body.context === 'object' ? body.context : undefined,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };
};

// Exported for require() use by other functions and by the local test harness.
module.exports.sendAlert = sendAlert;
module.exports.withAlerting = withAlerting;
// Internal helpers exposed for unit testing only.
module.exports._internal = { normalizeSeverity, resolveDedupeKey, emailRecentlySent, buildEmailHtml };
