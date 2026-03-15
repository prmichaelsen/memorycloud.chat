import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { getRememberSvcClient } from '@/lib/remember-sdk'

export const Route = createFileRoute('/api/memories/$memoryId/similar')({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { memoryId: string }
      }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { memoryId } = params
        if (!memoryId) {
          return Response.json(
            { error: 'memoryId is required' },
            { status: 400 },
          )
        }

        const url = new URL(request.url)
        const limit = Math.min(
          Math.max(
            parseInt(url.searchParams.get('limit') ?? '10', 10) || 10,
            1,
          ),
          100,
        )
        const minSimilarity = Math.min(
          Math.max(
            parseFloat(url.searchParams.get('min_similarity') ?? '0.7') || 0.7,
            0,
          ),
          1,
        )

        try {
          const svc = await getRememberSvcClient()
          const res = await svc.memories.similar(session.uid, {
            memory_id: memoryId,
            limit,
            min_similarity: minSimilarity,
          })
          const data = res.throwOnError() as any

          return Response.json({
            memories: data.similar_memories ?? [],
          })
        } catch (error) {
          console.error('[API] Similar memories error:', error)
          return Response.json(
            {
              error: 'Internal server error',
              message:
                error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
