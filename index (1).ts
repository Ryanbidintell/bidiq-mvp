// supabase/functions/gc-submit-new/index.ts
// Submit New GC with AI Duplicate Detection
// Handles new GC submissions, analyzes for duplicates, adds to review queue

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
    const { 
      gcName, 
      city, 
      state, 
      userId, 
      projectId, 
      starRating = 3, 
      riskTags = [] 
    } = await req.json()

    // Validate required fields
    if (!gcName || !userId) {
      return new Response(
        JSON.stringify({ error: 'GC name and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const anthropic = new Anthropic({ 
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')! 
    })

    // ================================================
    // STEP 1: Get all existing GCs for AI comparison
    // ================================================
    
    const { data: allGCs } = await supabase
      .from('gc_master')
      .select('id, name, city, state, aliases')
      .eq('approved', true)
      .order('name')
      .limit(500)

    // ================================================
    // STEP 2: AI analyzes if this is truly new or duplicate
    // ================================================
    
    const gcListForAI = allGCs?.map(gc => 
      `- ${gc.name} (${gc.city || 'Unknown'}, ${gc.state || 'Unknown'}) [ID: ${gc.id}]${gc.aliases?.length ? ` [aliases: ${gc.aliases.join(', ')}]` : ''}`
    ).join('\n') || 'No existing GCs in database'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `A user wants to add a new General Contractor to the database:

**Submitted GC:**
- Name: "${gcName}"
- City: ${city || 'Not provided'}
- State: ${state || 'Not provided'}

**Existing GCs in database:**
${gcListForAI}

**Your task:**
1. Determine if this is likely a DUPLICATE of an existing GC
2. Consider: spelling variations, abbreviations, typos, same company different location
3. If duplicate, identify which existing GC it matches
4. If new, format the name properly (title case, expand abbreviations)

**Analysis criteria:**
- "Turner Const" = "Turner Construction" (abbreviation → DUPLICATE)
- "Turner Construction (Denver)" vs "Turner Construction (Atlanta)" = Different offices, could be DUPLICATE or NEW depending on context
- "McCarthy Building" vs "McCarthy Building Companies" = Likely DUPLICATE
- "Completely Different Name LLC" = NEW

Respond ONLY with valid JSON:
{
  "recommendation": "merge" or "new",
  "confidence": 0.0 to 1.0,
  "reasoning": "Clear explanation of why",
  "suggestedMatchId": "uuid of best match or null if new",
  "suggestedMatchName": "Name of matched GC or null",
  "formattedName": "Properly Formatted GC Name",
  "warnings": ["array of any concerns about this submission"]
}`
      }]
    })

    // Parse AI response
    let aiAnalysis
    try {
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      aiAnalysis = JSON.parse(responseText)
    } catch (parseError) {
      console.error('AI response parse error:', parseError)
      // Fallback: treat as new
      aiAnalysis = {
        recommendation: 'new',
        confidence: 0.5,
        reasoning: 'Could not analyze - defaulting to new',
        suggestedMatchId: null,
        suggestedMatchName: null,
        formattedName: formatGCName(gcName),
        warnings: ['AI analysis failed - manual review recommended']
      }
    }

    // ================================================
    // STEP 3: Create temporary GC record (unapproved)
    // ================================================
    
    // This allows the user to continue with their project while admin reviews
    const { data: tempGC, error: insertError } = await supabase
      .from('gc_master')
      .insert({
        name: aiAnalysis.formattedName || formatGCName(gcName),
        city: city || null,
        state: state || null,
        star_rating: starRating,
        risk_tags: riskTags,
        created_by: userId,
        approved: false, // Not approved until admin reviews
        aliases: [gcName.toLowerCase()] // Store original input as alias
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error('Failed to create GC record')
    }

    // ================================================
    // STEP 4: Add to review queue with AI recommendation
    // ================================================
    
    const { error: queueError } = await supabase
      .from('gc_review_queue')
      .insert({
        submitted_name: gcName,
        submitted_by: userId,
        original_project_id: projectId || null,
        ai_recommendation: aiAnalysis.recommendation,
        ai_suggested_match: aiAnalysis.suggestedMatchId,
        ai_confidence: aiAnalysis.confidence,
        ai_reasoning: aiAnalysis.reasoning,
        user_context: {
          city,
          state,
          starRating,
          riskTags,
          tempGcId: tempGC.id,
          formattedName: aiAnalysis.formattedName,
          warnings: aiAnalysis.warnings,
          suggestedMatchName: aiAnalysis.suggestedMatchName
        }
      })

    if (queueError) {
      console.error('Queue insert error:', queueError)
      // Don't fail the request - the GC was created, just not queued
    }

    // ================================================
    // STEP 5: Return result to user
    // ================================================
    
    const userMessage = aiAnalysis.recommendation === 'merge'
      ? `This may be a duplicate of "${aiAnalysis.suggestedMatchName}". You can use it now, and an admin will review.`
      : 'New GC added! An admin will review and approve shortly.'

    return new Response(
      JSON.stringify({
        success: true,
        gc: {
          id: tempGC.id,
          name: tempGC.name,
          city: tempGC.city,
          state: tempGC.state,
          displayName: `${tempGC.name}${tempGC.city ? ` (${tempGC.city}, ${tempGC.state})` : ''}`,
          approved: false,
          isTemporary: true
        },
        aiRecommendation: aiAnalysis.recommendation,
        aiConfidence: aiAnalysis.confidence,
        aiReasoning: aiAnalysis.reasoning,
        possibleDuplicate: aiAnalysis.recommendation === 'merge' ? {
          id: aiAnalysis.suggestedMatchId,
          name: aiAnalysis.suggestedMatchName
        } : null,
        warnings: aiAnalysis.warnings,
        message: userMessage
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('GC Submit Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to submit GC', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Format GC name consistently
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
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
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
