import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { markAllAsRead } from '@/services/notification.service'

export const Route = createFileRoute('/api/notifications/read-all')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return new Response('Unauthorized', { status: 401 })

        const count = await markAllAsRead(session.uid)
        return Response.json({ marked: count })
      },
    },
  },
})
