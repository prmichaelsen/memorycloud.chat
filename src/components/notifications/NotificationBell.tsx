/**
 * NotificationBell — bell icon in header with unread count badge.
 * Uses t.notificationBadge from ThemingProvider for badge styling.
 * Click toggles the NotificationPanel dropdown.
 * Real-time: WebSocket `notification` events update badge count instantly.
 */

import { Bell } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/lib/theming'
import { NotificationPanel } from './NotificationPanel'
import type { Notification } from '@/types/notifications'

interface NotificationBellProps {
  /** Current unread notification count */
  unreadCount: number
  /** Full list of notifications to display in the panel */
  notifications: Notification[]
  /** Called when a notification is marked as read */
  onMarkAsRead: (id: string) => Promise<void>
  /** Called when all notifications are marked as read */
  onMarkAllAsRead: () => Promise<void>
  /** Called when a notification is deleted */
  onDelete: (id: string) => Promise<void>
  /** Called when a notification is clicked — navigate to conversation */
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({
  unreadCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNotificationClick,
}: NotificationBellProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const t = useTheme()

  // Close panel on click outside
  useEffect(() => {
    if (!panelOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [panelOpen])

  // Close panel on Escape
  useEffect(() => {
    if (!panelOpen) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [panelOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        className={`relative p-2 ${t.textSecondary} hover:${t.textPrimary} transition-colors`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={panelOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 ${t.notificationBadge} text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <NotificationPanel
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDelete={onDelete}
          onClose={() => setPanelOpen(false)}
          onNotificationClick={onNotificationClick}
        />
      )}
    </div>
  )
}
