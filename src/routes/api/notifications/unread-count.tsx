import { createFileRoute } from '@tanstack/react-router'
import { getServerSession } from '@/lib/auth/session'
import { getUnreadCount } from '@/services/notification.service'

export const Route = createFileRoute('/api/notifications/unread-count')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await getServerSession(request)
        if (!session) return new Response('Unauthorized', { status: 401 })

        const count = await getUnreadCount(session.uid)
        return Response.json({ count })
      },
    },
  },
})
