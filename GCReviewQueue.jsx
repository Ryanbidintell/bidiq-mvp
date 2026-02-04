// components/admin/GCReviewQueue.jsx
// Admin Dashboard Component for GC Name Normalization
// Displays pending GC submissions with AI recommendations for admin approval

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function GCReviewQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null) // Track which item is being processed
  const [stats, setStats] = useState({ pending: 0, approved: 0, merged: 0, deleted: 0 })

  useEffect(() => {
    loadQueue()
    loadStats()
  }, [])

  async function loadQueue() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('gc_review_queue')
      .select(`
        *,
        suggested_match:gc_master!ai_suggested_match(id, name, city, state),
        submitted_user:auth.users!submitted_by(email)
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading queue:', error)
    } else {
      setQueue(data || [])
    }
    
    setLoading(false)
  }

  async function loadStats() {
    const { data, error } = await supabase
      .from('gc_review_queue')
      .select('status')
    
    if (!error && data) {
      const counts = data.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {})
      setStats({
        pending: counts.pending || 0,
        approved: counts.approved || 0,
        merged: counts.merged || 0,
        deleted: counts.deleted || 0
      })
    }
  }

  async function handleMerge(item) {
    if (!item.ai_suggested_match || !item.user_context?.tempGcId) {
      alert('Cannot merge: missing match information')
      return
    }

    setProcessing(item.id)

    try {
      // 1. Update all project references from temp GC to master GC
      const { error: updateError } = await supabase
        .from('project_gcs')
        .update({ gc_id: item.ai_suggested_match })
        .eq('gc_id', item.user_context.tempGcId)

      if (updateError) {
        console.error('Error updating project references:', updateError)
      }

      // 2. Add submitted name as alias to master GC
      const { data: masterGC } = await supabase
        .from('gc_master')
        .select('aliases')
        .eq('id', item.ai_suggested_match)
        .single()

      const existingAliases = masterGC?.aliases || []
      const newAlias = item.submitted_name.toLowerCase()
      
      if (!existingAliases.includes(newAlias)) {
        await supabase
          .from('gc_master')
          .update({ aliases: [...existingAliases, newAlias] })
          .eq('id', item.ai_suggested_match)
      }

      // 3. Delete temporary GC
      await supabase
        .from('gc_master')
        .delete()
        .eq('id', item.user_context.tempGcId)

      // 4. Mark queue item as resolved
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('gc_review_queue')
        .update({
          status: 'merged',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolved_action: `Merged with ${item.suggested_match?.name || 'existing GC'}`
        })
        .eq('id', item.id)

      // Refresh data
      await loadQueue()
      await loadStats()

    } catch (error) {
      console.error('Merge error:', error)
      alert('Failed to merge GC. See console for details.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleApproveNew(item) {
    if (!item.user_context?.tempGcId) {
      alert('Cannot approve: missing GC information')
      return
    }

    setProcessing(item.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Approve the temporary GC
      await supabase
        .from('gc_master')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          name: item.user_context.formattedName || item.submitted_name
        })
        .eq('id', item.user_context.tempGcId)

      // 2. Mark queue item as resolved
      await supabase
        .from('gc_review_queue')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolved_action: 'Approved as new GC'
        })
        .eq('id', item.id)

      // Refresh data
      await loadQueue()
      await loadStats()

    } catch (error) {
      console.error('Approve error:', error)
      alert('Failed to approve GC. See console for details.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleDelete(item) {
    if (!confirm('Are you sure you want to delete this submission? This cannot be undone.')) {
      return
    }

    setProcessing(item.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Remove GC references from projects
      if (item.user_context?.tempGcId) {
        await supabase
          .from('project_gcs')
          .delete()
          .eq('gc_id', item.user_context.tempGcId)

        // 2. Delete temporary GC
        await supabase
          .from('gc_master')
          .delete()
          .eq('id', item.user_context.tempGcId)
      }

      // 3. Mark queue item as deleted
      await supabase
        .from('gc_review_queue')
        .update({
          status: 'deleted',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolved_action: 'Deleted - invalid submission'
        })
        .eq('id', item.id)

      // Refresh data
      await loadQueue()
      await loadStats()

    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete submission. See console for details.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleLinkToExisting(item) {
    // This would open a modal to search and select an existing GC
    // For now, show placeholder
    alert('Link to Existing: This feature would open a GC search modal. Coming soon!')
  }

  // Confidence badge color
  function getConfidenceColor(confidence) {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading review queue...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending Review</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
          <div className="text-sm text-green-600">Approved</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.merged}</div>
          <div className="text-sm text-blue-600">Merged</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-700">{stats.deleted}</div>
          <div className="text-sm text-gray-600">Deleted</div>
        </div>
      </div>

      {/* Queue */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">GC Review Queue</h2>
          <button 
            onClick={() => { loadQueue(); loadStats(); }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ↻ Refresh
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-500 text-lg">No GCs pending review!</p>
            <p className="text-gray-400 text-sm mt-2">New submissions will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y">
            {queue.map(item => (
              <div key={item.id} className={`p-6 ${processing === item.id ? 'opacity-50' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-lg font-medium">"{item.submitted_name}"</span>
                    {item.user_context?.city && (
                      <span className="text-gray-500 ml-2">
                        ({item.user_context.city}, {item.user_context.state})
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <div>{item.submitted_user?.email || 'Unknown user'}</div>
                    <div>{new Date(item.submitted_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* AI Recommendation Box */}
                <div className={`p-4 rounded-lg mb-4 ${
                  item.ai_recommendation === 'merge' 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🤖</span>
                    <span className="font-medium">
                      AI Recommendation: {item.ai_recommendation === 'merge' ? 'Merge with Existing' : 'Add as New'}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(item.ai_confidence)}`}>
                      {Math.round(item.ai_confidence * 100)}% confident
                    </span>
                  </div>

                  {item.ai_recommendation === 'merge' && item.suggested_match && (
                    <p className="text-gray-700 mb-2">
                      <strong>Suggested match:</strong> {item.suggested_match.name} 
                      {item.suggested_match.city && ` (${item.suggested_match.city}, ${item.suggested_match.state})`}
                    </p>
                  )}

                  <p className="text-gray-600 text-sm">{item.ai_reasoning}</p>

                  {item.user_context?.warnings?.length > 0 && (
                    <div className="mt-3 p-2 bg-orange-100 rounded text-orange-700 text-sm">
                      ⚠️ {item.user_context.warnings.join(' • ')}
                    </div>
                  )}

                  {item.user_context?.formattedName && item.user_context.formattedName !== item.submitted_name && (
                    <div className="mt-2 text-sm text-gray-500">
                      Formatted name: <strong>{item.user_context.formattedName}</strong>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {item.ai_recommendation === 'merge' && item.suggested_match && (
                    <button
                      onClick={() => handleMerge(item)}
                      disabled={processing === item.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {processing === item.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        '✓'
                      )}
                      Approve Merge
                    </button>
                  )}

                  <button
                    onClick={() => handleApproveNew(item)}
                    disabled={processing === item.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {processing === item.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      '+'
                    )}
                    Add as New
                  </button>

                  {item.ai_recommendation === 'new' && (
                    <button
                      onClick={() => handleLinkToExisting(item)}
                      disabled={processing === item.id}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔗 Link to Existing
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item)}
                    disabled={processing === item.id}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
