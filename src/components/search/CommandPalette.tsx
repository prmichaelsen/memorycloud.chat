/**
 * CommandPalette — Cmd+K global search across DM partners, groups, and messages.
 * Powered by Algolia via GET /api/search. Rendered via createPortal to document.body.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from '@tanstack/react-router'
import { User, Users, MessageSquare, Search, Loader2 } from 'lucide-react'
import { useTheme } from '@/lib/theming'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

type ResultType = 'dm_partner' | 'group' | 'message'

interface SearchResult {
  objectID: string
  type: ResultType
  name: string
  content?: string
  conversation_id?: string
  description?: string
  sender_name?: string
  email?: string
  photo_url?: string
  _highlightResult?: Record<string, { value: string; matchLevel: string }>
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const t = useTheme()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const syncedRef = useRef(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  // Trigger Algolia sync on first open (fire-and-forget)
  useEffect(() => {
    if (!isOpen || syncedRef.current) return
    syncedRef.current = true
    fetch('/api/search/sync', { method: 'POST' }).catch(() => {})
  }, [isOpen])

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  // Debounced search via Algolia endpoint
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setActiveIndex(0)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&hitsPerPage=15`,
        )
        if (res.ok) {
          const data = (await res.json()) as { hits?: SearchResult[] }
          setResults(data.hits ?? [])
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      }
      setActiveIndex(0)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        selectResult(results[activeIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [results, activeIndex, onClose],
  )

  const selectResult = useCallback(
    (result: SearchResult) => {
      onClose()
      if (result.conversation_id) {
        router.navigate({ to: `/chat/${result.conversation_id}` })
      } else if (result.type === 'dm_partner') {
        router.navigate({ to: '/chat' })
      }
    },
    [onClose, router],
  )

  // Scroll active item into view
  const resultsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = resultsRef.current
    if (!container) return
    const active = container.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!isOpen) return null

  const grouped = groupResults(results)

  const iconForType = (type: ResultType) => {
    switch (type) {
      case 'dm_partner':
        return <User className="w-4 h-4 shrink-0 opacity-60" />
      case 'group':
        return <Users className="w-4 h-4 shrink-0 opacity-60" />
      case 'message':
        return <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
    }
  }

  const sectionLabel = (type: ResultType) => {
    switch (type) {
      case 'dm_partner':
        return 'People'
      case 'group':
        return 'Groups'
      case 'message':
        return 'Messages'
    }
  }

  const subtitle = (result: SearchResult) => {
    switch (result.type) {
      case 'dm_partner':
        return result.email || ''
      case 'group':
        return result.description || ''
      case 'message':
        return result.sender_name
          ? `${result.sender_name}: ${(result.content ?? '').slice(0, 60)}`
          : (result.content ?? '').slice(0, 80)
    }
  }

  let globalIndex = -1

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`relative w-full max-w-lg mx-4 h-fit max-h-[60vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${t.card} border ${t.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${t.border}`}>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin opacity-40" />
          ) : (
            <Search className="w-5 h-5 opacity-40" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search people, groups, messages..."
            className={`flex-1 bg-transparent outline-none text-sm ${t.textPrimary} placeholder:opacity-50`}
          />
          <kbd className={`text-xs px-1.5 py-0.5 rounded ${t.buttonSecondary} opacity-60`}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="overflow-y-auto">
          {query.trim() && !loading && results.length === 0 && (
            <div className={`px-4 py-8 text-center text-sm ${t.textMuted}`}>
              No results found
            </div>
          )}

          {grouped.map(([type, items]) => (
            <div key={type}>
              <div
                className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider ${t.textMuted}`}
              >
                {sectionLabel(type)}
              </div>
              {items.map((result) => {
                globalIndex++
                const idx = globalIndex
                const isActive = idx === activeIndex
                return (
                  <button
                    key={result.objectID}
                    data-active={isActive}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isActive ? t.active : `${t.hover}`
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectResult(result)}
                  >
                    {iconForType(result.type)}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${t.textPrimary}`}>{result.name}</div>
                      <div className={`truncate text-xs ${t.textMuted}`}>
                        {subtitle(result)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// --- helpers ---

function groupResults(results: SearchResult[]): [ResultType, SearchResult[]][] {
  const order: ResultType[] = ['dm_partner', 'group', 'message']
  const map = new Map<ResultType, SearchResult[]>()
  for (const r of results) {
    if (!map.has(r.type)) map.set(r.type, [])
    map.get(r.type)!.push(r)
  }
  return order.filter((t) => map.has(t)).map((t) => [t, map.get(t)!])
}
