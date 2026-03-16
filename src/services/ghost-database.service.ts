/**
 * GhostDatabaseService — server-side Firestore CRUD for ghost persona conversations.
 * Collection path: users/{userId}/conversations/ghost:{ghostId}
 *
 * Ghost conversations are stored in the shared conversations collection with
 * deterministic IDs (`ghost:{ghostId}`) to align with agentbase.me.
 *
 * Integrates with remember-core SvcClient for memory-augmented ghost responses.
 */

import {
  getDocument,
  setDocument,
  queryDocuments,
} from '@prmichaelsen/firebase-admin-sdk-v8'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getRememberSvcClient } from '@/lib/remember-sdk'
import type {
  GhostPersona,
  GhostConversation,
  GhostMessage,
} from '@/services/ghost.service'

const GHOSTS_COLLECTION = 'agentbase.ghosts'

function conversationsCollection(userId: string): string {
  return `agentbase.users/${userId}/conversations`
}

function messagesCollection(userId: string, conversationId: string): string {
  return `agentbase.users/${userId}/conversations/${conversationId}/messages`
}

function getGhostConversationId(ghostId: string): string {
  return `ghost:${ghostId}`
}

export class GhostDatabaseService {
  /**
   * List available ghost personas for a user.
   */
  static async listGhosts(userId: string): Promise<GhostPersona[]> {
    initFirebaseAdmin()

    try {
      const docs = await queryDocuments(GHOSTS_COLLECTION, {
        limit: 100,
      })

      return docs.map((doc) => ({
        ...(doc.data as unknown as GhostPersona),
        id: doc.id,
      }))
    } catch (error) {
      console.error('[GhostDatabaseService] listGhosts failed:', error)
      return []
    }
  }

  /**
   * Get or create a conversation with a specific ghost.
   * If a conversation already exists for this user + ghost, returns it.
   */
  static async getOrCreateConversation(
    userId: string,
    ghostId: string,
  ): Promise<GhostConversation> {
    initFirebaseAdmin()
    const collection = conversationsCollection(userId)
    const conversationId = getGhostConversationId(ghostId)

    // Direct lookup by deterministic ID
    try {
      const existing = await getDocument(collection, conversationId)
      if (existing) {
        return {
          ...(existing as unknown as GhostConversation),
          id: conversationId,
        }
      }
    } catch (error) {
      console.error('[GhostDatabaseService] get existing conversation failed:', error)
    }

    // Create new conversation
    const now = new Date().toISOString()

    // Fetch ghost name
    let ghostName = 'Ghost'
    try {
      const ghostDoc = await getDocument(GHOSTS_COLLECTION, ghostId)
      if (ghostDoc) {
        ghostName = (ghostDoc as unknown as GhostPersona).name ?? 'Ghost'
      }
    } catch {
      // Use default name
    }

    const conversationData = {
      type: 'ghost' as const,
      ghost_owner_id: ghostId,
      ghostId,
      ghostName,
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }

    await setDocument(collection, conversationId, conversationData)
    return { id: conversationId, ...conversationData }
  }

  /**
   * Send a message in a ghost conversation.
   * Persists the message, then queries relevant memories via SvcClient for context.
   * Returns the stored message along with memory context for the ghost to reference.
   */
  static async sendMessage(
    userId: string,
    conversationId: string,
    message: { role: 'user' | 'assistant'; content: string },
  ): Promise<{ message: GhostMessage; memoryContext: unknown[] }> {
    initFirebaseAdmin()
    const collection = messagesCollection(userId, conversationId)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const ghostMessage: GhostMessage = {
      id,
      role: message.role,
      content: message.content,
      createdAt: now,
    }

    await setDocument(collection, id, ghostMessage)

    // Update conversation's updatedAt timestamp
    const convCollection = conversationsCollection(userId)
    await setDocument(
      convCollection,
      conversationId,
      { updatedAt: now },
      { merge: true },
    )

    // Query relevant memories for context when the message is from the user
    let memoryContext: unknown[] = []
    if (message.role === 'user') {
      try {
        const svc = await getRememberSvcClient()
        const result = await svc.memories.search(userId, {
          query: message.content,
          limit: 5,
        })
        if (result.ok && result.data) {
          memoryContext = Array.isArray(result.data)
            ? result.data
            : (result.data as any).memories ?? []
        }
      } catch (error) {
        console.warn('[GhostDatabaseService] memory search failed, proceeding without context:', error)
      }
    }

    return { message: ghostMessage, memoryContext }
  }

  /**
   * List all ghost conversations for a user.
   */
  static async listConversations(userId: string): Promise<GhostConversation[]> {
    initFirebaseAdmin()
    const collection = conversationsCollection(userId)

    try {
      const docs = await queryDocuments(collection, {
        where: [{ field: 'type', op: '==', value: 'ghost' }],
        orderBy: [{ field: 'updatedAt', direction: 'DESCENDING' }],
        limit: 100,
      })

      return docs.map((doc) => ({
        ...(doc.data as unknown as GhostConversation),
        id: doc.id,
      }))
    } catch (error) {
      console.error('[GhostDatabaseService] listConversations failed:', error)
      return []
    }
  }
}
