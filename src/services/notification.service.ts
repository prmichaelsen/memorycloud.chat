/**
 * Notification Service — CRUD operations for in-app notifications.
 * Stubs Firestore; ready for real backend integration.
 */

import type { Notification, NotificationType } from '@/types/notifications'

/** In-memory store for development; replaced by Firestore in production. */
let notificationStore: Notification[] = []
let idCounter = 0

function generateId(): string {
  idCounter += 1
  return `notif_${Date.now()}_${idCounter}`
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export interface CreateNotificationParams {
  user_id: string
  type: NotificationType
  title: string
  body: string
  conversation_id?: string | null
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<Notification> {
  const notification: Notification = {
    id: generateId(),
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    body: params.body,
    conversation_id: params.conversation_id ?? null,
    read: false,
    created_at: new Date().toISOString(),
  }

  notificationStore.unshift(notification)
  return notification
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Notification[]> {
  const { limit = 20, offset = 0 } = options
  return notificationStore
    .filter((n) => n.user_id === userId)
    .slice(offset, offset + limit)
}

export async function getNotificationById(
  id: string,
): Promise<Notification | null> {
  return notificationStore.find((n) => n.id === id) ?? null
}

export async function getUnreadCount(userId: string): Promise<number> {
  return notificationStore.filter(
    (n) => n.user_id === userId && !n.read,
  ).length
}

// ---------------------------------------------------------------------------
// UPDATE — mark as read
// ---------------------------------------------------------------------------

export async function markAsRead(id: string): Promise<Notification | null> {
  const notification = notificationStore.find((n) => n.id === id)
  if (!notification) return null
  notification.read = true
  return notification
}

export async function markAllAsRead(userId: string): Promise<number> {
  let count = 0
  for (const n of notificationStore) {
    if (n.user_id === userId && !n.read) {
      n.read = true
      count += 1
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteNotification(id: string): Promise<boolean> {
  const index = notificationStore.findIndex((n) => n.id === id)
  if (index === -1) return false
  notificationStore.splice(index, 1)
  return true
}

// ---------------------------------------------------------------------------
// Helpers (for testing / reset)
// ---------------------------------------------------------------------------

export function _resetStore(): void {
  notificationStore = []
  idCounter = 0
}
