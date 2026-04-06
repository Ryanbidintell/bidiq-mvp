// netlify/functions/merge-projects.js
//
// Handles project merge/reject actions triggered from app.html.
//
// POST body:
//   { suggestionId, action: 'merge' | 'reject', authToken }
//
// merge: combines source into target
//   - Merged extracted_data: newer (source) fields overwrite older (target) for non-null values
//   - gc_bids: if same GC → update existing entry; if different GC → append
//   - project-level scores: best gc_bid score
//   - project-level gcs array: union of all gc names
//   - deletes source project, updates suggestion status → 'accepted'
//
// reject: marks suggestion status → 'rejected', no project changes

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Score helpers (mirrors inbound-email Edge Function) ──────────────────────

const CSI_DIVISION_PATTERNS = [
    { divs: ['03'], terms: ['concrete', 'cement'] },
    { divs: ['04'], terms: ['masonry', 'brick', 'block', 'stone'] },
    { divs: ['05'], terms: ['metals', 'structural steel', 'steel'] },
    { divs: ['06'], terms: ['carpentry', 'millwork', 'casework', 'wood'] },
    { divs: ['07'], terms: ['roofing', 'waterproofing', 'insulation', 'sealants'] },
    { divs: ['08'], terms: ['doors', 'windows', 'glazing', 'curtain wall', 'storefront'] },
    { divs: ['09'], terms: ['finishes', 'drywall', 'flooring', 'tile', 'carpet', 'painting', 'ceiling', 'acoustical'] },
    { divs: ['21'], terms: ['fire suppression', 'sprinkler', 'fire protection'] },
    { divs: ['22'], terms: ['plumbing', 'sanitary', 'piping'] },
    { divs: ['23'], terms: ['hvac', 'mechanical', 'heating', 'ventilation', 'air conditioning', 'ductwork'] },
    { divs: ['26'], terms: ['electrical', 'power', 'lighting', 'switchgear'] },
    { divs: ['31'], terms: ['earthwork', 'excavation', 'grading', 'demolition'] },
    { divs: ['32'], terms: ['paving', 'landscaping', 'parking lot', 'asphalt'] },
];

function detectDivisions(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = new Set();
    for (const { divs, terms } of CSI_DIVISION_PATTERNS) {
        if (terms.some(t => lower.includes(t))) divs.forEach(d => found.add(d));
    }
    return [...found];
}

// ── Merge logic ──────────────────────────────────────────────────────────────

/**
 * Merge two extracted_data objects.
 * Source (newer) non-null values overwrite target (older).
 */
function mergeExtractedData(target, source) {
    const merged = { ...target };
    for (const [key, val] of Object.entries(source || {})) {
        if (val != null && val !== '') merged[key] = val;
    }
    return merged;
}

/**
 * Merge gc_bids arrays.
 * - Same GC (case-insensitive): source entry overwrites target entry
 * - Different GC: append source entry as new gc_bid
 */
function mergeGCBids(targetBids, sourceBids) {
    const merged = [...(targetBids || [])];
    for (const sourceBid of (sourceBids || [])) {
        const sourceGC = (sourceBid.gc_name || '').toLowerCase().trim();
        const existingIdx = merged.findIndex(b => (b.gc_name || '').toLowerCase().trim() === sourceGC);
        if (existingIdx >= 0) {
            // Same GC: merge files, prefer source scores (newer)
            const existing = merged[existingIdx];
            merged[existingIdx] = {
                ...existing,
                ...sourceBid,
                files: [...(existing.files || []), ...(sourceBid.files || [])],
                // Keep existing outcome unless source has a non-pending one
                outcome: sourceBid.outcome !== 'pending' ? sourceBid.outcome : existing.outcome,
                outcome_data: sourceBid.outcome !== 'pending' ? sourceBid.outcome_data : existing.outcome_data,
            };
        } else {
            // Different GC: add as new entry
            merged.push(sourceBid);
        }
    }
    return merged;
}

/**
 * Pick best final score from gc_bids array.
 * Returns the gc_bid with the highest scores.final value.
 */
function bestGCBid(gcBids) {
    if (!gcBids || gcBids.length === 0) return null;
    return gcBids.reduce((best, bid) => {
        const bidScore = bid.scores?.final || 0;
        const bestScore = best.scores?.final || 0;
        return bidScore > bestScore ? bid : best;
    });
}

/**
 * Sort gc_bids by score descending (best to worst).
 */
function sortGCBids(gcBids) {
    return [...gcBids].sort((a, b) => (b.scores?.final || 0) - (a.scores?.final || 0));
}

// ── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
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

    const { suggestionId, action, authToken } = body;

    if (!suggestionId || !action || !authToken) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing suggestionId, action, or authToken' }) };
    }
    if (!['merge', 'reject'].includes(action)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'action must be merge or reject' }) };
    }

    const supabase = getSupabase();

    // Verify auth token → get user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
    if (authErr || !user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Load the suggestion
    const { data: suggestion, error: sugErr } = await supabase
        .from('merge_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .eq('user_id', user.id)
        .single();

    if (sugErr || !suggestion) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Suggestion not found' }) };
    }
    if (suggestion.status !== 'pending') {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Suggestion already resolved' }) };
    }

    // Handle reject
    if (action === 'reject') {
        await supabase
            .from('merge_suggestions')
            .update({ status: 'rejected' })
            .eq('id', suggestionId);

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'rejected' }) };
    }

    // Handle merge
    const { source_project_id, target_project_id } = suggestion;

    // Load both projects (ensure they belong to this user)
    const [{ data: sourceProject }, { data: targetProject }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', source_project_id).eq('user_id', user.id).single(),
        supabase.from('projects').select('*').eq('id', target_project_id).eq('user_id', user.id).single()
    ]);

    if (!sourceProject || !targetProject) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'One or both projects not found' }) };
    }

    // Build merged data
    const mergedExtracted = mergeExtractedData(
        targetProject.extracted_data || {},
        sourceProject.extracted_data || {}
    );

    // Ensure source has at least one gc_bid entry (legacy projects may not have gc_bids)
    const sourceGCBids = (sourceProject.gc_bids && sourceProject.gc_bids.length > 0)
        ? sourceProject.gc_bids
        : [{
            gc_name:        sourceProject.extracted_data?.gc_name || null,
            scores:         sourceProject.scores || {},
            files:          sourceProject.files || [],
            contract_risks: sourceProject.contract_risks || null,
            bid_due_date:   sourceProject.extracted_data?.bid_deadline || null,
            estimated_value: sourceProject.extracted_data?.estimated_value || null,
            source:         sourceProject.extracted_data?.source || 'manual',
            outcome:        sourceProject.outcome || 'pending',
            outcome_data:   sourceProject.outcome_data || {},
            email_from:     sourceProject.extracted_data?.email_from || null,
            email_subject:  sourceProject.extracted_data?.email_subject || null
        }];

    const targetGCBids = (targetProject.gc_bids && targetProject.gc_bids.length > 0)
        ? targetProject.gc_bids
        : [{
            gc_name:        targetProject.extracted_data?.gc_name || null,
            scores:         targetProject.scores || {},
            files:          targetProject.files || [],
            contract_risks: targetProject.contract_risks || null,
            bid_due_date:   targetProject.extracted_data?.bid_deadline || null,
            estimated_value: targetProject.extracted_data?.estimated_value || null,
            source:         targetProject.extracted_data?.source || 'manual',
            outcome:        targetProject.outcome || 'pending',
            outcome_data:   targetProject.outcome_data || {},
            email_from:     targetProject.extracted_data?.email_from || null,
            email_subject:  targetProject.extracted_data?.email_subject || null
        }];

    const mergedGCBids = sortGCBids(mergeGCBids(targetGCBids, sourceGCBids));

    // Derive project-level fields from merged gc_bids
    const best = bestGCBid(mergedGCBids);
    const mergedScores = best?.scores || targetProject.scores;

    // Union of all GC names for the gcs array
    const allGCNames = [...new Set(mergedGCBids.map(b => b.gc_name).filter(Boolean))];
    const mergedGCs = allGCNames.map(name => {
        const fromTarget = (targetProject.gcs || []).find(g => g.name === name);
        return fromTarget || { name };
    });

    // Merge files (union, deduplicate by name)
    const allFiles = [...(targetProject.files || []), ...(sourceProject.files || [])];
    const mergedFiles = allFiles.filter((f, i) => allFiles.findIndex(x => x.name === f.name) === i);

    // Project-level outcome: if any gc_bid won → won
    let projectOutcome = targetProject.outcome;
    if (mergedGCBids.some(b => b.outcome === 'won')) projectOutcome = 'won';
    else if (mergedGCBids.every(b => ['lost', 'lost_competitor', 'declined'].includes(b.outcome))) projectOutcome = 'lost';

    // Update target project with merged data
    const { error: updateErr } = await supabase
        .from('projects')
        .update({
            extracted_data: mergedExtracted,
            scores:         mergedScores,
            gc_bids:        mergedGCBids,
            gcs:            mergedGCs,
            files:          mergedFiles,
            contract_risks: best?.contract_risks || targetProject.contract_risks,
            outcome:        projectOutcome,
            updated_at:     new Date().toISOString()
        })
        .eq('id', target_project_id);

    if (updateErr) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update target project', detail: updateErr.message }) };
    }

    // Delete source project
    await supabase.from('projects').delete().eq('id', source_project_id);

    // Resolve any other suggestions that reference either project
    await supabase
        .from('merge_suggestions')
        .update({ status: 'accepted' })
        .or(`source_project_id.eq.${source_project_id},target_project_id.eq.${source_project_id},source_project_id.eq.${target_project_id},target_project_id.eq.${target_project_id}`);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            ok: true,
            action: 'merged',
            merged_project_id: target_project_id,
            gc_count: mergedGCBids.length,
            best_score: mergedScores?.final
        })
    };
};
