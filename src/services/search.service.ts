/**
 * SearchService — read-only multi-index search against agentbase.me Algolia indices.
 */

import {
  getAlgoliaClient,
  MESSAGES_INDEX,
  USERS_INDEX,
  CONVERSATIONS_INDEX,
} from '@/lib/algolia'
import { ConversationDatabaseService } from '@/services/conversation-database.service'

// --- Types ---

export type SearchCategory = 'people' | 'conversations' | 'messages'

export interface UserHit {
  objectID: string
  display_name?: string
  username?: string
  profile_picture_path?: string
  is_discoverable?: boolean
}

export interface ConversationHit {
  objectID: string
  title?: string
  last_message_preview?: string
  owner_id?: string
  type?: string
  is_archived?: boolean
  updated_at?: string
}

export interface MessageHit {
  objectID: string
  content?: string
  conversation_id?: string
  conversation_title?: string
  sender_display_name?: string
  role?: string
  timestamp?: string
}

export interface MultiSearchResponse {
  people: UserHit[]
  conversations: ConversationHit[]
  messages: MessageHit[]
  processingTimeMS: number
  query: string
}

// --- Search ---

export async function search(
  query: string,
  userId: string,
  hitsPerPage = 5,
): Promise<MultiSearchResponse> {
  const client = getAlgoliaClient()

  // Build searchable_by OR filter: user:userId OR group:groupId1 OR group:groupId2 ...
  const groups = await ConversationDatabaseService.getUserGroups(userId)
  const searchableByParts = [`searchable_by:"user:${userId}"`]
  for (const g of groups) {
    searchableByParts.push(`searchable_by:"group:${g.id}"`)
  }
  const messagesFilter = searchableByParts.join(' OR ')

  const results = await client.search({
    requests: [
      {
        indexName: USERS_INDEX,
        query,
        hitsPerPage,
        filters: 'is_discoverable:true',
      },
      {
        indexName: CONVERSATIONS_INDEX,
        query,
        hitsPerPage,
        filters: `owner_id:${userId}`,
      },
      {
        indexName: MESSAGES_INDEX,
        query,
        hitsPerPage,
        filters: messagesFilter,
      },
    ],
  }) as { results: Array<{ hits: unknown[]; processingTimeMS?: number }> }

  const [usersResult, conversationsResult, messagesResult] = results.results

  return {
    people: (usersResult.hits ?? []) as UserHit[],
    conversations: (conversationsResult.hits ?? []) as ConversationHit[],
    messages: (messagesResult.hits ?? []) as MessageHit[],
    processingTimeMS: Math.max(
      usersResult.processingTimeMS ?? 0,
      conversationsResult.processingTimeMS ?? 0,
      messagesResult.processingTimeMS ?? 0,
    ),
    query,
  }
}
