/**
 * Conversation route — renders the active conversation with messages,
 * compose input, real-time updates via WebSocket, and group member panel.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useTheme } from '@/lib/theming'
import { useAuth } from '@/components/auth/AuthContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { MessageList } from '@/components/chat/MessageList'
import { MessageCompose } from '@/components/chat/MessageCompose'
import { MemberManagement } from '@/components/chat/MemberManagement'
import { SlideOverPanel } from '@/components/ui/SlideOverPanel'
import { SubHeaderTabs, type SubHeaderTab } from '@/components/SubHeaderTabs'
import { GhostChatView } from '@/components/ghost/GhostChatView'
import { getConversation, updateLastMessage } from '@/services/conversation.service'
import type { ProfileSummary } from '@/lib/profile-map'
import { listMessages, sendMessage, markConversationRead } from '@/services/message.service'
import { checkPermission } from '@/services/group.service'
import type { Conversation, Message, GroupAuthLevel, GroupPermissions } from '@/types/conversations'
import { MEMBER_PRESET } from '@/types/conversations'
import type {
  TypingEvent,
  ServerMessageEvent,
  ServerChunkEvent,
  ServerMessagesLoadedEvent,
} from '@/types/websocket'
import type { StreamingBlock } from '@/types/streaming'
import {
  appendTextChunk,
  insertToolUseBlock,
  completeToolUseBlock,
} from '@/types/streaming'
import { Users, ChevronLeft, Wifi, WifiOff, Ghost } from 'lucide-react'
import { ConversationHeaderMenu } from '@/components/chat/ConversationHeaderMenu'
import { AddParticipantModal } from '@/components/chat/AddParticipantModal'
import { getAuthSession } from '@/lib/auth/server-fn'
import { ConversationDatabaseService } from '@/services/conversation-database.service'
import { buildProfileMap } from '@/lib/profile-map'
import { MessageDatabaseService } from '@/services/message-database.service'
import { getTextContent } from '@/lib/message-content'

const CONVERSATION_TABS: SubHeaderTab[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'ghost', label: 'Ghost', variant: 'ghost', icon: <Ghost className="w-4 h-4" /> },
]

export const Route = createFileRoute('/chat/$conversationId')({
  component: ConversationView,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: search.tab as string | undefined,
  }),
  beforeLoad: async ({ params }) => {
    if (typeof window !== 'undefined') return { initialConversation: null, initialMessages: [], initialProfiles: {} }
    try {
      const user = await getAuthSession()
      if (!user) return { initialConversation: null, initialMessages: [], initialProfiles: {} }
      const conversation = await ConversationDatabaseService.getConversation(params.conversationId, user.uid)
      const convType = conversation?.type === 'dm' || conversation?.type === 'group' ? conversation.type : undefined
      const msgResult = await MessageDatabaseService.listMessages(params.conversationId, 50, undefined, user.uid, convType)
      const profiles = conversation
        ? await buildProfileMap(conversation.participant_user_ids ?? [])
        : {}
      return {
        initialConversation: conversation,
        initialMessages: msgResult.messages ?? [],
        initialProfiles: profiles,
      }
    } catch {
      return { initialConversation: null, initialMessages: [], initialProfiles: {} }
    }
  },
})

function ConversationView() {
  const t = useTheme()
  const { user } = useAuth()
  const { conversationId } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = useNavigate()

  const activeTab = tab || 'chat'

  function handleTabChange(newTab: string) {
    navigate({
      to: '/chat/$conversationId',
      params: { conversationId },
      search: { tab: newTab },
      replace: true,
    })
  }

  // State
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [typingUsers, setTypingUsers] = useState<
    Array<{ user_id: string; user_name: string }>
  >([])
  const [currentUserPermissions, setCurrentUserPermissions] = useState<GroupPermissions>({ ...MEMBER_PRESET })
  const [currentUserAuthLevel, setCurrentUserAuthLevel] = useState<GroupAuthLevel>(5)
  const [showAddParticipant, setShowAddParticipant] = useState(false)

  // Streaming blocks state for real-time agent generation
  const [streamingBlocks, setStreamingBlocks] = useState<StreamingBlock[]>([])
  const streamingMessageIdRef = useRef<string | null>(null)

  // WebSocket for real-time
  const { status: wsStatus, lastMessage: wsMessage, send: wsSend } = useWebSocket(conversationId)

  // Typing indicator debounce refs
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load conversation and initial messages
  useEffect(() => {
    if (!user || !conversationId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setMessages([])
      setHasMore(false)
      setStreamingBlocks([])
      streamingMessageIdRef.current = null

      try {
        const [envelope, msgResult] = await Promise.all([
          getConversation(conversationId),
          listMessages({ conversation_id: conversationId, limit: 50 }),
        ])

        if (cancelled) return

        setConversation(envelope?.conversation ?? null)
        setProfiles(envelope?.profiles ?? {})
        // Messages come newest-first from service, reverse for display
        setMessages(msgResult.messages.reverse())
        setHasMore(msgResult.has_more)

        // Mark as read
        markConversationRead(conversationId)

        // Load permissions for group conversations
        if (envelope?.conversation?.type === 'group') {
          const [canManage, canKick, canBan, canModerate] = await Promise.all([
            checkPermission(conversationId, user!.uid, 'can_manage_members'),
            checkPermission(conversationId, user!.uid, 'can_kick'),
            checkPermission(conversationId, user!.uid, 'can_ban'),
            checkPermission(conversationId, user!.uid, 'can_moderate'),
          ])
          if (!cancelled) {
            setCurrentUserPermissions({
              can_read: true,
              can_publish: true,
              can_manage_members: canManage,
              can_kick: canKick,
              can_ban: canBan,
              can_moderate: canModerate,
            })
            // Determine auth level from permissions
            if (canBan) setCurrentUserAuthLevel(0)
            else if (canKick) setCurrentUserAuthLevel(1)
            else if (canModerate) setCurrentUserAuthLevel(3)
            else setCurrentUserAuthLevel(5)
          }
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
  }, [conversationId, user])

  // Send init message when WebSocket connects to load messages via ChatRoom DO
  useEffect(() => {
    if (wsStatus === 'connected' && user) {
      wsSend({
        type: 'init',
        userId: user.uid,
        conversationId,
      } as any)
    }
  }, [wsStatus, user, conversationId])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!wsMessage || !user) return

    switch (wsMessage.type) {
      case 'messages_loaded': {
        const event = wsMessage as ServerMessagesLoadedEvent
        setMessages(event.messages)
        setHasMore(event.hasMore)
        setLoading(false)
        break
      }

      case 'message': {
        const event = wsMessage as ServerMessageEvent
        const msg = event.message

        // Parse JSON string content back to array (agentbase.me compat)
        if (msg.content && typeof msg.content === 'string' &&
            (msg.content.startsWith('[') || msg.content.startsWith('{'))) {
          try {
            msg.content = JSON.parse(msg.content)
          } catch {
            // Not valid JSON, keep as string
          }
        }

        // Deduplicate and add to messages
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })

        // Clear streaming blocks when a saved message arrives
        setStreamingBlocks([])

        // Update sidebar last_message preview
        updateLastMessage(conversationId, {
          content: getTextContent(msg.content),
          sender_user_id: msg.sender_user_id ?? '',
          timestamp: msg.timestamp,
        })

        // Auto-mark as read
        markConversationRead(conversationId)

        // Clear typing indicator for sender
        if (msg.sender_user_id) {
          setTypingUsers((prev) =>
            prev.filter((tu) => tu.user_id !== msg.sender_user_id)
          )
        }
        break
      }

      case 'chunk': {
        const event = wsMessage as ServerChunkEvent
        setStreamingBlocks((prev) => appendTextChunk(prev, event.content))
        break
      }

      case 'tool_call': {
        const event = wsMessage as any
        if (event.toolCall) {
          setStreamingBlocks((prev) =>
            insertToolUseBlock(prev, event.toolCall.id, event.toolCall.name)
          )
        }
        break
      }

      case 'tool_result': {
        const event = wsMessage as any
        if (event.toolResult) {
          setStreamingBlocks((prev) =>
            completeToolUseBlock(prev, event.toolResult.id, 'complete', JSON.stringify(event.toolResult.output))
          )
        }
        break
      }

      case 'complete': {
        setStreamingBlocks([])
        streamingMessageIdRef.current = null
        break
      }

      case 'cancelled': {
        setStreamingBlocks([])
        streamingMessageIdRef.current = null
        break
      }

      case 'error': {
        const event = wsMessage as any
        console.error('[WebSocket] Error:', event.error)
        setStreamingBlocks([])
        streamingMessageIdRef.current = null
        break
      }

      case 'debug': {
        const event = wsMessage as any
        console.log('[ChatRoom]', event.debug?.step, event.debug?.data ?? '')
        break
      }

      case 'typing_start': {
        const event = wsMessage as TypingEvent
        if (event.conversation_id !== conversationId) return
        if (event.user_id === user.uid) return

        setTypingUsers((prev) => {
          if (prev.some((tu) => tu.user_id === event.user_id)) return prev
          return [...prev, { user_id: event.user_id, user_name: event.user_name }]
        })

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
  }, [wsMessage, conversationId, user])

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

  // Send message handler — sends via WebSocket to ChatRoom DO
  function handleSend(content: string) {
    if (!user) return
    wsSend({
      type: 'message',
      userId: user.uid,
      conversationId,
      message: content,
    } as any)
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
    (conversation.title && conversation.title !== 'Untitled' && conversation.title !== 'Untitled Conversation' ? conversation.title : null) ??
    ((conversation.participant_user_ids ?? [])
      .filter((id) => id !== user?.uid)
      .map((id) => profiles[id]?.display_name ?? id)
      .join(', ') || 'Conversation')

  const isGroup = conversation.type === 'group'

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Main conversation panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <Wifi className={`w-4 h-4 ${t.statusOnline}`} style={{ color: 'currentColor' }} />
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

            {/* Group header menu */}
            <ConversationHeaderMenu
              conversationId={conversationId}
              isGroup={isGroup}
              canManageMembers={currentUserPermissions.can_manage_members}
              onAddParticipant={() => setShowAddParticipant(true)}
              onManageMembers={() => setShowMembers(true)}
              onShareLink={() => setShowAddParticipant(true)}
            />
          </div>
        </div>

        {/* Sub-header tabs */}
        <SubHeaderTabs
          tabs={CONVERSATION_TABS}
          activeId={activeTab}
          onSelect={handleTabChange}
        />

        {activeTab === 'ghost' ? (
          /* Ghost chat view */
          <div className="flex-1 min-h-0">
            <GhostChatView
              ghostOwnerId={
                conversation?.type === 'group'
                  ? `group:${conversationId}`
                  : (conversation?.participant_user_ids ?? []).find((id) => id !== user?.uid) ?? conversationId
              }
            />
          </div>
        ) : (
          <>
            {/* Messages */}
            <MessageList
              messages={messages}
              conversationId={conversationId}
              loading={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              typingUsers={typingUsers}
              streamingBlocks={streamingBlocks}
            />

            {/* Compose */}
            <MessageCompose
              conversationId={conversationId}
              senderId={user?.uid ?? ''}
              onSend={handleSend}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
            />
          </>
        )}
      </div>

      {/* Members slide-over panel (groups only) */}
      {isGroup && (
        <SlideOverPanel open={showMembers} onClose={() => setShowMembers(false)}>
          <MemberManagement
            conversationId={conversationId}
            currentUserPermissions={currentUserPermissions}
            currentUserAuthLevel={currentUserAuthLevel}
            onAddParticipant={() => setShowAddParticipant(true)}
            onClose={() => setShowMembers(false)}
          />
        </SlideOverPanel>
      )}

      {/* Add participant modal */}
      <AddParticipantModal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        conversationId={conversationId}
      />
    </div>
  )
}
