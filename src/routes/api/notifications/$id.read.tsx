import { createFileRoute } from '@tanstack/react-router'
import { getServerSession } from '@/lib/auth/session'
import { NotificationDatabaseService } from '@/services/notification-database.service'

export const Route = createFileRoute('/api/notifications/$id/read')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const session = await getServerSession(request)
        if (!session) return new Response('Unauthorized', { status: 401 })

        await NotificationDatabaseService.markAsRead(params.id, session.uid)
        return Response.json({ success: true })
      },
    },
  },
})
