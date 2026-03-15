/**
 * Conversation route — renders the active conversation with messages,
 * compose input, real-time updates via WebSocket, and group member panel.
 *
 * Uses beforeLoad for SSR preload of conversation + initial messages.
 * Implements optimistic UI: messages appear instantly in a "pending" state,
 * then transition to confirmed once the server responds.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/lib/theming'
import { useAuth } from '@/components/auth/AuthContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { MessageList } from '@/components/chat/MessageList'
import { MessageCompose } from '@/components/chat/MessageCompose'
import { MemberList } from '@/components/chat/MemberList'
import { getConversation, updateLastMessage } from '@/services/conversation.service'
import { listMessages, sendMessage, markConversationRead } from '@/services/message.service'
import { checkPermission } from '@/services/group.service'
import type { Conversation, Message, MessageAttachment } from '@/types/conversations'
import type { WebSocketMessage, NewMessageEvent, TypingEvent } from '@/types/websocket'
import { Users, ChevronLeft, Wifi, WifiOff } from 'lucide-react'

export const Route = createFileRoute('/chat/$conversationId')({
  beforeLoad: async ({ params }) => {
    const { conversationId } = params

    // SSR preload: fetch conversation metadata and initial messages in parallel
    const [conversation, messageResult] = await Promise.all([
      getConversation(conversationId),
      listMessages({ conversation_id: conversationId, limit: 50 }),
    ])

    return {
      preloadedConversation: conversation,
      // Messages come newest-first from service, reverse for chronological display
      preloadedMessages: messageResult.messages.reverse(),
      preloadedHasMore: messageResult.has_more,
    }
  },
  component: ConversationView,
})

function ConversationView() {
  const t = useTheme()
  const { user } = useAuth()
  const { conversationId } = Route.useParams()
  const {
    preloadedConversation,
    preloadedMessages,
    preloadedHasMore,
  } = Route.useRouteContext()

  // State — initialize from preloaded data
  const [conversation, setConversation] = useState<Conversation | null>(
    preloadedConversation ?? null
  )
  const [messages, setMessages] = useState<Message[]>(preloadedMessages ?? [])
  const [loading, setLoading] = useState(!preloadedConversation)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(preloadedHasMore ?? false)
  const [showMembers, setShowMembers] = useState(false)
  const [typingUsers, setTypingUsers] = useState<
    Array<{ user_id: string; user_name: string }>
  >([])
  const [currentUserPermissions, setCurrentUserPermissions] = useState<{
    can_manage_members: boolean
    can_kick: boolean
  }>({ can_manage_members: false, can_kick: false })

  // Track pending (optimistic) message IDs
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<string>>(
    new Set()
  )

  // WebSocket for real-time
  const {
    status: wsStatus,
    lastMessage: wsMessage,
    send: wsSend,
  } = useWebSocket(conversationId)

  // Typing indicator debounce refs
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  // If preloaded data was missing (e.g. client-side navigation without SSR),
  // fall back to loading in an effect
  useEffect(() => {
    if (!user || !conversationId) return
    // If we already have preloaded data, just mark as read and load permissions
    if (preloadedConversation) {
      markConversationRead(conversationId, user.uid)
      if (preloadedConversation.type === 'group') {
        loadPermissions(conversationId, user.uid)
      }
      return
    }

    let cancelled = false

    async function load() {
      if (!user) return
      setLoading(true)
      setMessages([])
      setHasMore(false)

      try {
        const [conv, msgResult] = await Promise.all([
          getConversation(conversationId),
          listMessages({ conversation_id: conversationId, limit: 50 }),
        ])

        if (cancelled) return

        setConversation(conv)
        setMessages(msgResult.messages.reverse())
        setHasMore(msgResult.has_more)

        markConversationRead(conversationId, user.uid)

        if (conv?.type === 'group') {
          await loadPermissions(conversationId, user.uid)
        }
      } catch {
        // Error loading conversation
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [conversationId, user, preloadedConversation])

  async function loadPermissions(convId: string, userId: string) {
    try {
      const [canManage, canKick] = await Promise.all([
        checkPermission(convId, userId, 'can_manage_members'),
        checkPermission(convId, userId, 'can_kick'),
      ])
      setCurrentUserPermissions({
        can_manage_members: canManage,
        can_kick: canKick,
      })
    } catch {
      // Error loading permissions
    }
  }

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!wsMessage || !user) return

    switch (wsMessage.type) {
      case 'message_new': {
        const event = wsMessage as NewMessageEvent
        if (event.conversation_id !== conversationId) return

        // Build full Message from event
        const newMsg: Message = {
          id: event.message.id,
          conversation_id: event.conversation_id,
          sender_id: event.message.sender_id,
          sender_name: event.message.sender_name,
          sender_photo_url: null,
          content: event.message.content,
          created_at: event.message.created_at,
          updated_at: null,
          attachments: event.message.attachments.map((a) => ({
            ...a,
            size: 0,
            thumbnail_url: null,
          })),
          visible_to_user_ids: event.message.visible_to_user_ids,
          role: event.message.role,
          saved_memory_id: null,
        }

        // If this is a confirmation of our own optimistic message, remove pending status
        // (the optimistic message is already in the list, so just clear pending flag)
        if (pendingMessageIds.has(event.message.id)) {
          setPendingMessageIds((prev) => {
            const next = new Set(prev)
            next.delete(event.message.id)
            return next
          })
        } else {
          // Message from another user — append to list
          setMessages((prev) => [...prev, newMsg])
        }

        // Update sidebar last_message preview
        updateLastMessage(conversationId, {
          content: newMsg.content,
          sender_id: newMsg.sender_id,
          sender_name: newMsg.sender_name,
          timestamp: newMsg.created_at,
        })

        // Auto-mark as read
        markConversationRead(conversationId, user.uid)

        // Clear typing indicator for this sender
        setTypingUsers((prev) =>
          prev.filter((tu) => tu.user_id !== event.message.sender_id)
        )
        break
      }

      case 'typing_start': {
        const event = wsMessage as TypingEvent
        if (event.conversation_id !== conversationId) return
        if (event.user_id === user.uid) return

        setTypingUsers((prev) => {
          if (prev.some((tu) => tu.user_id === event.user_id)) return prev
          return [
            ...prev,
            { user_id: event.user_id, user_name: event.user_name },
          ]
        })

        // Auto-clear typing after 3 seconds
        const existing = typingTimeoutsRef.current.get(event.user_id)
        if (existing) clearTimeout(existing)

        const timeout = setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((tu) => tu.user_id !== event.user_id)
          )
          typingTimeoutsRef.current.delete(event.user_id)
        }, 3000)

        typingTimeoutsRef.current.set(event.user_id, timeout)
        break
      }

      case 'typing_stop': {
        const event = wsMessage as TypingEvent
        if (event.conversation_id !== conversationId) return

        setTypingUsers((prev) =>
          prev.filter((tu) => tu.user_id !== event.user_id)
        )

        const timeout = typingTimeoutsRef.current.get(event.user_id)
        if (timeout) {
          clearTimeout(timeout)
          typingTimeoutsRef.current.delete(event.user_id)
        }
        break
      }
    }
  }, [wsMessage, conversationId, user, pendingMessageIds])

  // Cleanup typing timeouts
  useEffect(() => {
    return () => {
      for (const timeout of typingTimeoutsRef.current.values()) {
        clearTimeout(timeout)
      }
      typingTimeoutsRef.current.clear()
    }
  }, [conversationId])

  // Load older messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return

    setLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      const result = await listMessages({
        conversation_id: conversationId,
        limit: 50,
        before_cursor: oldestMessage.id,
      })

      setMessages((prev) => [...result.messages.reverse(), ...prev])
      setHasMore(result.has_more)
    } catch {
      // Error loading more messages
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, loadingMore, hasMore, messages])

  // Send message handler with optimistic UI
  async function handleSend(content: string, attachments: MessageAttachment[]) {
    if (!user) return

    // Create an optimistic message shown immediately
    const optimisticId = crypto.randomUUID()
    const now = new Date().toISOString()
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.uid,
      sender_name: user.displayName ?? 'Unknown',
      sender_photo_url: user.photoURL ?? null,
      content,
      created_at: now,
      updated_at: null,
      attachments: attachments.length > 0 ? attachments : [],
      visible_to_user_ids: null,
      role: 'user',
      saved_memory_id: null,
    }

    // Show optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage])
    setPendingMessageIds((prev) => new Set(prev).add(optimisticId))

    try {
      const message = await sendMessage({
        conversation_id: conversationId,
        sender_id: user.uid,
        sender_name: user.displayName ?? 'Unknown',
        sender_photo_url: user.photoURL,
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      // Replace optimistic message with server-confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? message : m))
      )
      setPendingMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(optimisticId)
        return next
      })

      // Broadcast via WebSocket
      const wsMsg: NewMessageEvent = {
        type: 'message_new',
        conversation_id: conversationId,
        message: {
          id: message.id,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          content: message.content,
          created_at: message.created_at,
          attachments: message.attachments.map((a) => ({
            id: a.id,
            name: a.name,
            url: a.url,
            type: a.type,
          })),
          visible_to_user_ids: message.visible_to_user_ids,
          role: message.role,
        },
      }
      wsSend(wsMsg)

      // Update conversation preview
      updateLastMessage(conversationId, {
        content: message.content,
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        timestamp: message.created_at,
      })
    } catch {
      // On failure, mark the optimistic message as failed by removing pending
      // and keeping it in the list (in production, add retry/remove UI)
      setPendingMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(optimisticId)
        return next
      })
    }
  }

  // Typing indicator handlers
  function handleTypingStart() {
    if (!user) return
    wsSend({
      type: 'typing_start',
      conversation_id: conversationId,
      user_id: user.uid,
      user_name: user.displayName ?? 'Unknown',
    })
  }

  function handleTypingStop() {
    if (!user) return
    wsSend({
      type: 'typing_stop',
      conversation_id: conversationId,
      user_id: user.uid,
      user_name: user.displayName ?? 'Unknown',
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${t.page}`}>
        <div className={`text-sm ${t.textMuted}`}>Loading conversation...</div>
      </div>
    )
  }

  // Conversation not found
  if (!conversation) {
    return (
      <div className={`flex-1 flex items-center justify-center ${t.page}`}>
        <div className="text-center">
          <p className={`text-lg font-medium ${t.textPrimary}`}>
            Conversation not found
          </p>
          <p className={`text-sm mt-1 ${t.textMuted}`}>
            This conversation may have been deleted or you don't have access.
          </p>
        </div>
      </div>
    )
  }

  const conversationName =
    conversation.name ??
    conversation.participant_ids
      .filter((id) => id !== user?.uid)
      .join(', ') ??
    'Conversation'

  const isGroup = conversation.type === 'group'

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Main conversation panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3 shrink-0 ${t.border} border-t-0 border-l-0 border-r-0`}
        >
          {/* Back button (mobile) */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className={`p-1.5 rounded-lg lg:hidden ${t.buttonGhost}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Conversation info */}
          <div className="flex-1 min-w-0">
            <h1 className={`text-sm font-semibold truncate ${t.textPrimary}`}>
              {conversationName}
            </h1>
            {isGroup && conversation.description && (
              <p className={`text-xs truncate ${t.textMuted}`}>
                {conversation.description}
              </p>
            )}
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <Wifi
                className={`w-4 h-4 ${t.statusOnline}`}
                style={{ color: 'currentColor' }}
              />
            ) : (
              <WifiOff className={`w-4 h-4 ${t.textMuted}`} />
            )}

            {/* Group members toggle */}
            {isGroup && (
              <button
                type="button"
                onClick={() => setShowMembers(!showMembers)}
                className={`p-1.5 rounded-lg ${showMembers ? t.active : t.buttonGhost}`}
              >
                <Users className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          pendingMessageIds={pendingMessageIds}
          loading={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          typingUsers={typingUsers}
        />

        {/* Compose */}
        <MessageCompose
          conversationId={conversationId}
          senderId={user?.uid ?? ''}
          senderName={user?.displayName ?? 'Unknown'}
          senderPhotoUrl={user?.photoURL ?? null}
          onSend={handleSend}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </div>

      {/* Members panel (groups only) */}
      {isGroup && showMembers && (
        <aside
          className={`w-64 shrink-0 overflow-y-auto ${t.sidebar} hidden lg:block`}
        >
          <MemberList
            conversationId={conversationId}
            currentUserPermissions={currentUserPermissions}
          />
        </aside>
      )}
    </div>
  )
}
