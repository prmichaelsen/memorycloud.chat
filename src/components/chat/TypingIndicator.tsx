/**
 * TypingIndicator — displays animated "User is typing..." below message list.
 * Supports single and multi-user typing states with bouncing dots animation.
 */

import { useTheme } from '@/lib/theming'

interface TypingIndicatorProps {
  typingUsers: Array<{ user_id: string; user_name: string }>
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const t = useTheme()

  if (typingUsers.length === 0) return null

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].user_name} is typing...`
      : typingUsers.length === 2
        ? `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing...`
        : `${typingUsers[0].user_name} and ${typingUsers.length - 1} others are typing...`

  return (
    <div className="flex items-center gap-2 py-2 px-1">
      <div className="flex gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${t.textMuted} animate-bounce`}
          style={{ animationDelay: '0ms', background: 'currentColor' }}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full ${t.textMuted} animate-bounce`}
          style={{ animationDelay: '150ms', background: 'currentColor' }}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full ${t.textMuted} animate-bounce`}
          style={{ animationDelay: '300ms', background: 'currentColor' }}
        />
      </div>
      <span className={`text-xs ${t.textMuted}`}>{label}</span>
    </div>
  )
}
