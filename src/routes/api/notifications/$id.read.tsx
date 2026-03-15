import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { NotificationDatabaseService } from '@/services/notification-database.service'

export const Route = createFileRoute('/api/notifications/$id/read')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        try {
          await NotificationDatabaseService.markAsRead(params.id, session.uid)
          return Response.json({ success: true })
        } catch {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
      },
    },
  },
})
