// supabase/functions/gc-search/index.ts
// GC Search with AI Fuzzy Matching
// Provides real-time autocomplete as user types GC names

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchTerm, userId, includeUnapproved = false } = await req.json()

    // Validate input
    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ matches: [], message: 'Search term too short' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanedSearch = searchTerm.trim().toLowerCase()

    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ================================================
    // STEP 1: Direct database search
    // ================================================
    
    let query = supabase
      .from('gc_master')
      .select('id, name, city, state, risk_tags, aliases, star_rating')
      .order('name')
      .limit(10)

    // Filter by approval status
    if (!includeUnapproved) {
      query = query.eq('approved', true)
    }

    // Search by name OR aliases
    const { data: directMatches, error: searchError } = await query
      .or(`name.ilike.%${cleanedSearch}%`)

    if (searchError) {
      console.error('Search error:', searchError)
      throw new Error('Database search failed')
    }

    // Also check aliases (separate query since array contains is tricky)
    const { data: aliasMatches } = await supabase
      .from('gc_master')
      .select('id, name, city, state, risk_tags, aliases, star_rating')
      .eq('approved', true)
      .contains('aliases', [cleanedSearch])
      .limit(5)

    // Combine and deduplicate matches
    const allMatches = [...(directMatches || [])]
    aliasMatches?.forEach(am => {
      if (!allMatches.find(m => m.id === am.id)) {
        allMatches.push(am)
      }
    })

    // Check for exact match
    const exactMatch = allMatches.find(gc => 
      gc.name.toLowerCase() === cleanedSearch ||
      gc.aliases?.some(a => a.toLowerCase() === cleanedSearch)
    )

    // ================================================
    // STEP 2: If good matches found, return them
    // ================================================
    
    if (allMatches.length > 0) {
      return new Response(
        JSON.stringify({
          matches: allMatches.map(gc => ({
            ...gc,
            displayName: `${gc.name} (${gc.city}, ${gc.state})`,
            matchType: 'direct'
          })),
          exactMatch: !!exactMatch,
          isLikelyNew: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // STEP 3: No direct matches - use AI fuzzy matching
    // ================================================
    
    const anthropic = new Anthropic({ 
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')! 
    })

    // Get all GCs for AI comparison (limit for context window)
    const { data: allGCs } = await supabase
      .from('gc_master')
      .select('id, name, city, state')
      .eq('approved', true)
      .order('name')
      .limit(500)

    // If no GCs in database yet, skip AI matching
    if (!allGCs || allGCs.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          isLikelyNew: true,
          suggestedName: formatGCName(searchTerm)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gcList = allGCs.map(gc => `${gc.id}|${gc.name}|${gc.city}, ${gc.state}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `User is searching for a General Contractor named: "${searchTerm}"

Existing GCs in database (format: id|name|location):
${gcList}

Task: Find the best matches for "${searchTerm}". Consider:
- Spelling variations (Turner vs Turnar, McCarthy vs MacCarthy)
- Abbreviations (Const vs Construction, Co vs Company, Corp vs Corporation)
- Common typos and misspellings
- Partial matches (user might type part of the name)
- Location variations (same company, different office)

Return up to 3 best matches if found.

Respond ONLY with valid JSON, no other text:
{
  "matches": [
    {"id": "uuid-here", "confidence": 0.95, "reason": "Brief explanation"}
  ],
  "isLikelyNew": true or false,
  "suggestedName": "Properly Formatted Name if likely new"
}

If no good matches (confidence < 0.5), return empty matches array and isLikelyNew: true.`
      }]
    })

    // Parse AI response
    let aiResult
    try {
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      aiResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('AI response parse error:', parseError)
      // Fallback: treat as new
      return new Response(
        JSON.stringify({
          matches: [],
          isLikelyNew: true,
          suggestedName: formatGCName(searchTerm)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // STEP 4: Enrich AI matches with full GC data
    // ================================================
    
    if (aiResult.matches && aiResult.matches.length > 0) {
      const matchIds = aiResult.matches.map((m: any) => m.id)
      const { data: enrichedMatches } = await supabase
        .from('gc_master')
        .select('id, name, city, state, risk_tags, aliases, star_rating')
        .in('id', matchIds)

      return new Response(
        JSON.stringify({
          matches: enrichedMatches?.map(gc => ({
            ...gc,
            displayName: `${gc.name} (${gc.city}, ${gc.state})`,
            matchType: 'ai_fuzzy',
            aiConfidence: aiResult.matches.find((m: any) => m.id === gc.id)?.confidence,
            aiReason: aiResult.matches.find((m: any) => m.id === gc.id)?.reason
          })) || [],
          isLikelyNew: aiResult.isLikelyNew,
          suggestedName: aiResult.suggestedName || formatGCName(searchTerm)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // STEP 5: No matches - return as likely new
    // ================================================
    
    return new Response(
      JSON.stringify({
        matches: [],
        isLikelyNew: true,
        suggestedName: formatGCName(searchTerm)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('GC Search Error:', error)
    return new Response(
      JSON.stringify({ error: 'Search failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Format GC name consistently
 * - Title case
 * - Expand common abbreviations
 * - Remove extra whitespace
 */
function formatGCName(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map(word => {
      // Keep common acronyms uppercase
      if (['LLC', 'INC', 'LP', 'LLP', 'PC', 'PLLC'].includes(word.toUpperCase())) {
        return word.toUpperCase()
      }
      // Title case everything else
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    // Expand common abbreviations
    .replace(/\bCo\b$/gi, 'Company')
    .replace(/\bConst\b/gi, 'Construction')
    .replace(/\bBldrs\b/gi, 'Builders')
    .replace(/\bCorp\b$/gi, 'Corporation')
    .replace(/\bBldg\b/gi, 'Building')
    .replace(/\bMgmt\b/gi, 'Management')
    .replace(/\bDev\b/gi, 'Development')
    .replace(/\bGrp\b/gi, 'Group')
    .replace(/\bIntl\b/gi, 'International')
    .replace(/\bNatl\b/gi, 'National')
}
