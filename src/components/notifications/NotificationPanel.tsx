/**
 * NotificationPanel — dropdown list of recent notifications.
 * Uses t.notificationUnread / t.notificationRead for read-state styling.
 * "Mark all as read" action. Click notification navigates to conversation.
 * Real-time updates via WebSocket sync badge count across tabs.
 */

import { Bell, Check, MessageSquare, Ghost, AtSign, Trash2 } from 'lucide-react'
import { BrandIcon } from '@/components/BrandIcon'
import { useTheme } from '@/lib/theming'
import type { Notification, NotificationType } from '@/types/notifications'

interface NotificationPanelProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onNotificationClick?: (notification: Notification) => void
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_dm':
      return <MessageSquare className="w-4 h-4 text-brand-primary" />
    case 'group_message':
      return <MessageSquare className="w-4 h-4 text-brand-secondary" />
    case 'agent_response':
      return <Ghost className="w-4 h-4 text-brand-accent" />
    case 'mention':
      return <AtSign className="w-4 h-4 text-brand-warning" />
    case 'memory_saved':
      return <BrandIcon className="w-4 h-4 bg-brand-success" />
    default:
      return <Bell className="w-4 h-4 text-text-secondary" />
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  onNotificationClick,
}: NotificationPanelProps) {
  const t = useTheme()

  const hasUnread = notifications.some((n) => !n.read)

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id)
    }

    if (onNotificationClick) {
      onNotificationClick(notification)
      onClose()
    } else if (notification.conversation_id) {
      // Default: navigate to conversation
      onClose()
      window.location.href = `/chat/${notification.conversation_id}`
    }
  }

  return (
    <div
      className={`absolute right-0 top-full mt-2 w-80 max-h-96 ${t.card} shadow-lg overflow-hidden z-50`}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${t.borderSubtle} border-b`}>
        <h3 className={`text-sm font-semibold ${t.textPrimary}`}>
          Notifications
        </h3>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-80">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className={`w-8 h-8 ${t.textMuted} mx-auto mb-2`} />
            <p className={`text-sm ${t.textMuted}`}>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b ${t.borderSubtle} ${
                !notification.read ? t.notificationUnread : t.notificationRead
              } ${t.hover}`}
              onClick={() => handleNotificationClick(notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNotificationClick(notification)
              }}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-tight ${
                    !notification.read
                      ? `font-medium ${t.textPrimary}`
                      : t.textSecondary
                  }`}
                >
                  {notification.title}
                </p>
                <p className={`text-xs ${t.textMuted} mt-0.5 truncate`}>
                  {notification.body}
                </p>
                <p className={`text-[10px] ${t.textMuted} mt-1`}>
                  {timeAgo(notification.created_at)}
                </p>
              </div>

              {/* Unread dot + delete */}
              <div className="flex items-center gap-1 shrink-0">
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(notification.id)
                  }}
                  className={`p-1 ${t.textMuted} hover:text-brand-danger transition-colors opacity-0 group-hover:opacity-100`}
                  aria-label="Delete notification"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
