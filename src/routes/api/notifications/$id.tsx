import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { deleteNotification } from '@/services/notification.service'

export const Route = createFileRoute('/api/notifications/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }: { request: Request; params: { id: string } }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return new Response('Unauthorized', { status: 401 })

        const deleted = await deleteNotification(params.id)
        if (!deleted) return new Response('Not found', { status: 404 })
        return Response.json({ deleted: true })
      },
    },
  },
})
