/**
 * VoidFeed — public space memory feed (The Void).
 * Same structure as MemoryFeed but uses SpacesService to fetch from the_void.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Globe,
  Sparkles,
  Clock,
  Compass,
  Star,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { useTheme } from '@/lib/theming'
import { SpacesService } from '@/services/spaces.service'
import { MemoryCard } from '@/components/memories/MemoryCard'
import { MemorySearch } from '@/components/memories/MemorySearch'
import type { MemoryItem, MemoryFeedAlgorithm } from '@/types/memories'
import type { MemoryFeedResponse } from '@/services/memory.service'

const PAGE_SIZE = 20

const ALGORITHM_OPTIONS: Array<{
  value: MemoryFeedAlgorithm
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'smart', label: 'Smart', icon: Sparkles },
  { value: 'chronological', label: 'Recent', icon: Clock },
  { value: 'discovery', label: 'Discover', icon: Compass },
  { value: 'rating', label: 'Top Rated', icon: Star },
  { value: 'significance', label: 'Significant', icon: TrendingUp },
]

export function VoidFeed() {
  const t = useTheme()

  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const [algorithm, setAlgorithm] = useState<MemoryFeedAlgorithm>('smart')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadFeed = useCallback(
    async (reset: boolean) => {
      const currentOffset = reset ? 0 : offsetRef.current

      if (reset) {
        setLoading(true)
        setMemories([])
        setError(null)
        offsetRef.current = 0
      } else {
        setLoadingMore(true)
      }

      try {
        const result: MemoryFeedResponse = await SpacesService.getFeed({
          algorithm,
          spaces: ['the_void'],
          query: searchQuery || null,
          limit: PAGE_SIZE,
          offset: currentOffset,
        })

        const newItems = result.memories ?? []
        setMemories((prev) => (reset ? newItems : [...prev, ...newItems]))
        setHasMore(result.hasMore ?? false)
        offsetRef.current = currentOffset + newItems.length
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load The Void')
      } finally {
        setLoading(false)
        setLoadingMore(false)
        setIsSearching(false)
      }
    },
    [algorithm, searchQuery],
  )

  useEffect(() => {
    loadFeed(true)
  }, [algorithm, loadFeed])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(!!query)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadFeed(false)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadFeed])

  return (
    <div className="space-y-4">
      <MemorySearch
        onSearch={handleSearch}
        isSearching={isSearching}
        placeholder="Search The Void..."
      />

      {/* Algorithm selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ALGORITHM_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = algorithm === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAlgorithm(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-brand-accent text-white'
                  : `${t.buttonGhost} border border-border-default`
              }`}
            >
              <Icon className="w-3 h-3" />
              {opt.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="text-brand-danger p-4 rounded-lg bg-brand-danger/10 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bg-elevated rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !error && memories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Globe className={`w-12 h-12 ${t.textMuted} mb-3`} />
          <p className={`${t.textMuted} text-sm`}>
            {searchQuery
              ? 'No memories match your search in The Void'
              : 'The Void is empty. Publish memories to share with the community.'}
          </p>
        </div>
      )}

      {!loading && memories.length > 0 && (
        <div className="space-y-2">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4">
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className={`w-5 h-5 animate-spin ${t.textMuted}`} />
          </div>
        )}
      </div>
    </div>
  )
}
