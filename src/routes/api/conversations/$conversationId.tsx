import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { ConversationDatabaseService } from '@/services/conversation-database.service'
import { buildProfileMap } from '@/lib/profile-map'

export const Route = createFileRoute('/api/conversations/$conversationId')({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { conversationId: string } }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const conversation = await ConversationDatabaseService.getConversation(
          params.conversationId,
          session.uid,
        )
        if (!conversation) return Response.json({ error: 'Not found' }, { status: 404 })
        const profiles = await buildProfileMap(conversation.participant_user_ids ?? [])
        return Response.json({ conversation, profiles })
      },
      DELETE: async ({ request, params }: { request: Request; params: { conversationId: string } }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        try {
          await ConversationDatabaseService.deleteConversation(params.conversationId)
          return Response.json({ success: true })
        } catch {
          return Response.json({ error: 'Failed to delete' }, { status: 500 })
        }
      },
    },
  },
})
