// components/GCAutocomplete.jsx
// GC Autocomplete Input with AI-powered fuzzy matching
// Used when users select GCs for a bid analysis

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function GCAutocomplete({ 
  onSelect, 
  onAddNew,
  selectedGCs = [],
  maxSelections = 10,
  placeholder = "Search for a General Contractor..."
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLikelyNew, setIsLikelyNew] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')
  const [showAddNewModal, setShowAddNewModal] = useState(false)
  
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchTerm.length < 2) {
      setMatches([])
      setShowDropdown(false)
      setIsLikelyNew(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      await searchGCs(searchTerm)
    }, 300) // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm])

  async function searchGCs(term) {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const response = await supabase.functions.invoke('gc-search', {
        body: {
          searchTerm: term,
          userId: user?.id,
          includeUnapproved: true // Show user's own pending GCs
        }
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const result = response.data

      // Filter out already selected GCs
      const filteredMatches = (result.matches || []).filter(
        gc => !selectedGCs.some(selected => selected.id === gc.id)
      )

      setMatches(filteredMatches)
      setIsLikelyNew(result.isLikelyNew && filteredMatches.length === 0)
      setSuggestedName(result.suggestedName || term)
      setShowDropdown(true)

    } catch (error) {
      console.error('GC search error:', error)
      setMatches([])
      setIsLikelyNew(true)
      setSuggestedName(term)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(gc) {
    if (selectedGCs.length >= maxSelections) {
      alert(`Maximum ${maxSelections} GCs allowed`)
      return
    }

    onSelect(gc)
    setSearchTerm('')
    setMatches([])
    setShowDropdown(false)
    setIsLikelyNew(false)
  }

  function handleAddNewClick() {
    setShowAddNewModal(true)
    setShowDropdown(false)
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={selectedGCs.length >= maxSelections}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Matches */}
          {matches.length > 0 && (
            <div>
              {matches.map(gc => (
                <button
                  key={gc.id}
                  onClick={() => handleSelect(gc)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <div className="font-medium">{gc.name}</div>
                    <div className="text-sm text-gray-500">
                      {gc.city && `${gc.city}, ${gc.state}`}
                      {gc.matchType === 'ai_fuzzy' && (
                        <span className="ml-2 text-blue-600">
                          (AI match: {Math.round(gc.aiConfidence * 100)}%)
                        </span>
                      )}
                    </div>
                    {gc.risk_tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {gc.risk_tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!gc.approved && (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      Pending
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No matches / Add New */}
          {isLikelyNew && (
            <div className="p-4 bg-gray-50 border-t">
              <p className="text-sm text-gray-600 mb-3">
                No matching GC found for "{searchTerm}"
              </p>
              <button
                onClick={handleAddNewClick}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <span>+</span>
                Add "{suggestedName}" as New GC
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && matches.length === 0 && !isLikelyNew && searchTerm.length >= 2 && (
            <div className="p-4 text-center text-gray-500">
              Type more to search...
            </div>
          )}
        </div>
      )}

      {/* Add New GC Modal */}
      {showAddNewModal && (
        <AddNewGCModal
          initialName={suggestedName}
          onClose={() => setShowAddNewModal(false)}
          onSuccess={(newGC) => {
            handleSelect(newGC)
            setShowAddNewModal(false)
          }}
        />
      )}
    </div>
  )
}

// Modal for adding new GC
function AddNewGCModal({ initialName, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: initialName,
    city: '',
    state: '',
    starRating: 3,
    riskTags: []
  })
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const riskTagOptions = [
    { value: 'slow_pay', label: '💰 Slow pay' },
    { value: 'pay_if_paid', label: '📋 Pay-if-paid' },
    { value: 'change_order_hostile', label: '⚠️ CO hostile' },
    { value: 'bid_shopping', label: '🛒 Bid shopping' },
    { value: 'low_feedback', label: '📇 Low feedback' },
    { value: 'scope_creep', label: '📈 Scope creep' }
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const response = await supabase.functions.invoke('gc-submit-new', {
        body: {
          gcName: formData.name,
          city: formData.city,
          state: formData.state,
          userId: user?.id,
          starRating: formData.starRating,
          riskTags: formData.riskTags
        }
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      setAiResult(response.data)

      // If it's a likely duplicate, show warning but still allow proceed
      if (response.data.aiRecommendation === 'merge') {
        // Show the duplicate warning
        // User can still proceed by clicking "Use Anyway"
      } else {
        // New GC, return it
        onSuccess(response.data.gc)
      }

    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to add GC. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleUseAnyway() {
    if (aiResult?.gc) {
      onSuccess(aiResult.gc)
    }
  }

  function handleUseSuggested() {
    if (aiResult?.possibleDuplicate) {
      onSuccess({
        id: aiResult.possibleDuplicate.id,
        name: aiResult.possibleDuplicate.name,
        approved: true
      })
    }
  }

  function toggleRiskTag(tag) {
    setFormData(prev => ({
      ...prev,
      riskTags: prev.riskTags.includes(tag)
        ? prev.riskTags.filter(t => t !== tag)
        : [...prev.riskTags, tag]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Add New GC</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* AI Duplicate Warning */}
          {aiResult?.aiRecommendation === 'merge' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🤖</span>
                <span className="font-medium text-yellow-800">Possible Duplicate Detected</span>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                This may be the same as <strong>"{aiResult.possibleDuplicate?.name}"</strong>
              </p>
              <p className="text-xs text-yellow-600 mb-4">{aiResult.aiReasoning}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={handleUseSuggested}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Use "{aiResult.possibleDuplicate?.name}"
                </button>
                <button
                  onClick={handleUseAnyway}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  Add Anyway
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!aiResult && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GC Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    maxLength={2}
                    placeholder="CA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, starRating: star }))}
                      className={`text-2xl ${formData.starRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {riskTagOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleRiskTag(option.value)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.riskTags.includes(option.value)
                          ? 'bg-red-100 text-red-700 border-2 border-red-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Checking...
                    </>
                  ) : (
                    'Add GC'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
