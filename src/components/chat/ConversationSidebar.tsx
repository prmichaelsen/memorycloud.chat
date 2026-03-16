/**
 * ConversationSidebar — desktop-only sidebar wrapper for ConversationList.
 * On mobile, ConversationList renders inline in the chat index route instead.
 */

import { useTheme } from '@/lib/theming'
import { ConversationList } from '@/components/chat/ConversationList'
import type { Conversation } from '@/types/conversations'
import type { ProfileSummary } from '@/lib/profile-map'

interface ConversationSidebarProps {
  onNewDm: () => void
  onNewGroup: () => void
  initialConversations?: Conversation[]
  initialProfiles?: Record<string, ProfileSummary>
}

export function ConversationSidebar({ onNewDm, onNewGroup, initialConversations, initialProfiles }: ConversationSidebarProps) {
  const t = useTheme()

  return (
    <aside
      className={`
        hidden lg:block
        relative z-auto w-80 shrink-0
        ${t.sidebar}
      `}
    >
      <ConversationList
        onNewDm={onNewDm}
        onNewGroup={onNewGroup}
        initialConversations={initialConversations}
        initialProfiles={initialProfiles}
      />
    </aside>
  )
}
