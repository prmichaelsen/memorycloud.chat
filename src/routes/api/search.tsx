/**
 * GET /api/search — Algolia-powered global search across DM partners, groups, and messages.
 * Query params: q (required), types (optional, comma-separated: dm_partner,group,message), hitsPerPage, page
 */

import { createFileRoute } from '@tanstack/react-router'
import { getServerSession } from '@/lib/auth/session'
import { search, type SearchEntityType } from '@/services/search.service'

const VALID_TYPES = new Set<SearchEntityType>(['dm_partner', 'group', 'message'])

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const q = url.searchParams.get('q')?.trim() ?? ''

        if (!q) {
          return Response.json({ hits: [], nbHits: 0, query: '' })
        }

        const typesParam = url.searchParams.get('types')
        const types = typesParam
          ? (typesParam.split(',').filter((t) => VALID_TYPES.has(t as SearchEntityType)) as SearchEntityType[])
          : undefined

        const hitsPerPage = Math.min(
          Math.max(parseInt(url.searchParams.get('hitsPerPage') ?? '15', 10) || 15, 1),
          50,
        )
        const page = Math.max(parseInt(url.searchParams.get('page') ?? '0', 10) || 0, 0)

        try {
          const result = await search(
            { query: q, types, hitsPerPage, page },
            session.uid,
          )
          return Response.json(result)
        } catch (error) {
          console.error('[API] Search error:', error)
          return Response.json(
            { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
