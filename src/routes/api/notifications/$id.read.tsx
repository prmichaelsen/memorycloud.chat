import { createFileRoute } from '@tanstack/react-router'
import { getServerSession } from '@/lib/auth/session'
import { markAsRead } from '@/services/notification.service'

export const Route = createFileRoute('/api/notifications/$id/read')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const session = await getServerSession(request)
        if (!session) return new Response('Unauthorized', { status: 401 })

        const result = await markAsRead(params.id)
        if (!result) return new Response('Not found', { status: 404 })
        return Response.json(result)
      },
    },
  },
})
