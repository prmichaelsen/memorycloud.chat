import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { queryDocuments } from '@prmichaelsen/firebase-admin-sdk-v8'

export const Route = createFileRoute('/api/users/search')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const q = url.searchParams.get('q')?.trim() ?? ''

        if (!q) {
          return Response.json({ users: [] })
        }

        try {
          // Query Firestore users collection.
          // Firestore doesn't support native full-text search, so we use
          // a prefix range query on displayName as a reasonable approximation.
          const upperBound = q.slice(0, -1) + String.fromCharCode(q.charCodeAt(q.length - 1) + 1)

          const docs = await queryDocuments('agentbase.users', {
            where: [
              { field: 'displayName', op: '>=', value: q },
              { field: 'displayName', op: '<', value: upperBound },
            ],
            limit: 20,
          })

          const users = docs.map((doc) => {
            const data = doc.data as Record<string, unknown>
            return {
              uid: doc.id,
              displayName: data.displayName ?? null,
              email: data.email ?? null,
              photoURL: data.photoURL ?? null,
            }
          })

          return Response.json({ users })
        } catch (error) {
          console.error('[API] User search error:', error)
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
