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
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const query = url.searchParams.get('q') ?? ''
        const limit = parseInt(url.searchParams.get('limit') ?? '10', 10)

        if (!query || query.length < 2) {
          return Response.json({ users: [] })
        }

        try {
          // Search users by email prefix in shared Firestore
          const results = await queryDocuments('agentbase.users', {
            where: [
              { field: 'email', op: '>=', value: query },
              { field: 'email', op: '<=', value: query + '\uf8ff' },
            ],
            limit,
          })

          const users = (results ?? [])
            .filter((doc: any) => doc.id !== session.uid)
            .map((doc: any) => ({
              uid: doc.id,
              email: doc.email ?? null,
              displayName: doc.display_name ?? doc.displayName ?? null,
              photoURL: doc.photo_url ?? doc.photoURL ?? null,
            }))

          return Response.json({ users })
        } catch (error) {
          console.error('[api/users/search]', error)
          return Response.json({ users: [] })
        }
      },
    },
  },
})
