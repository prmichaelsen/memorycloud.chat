/**
 * ThreadIndicator — Reply count badge shown below messages that have thread replies.
 * Clicking opens the ThreadPanel for that message.
 */

import { MessageSquareReply } from 'lucide-react'
import type { ThreadMetadata } from '@/types/threads'

interface ThreadIndicatorProps {
  metadata: ThreadMetadata
  onClick: () => void
}

export function ThreadIndicator({ metadata, onClick }: ThreadIndicatorProps) {
  const { reply_count, last_reply_at } = metadata

  // Format relative time
  const getRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    const diffWeeks = Math.floor(diffDays / 7)
    return `${diffWeeks}w ago`
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 mt-2 text-sm text-primary hover:bg-muted rounded-md transition-colors"
    >
      <MessageSquareReply className="h-4 w-4" />
      <span className="font-medium">
        {reply_count} {reply_count === 1 ? 'reply' : 'replies'}
      </span>
      <span className="text-muted-foreground">
        • {getRelativeTime(last_reply_at)}
      </span>
    </button>
  )
}
