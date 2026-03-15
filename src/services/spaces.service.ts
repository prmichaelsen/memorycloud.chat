/**
 * Spaces client service — wraps /api/spaces/* endpoints.
 * Used by The Void tab to fetch public space memories.
 */

import type { MemoryFeedAlgorithm } from '@/types/memories'
import type { MemoryFeedResponse } from './memory.service'

export const SpacesService = {
  async getFeed(params: {
    algorithm: MemoryFeedAlgorithm
    spaces: string[]
    query: string | null
    limit: number
    offset: number
  }): Promise<MemoryFeedResponse> {
    try {
      const qs = new URLSearchParams({
        algorithm: params.algorithm,
        spaces: params.spaces.join(','),
        limit: String(params.limit),
        offset: String(params.offset),
        ...(params.query ? { query: params.query } : {}),
      })
      const res = await fetch(`/api/spaces/feed?${qs}`)
      if (!res.ok) {
        return { memories: [], total: 0, hasMore: false, limit: params.limit, offset: params.offset }
      }
      return res.json()
    } catch {
      return { memories: [], total: 0, hasMore: false, limit: params.limit, offset: params.offset }
    }
  },
}
