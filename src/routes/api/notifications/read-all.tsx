import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { NotificationDatabaseService } from '@/services/notification-database.service'

export const Route = createFileRoute('/api/notifications/read-all')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const count = await NotificationDatabaseService.markAllAsRead(session.uid)
        return Response.json({ marked: count })
      },
    },
  },
})
