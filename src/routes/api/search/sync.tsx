/**
 * POST /api/search/sync — Sync current user's conversations, DM partners, and recent messages to Algolia.
 * Called on-demand (e.g., on first Cmd+K open or via admin trigger).
 */

import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { ConversationDatabaseService } from '@/services/conversation-database.service'
import { queryDocuments } from '@prmichaelsen/firebase-admin-sdk-v8'
import {
  indexDocuments,
  initializeIndex,
  buildDmPartnerDoc,
  buildGroupDoc,
  buildMessageDoc,
} from '@/services/search.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/search/sync')

export const Route = createFileRoute('/api/search/sync')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.uid

        try {
          // Ensure index exists with correct settings
          await initializeIndex()
          // Fetch user's DMs and groups in parallel
          const [dms, groups] = await Promise.all([
            ConversationDatabaseService.getUserDMs(userId, 100),
            ConversationDatabaseService.getUserGroups(userId, 100),
          ])

          const docs: Array<Record<string, unknown> & { objectID: string }> = []

          // Index DM partners — for each DM, index the other participant
          for (const dm of dms) {
            const otherIds = dm.participant_ids.filter((id) => id !== userId)
            for (const otherId of otherIds) {
              // Look up user display info
              let displayName: string | null = null
              let email: string | null = null
              let photoURL: string | null = null
              try {
                const userDocs = await queryDocuments('agentbase.users', {
                  where: [{ field: '__name__', op: '==', value: otherId }],
                  limit: 1,
                })
                if (userDocs.length > 0) {
                  const data = userDocs[0].data as Record<string, unknown>
                  displayName = (data.displayName as string) ?? null
                  email = (data.email as string) ?? null
                  photoURL = (data.photoURL as string) ?? null
                }
              } catch {
                // Skip if user lookup fails
              }

              docs.push(
                buildDmPartnerDoc({
                  uid: otherId,
                  displayName,
                  email,
                  photoURL,
                  conversationId: dm.id,
                  participantIds: dm.participant_ids,
                }),
              )
            }
          }

          // Index groups
          for (const group of groups) {
            docs.push(
              buildGroupDoc({
                id: group.id,
                name: group.name,
                description: group.description,
                participantIds: group.participant_ids,
                createdAt: group.created_at,
                updatedAt: group.updated_at,
              }),
            )
          }

          // Index recent messages from all conversations
          const allConversations = [...dms, ...groups]
          const messagePromises = allConversations.slice(0, 50).map(async (conv) => {
            try {
              const messages = await ConversationDatabaseService.getMessages(conv.id, {
                shared: true,
                limit: 20,
              })
              return messages
                .filter((msg: any) => msg.content && typeof msg.content === 'string')
                .map((msg: any) =>
                  buildMessageDoc({
                    id: msg.id ?? msg._id,
                    conversationId: conv.id,
                    content: msg.content,
                    senderName: msg.sender_name ?? msg.senderName,
                    participantIds: conv.participant_ids,
                    createdAt: msg.created_at ?? msg.timestamp,
                  }),
                )
            } catch {
              return []
            }
          })

          const messageResults = await Promise.all(messagePromises)
          for (const batch of messageResults) {
            docs.push(...batch)
          }

          // Batch index to Algolia
          if (docs.length > 0) {
            await indexDocuments(docs)
          }

          return Response.json({
            synced: docs.length,
            dm_partners: dms.length,
            groups: groups.length,
            messages: docs.filter((d) => d.type === 'message').length,
          })
        } catch (error) {
          log.error({ err: error }, 'Search sync error')
          return Response.json(
            { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
