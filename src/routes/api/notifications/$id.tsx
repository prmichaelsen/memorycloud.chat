import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { NotificationDatabaseService } from '@/services/notification-database.service'

export const Route = createFileRoute('/api/notifications/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }: { request: Request; params: { id: string } }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        try {
          await NotificationDatabaseService.delete(params.id, session.uid)
          return Response.json({ deleted: true })
        } catch {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
      },
    },
  },
})
