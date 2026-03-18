import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { MessageDatabaseService } from '@/services/message-database.service'
import { ConversationDatabaseService } from '@/services/conversation-database.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/conversations/threads')

export const Route = createFileRoute(
  '/api/conversations/$conversationId/threads/$parentMessageId' as any,
)({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { conversationId: string; parentMessageId: string }
      }) => {
        initFirebaseAdmin()
        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const url = new URL(request.url)
          const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
          const cursor = url.searchParams.get('cursor') ?? undefined

          // Resolve conversation type for dual-collection routing
          const conv = await ConversationDatabaseService.getConversation(params.conversationId, session.uid)
          const convType = conv?.type === 'dm' || conv?.type === 'group' ? conv.type : undefined

          const result = await MessageDatabaseService.listThreadReplies(
            params.conversationId,
            params.parentMessageId,
            limit,
            cursor,
            session.uid,
            convType,
          )

          return Response.json(result)
        } catch (error) {
          log.error({ err: error }, 'Thread replies list error')
          return Response.json(
            {
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
