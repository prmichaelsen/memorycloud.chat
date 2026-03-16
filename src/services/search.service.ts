/**
 * SearchService — Algolia-backed search for DM partners, groups, and messages.
 * Adapted from goodneighbor-core SearchService for remember-enterprise.
 */

import {
  getAlgoliaAdminClient,
  getAlgoliaSearchClient,
  ALGOLIA_INDEX_NAME,
} from '@/lib/algolia'
import { AlgoliaFilters } from '@/lib/algolia-filters'
import { ALGOLIA_INDEX_SETTINGS } from '@/lib/algolia-index-settings'

// --- Types ---

export type SearchEntityType = 'dm_partner' | 'group' | 'message'

export interface SearchParams {
  query: string
  types?: SearchEntityType[]
  page?: number
  hitsPerPage?: number
  filters?: string
}

export interface SearchHit {
  objectID: string
  type: SearchEntityType
  name: string
  search: string
  content?: string
  conversation_id?: string
  participant_ids?: string[]
  photo_url?: string
  email?: string
  description?: string
  sender_name?: string
  created_at?: string
  updated_at?: string
  _highlightResult?: Record<string, { value: string; matchLevel: string }>
}

export interface SearchResponse {
  hits: SearchHit[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  processingTimeMS: number
  query: string
}

// --- Search ---

export async function search(
  params: SearchParams,
  userId: string,
): Promise<SearchResponse> {
  const client = getAlgoliaSearchClient()

  const filterBuilder = params.filters
    ? AlgoliaFilters.fromString(params.filters)
    : AlgoliaFilters.create()

  // Scope to user's conversations/DMs
  filterBuilder.addParticipant(userId)

  // Type filter
  if (params.types && params.types.length > 0) {
    filterBuilder.addOrGroup(params.types.map((t) => `type:${t}`))
  }

  const response = (await client.searchSingleIndex({
    indexName: ALGOLIA_INDEX_NAME,
    searchParams: {
      query: params.query,
      filters: filterBuilder.getFilter(),
      page: params.page ?? 0,
      hitsPerPage: params.hitsPerPage ?? 15,
    },
  })) as Record<string, unknown>

  return {
    hits: (response.hits as SearchHit[]) || [],
    nbHits: (response.nbHits as number) || 0,
    page: (response.page as number) || 0,
    nbPages: (response.nbPages as number) || 0,
    hitsPerPage: (response.hitsPerPage as number) || 15,
    processingTimeMS: (response.processingTimeMS as number) || 0,
    query: (response.query as string) || '',
  }
}

// --- Indexing ---

export async function indexDocument(
  doc: Record<string, unknown> & { objectID: string },
): Promise<void> {
  const client = getAlgoliaAdminClient()
  await client.saveObject({
    indexName: ALGOLIA_INDEX_NAME,
    body: doc,
  })
}

export async function indexDocuments(
  docs: Array<Record<string, unknown> & { objectID: string }>,
): Promise<void> {
  if (docs.length === 0) return
  const client = getAlgoliaAdminClient()
  await client.saveObjects({
    indexName: ALGOLIA_INDEX_NAME,
    objects: docs,
  })
}

export async function deleteDocument(objectID: string): Promise<void> {
  const client = getAlgoliaAdminClient()
  await client.deleteObject({
    indexName: ALGOLIA_INDEX_NAME,
    objectID,
  })
}

export async function updateDocument(
  objectID: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const client = getAlgoliaAdminClient()
  await client.partialUpdateObject({
    indexName: ALGOLIA_INDEX_NAME,
    objectID,
    attributesToUpdate: updates,
  })
}

export async function initializeIndex(): Promise<void> {
  const client = getAlgoliaAdminClient()
  await client.setSettings({
    indexName: ALGOLIA_INDEX_NAME,
    indexSettings: { ...ALGOLIA_INDEX_SETTINGS } as Record<string, unknown>,
  })
}

// --- Data Sync Helpers ---

/**
 * Build an Algolia document for a DM partner (user in a DM conversation).
 */
export function buildDmPartnerDoc(user: {
  uid: string
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
  conversationId: string
  participantIds: string[]
}) {
  return {
    objectID: `dm_partner_${user.uid}_${user.conversationId}`,
    type: 'dm_partner' as const,
    name: user.displayName || user.email || user.uid,
    search: [user.displayName, user.email].filter(Boolean).join(' '),
    email: user.email ?? undefined,
    photo_url: user.photoURL ?? undefined,
    conversation_id: user.conversationId,
    participant_ids: user.participantIds,
    updated_at: new Date().toISOString(),
    updated_at_ts: Math.floor(Date.now() / 1000),
  }
}

/**
 * Build an Algolia document for a group conversation.
 */
export function buildGroupDoc(group: {
  id: string
  name?: string | null
  description?: string | null
  participantIds: string[]
  createdAt?: string
  updatedAt?: string
}) {
  return {
    objectID: `group_${group.id}`,
    type: 'group' as const,
    name: group.name || 'Unnamed Group',
    search: [group.name, group.description].filter(Boolean).join(' '),
    description: group.description ?? undefined,
    conversation_id: group.id,
    participant_ids: group.participantIds,
    created_at: group.createdAt,
    updated_at: group.updatedAt ?? new Date().toISOString(),
    updated_at_ts: Math.floor(
      new Date(group.updatedAt ?? Date.now()).getTime() / 1000,
    ),
  }
}

/**
 * Build an Algolia document for a message.
 */
export function buildMessageDoc(message: {
  id: string
  conversationId: string
  content: string
  senderName?: string
  participantIds: string[]
  createdAt?: string
}) {
  return {
    objectID: `msg_${message.id}`,
    type: 'message' as const,
    name: message.senderName ?? 'Unknown',
    search: message.content,
    content: message.content,
    sender_name: message.senderName,
    conversation_id: message.conversationId,
    participant_ids: message.participantIds,
    created_at: message.createdAt,
    updated_at: message.createdAt ?? new Date().toISOString(),
    updated_at_ts: Math.floor(
      new Date(message.createdAt ?? Date.now()).getTime() / 1000,
    ),
  }
}
