/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications when the app is not in the foreground.
 * Clicking a notification opens the app at the correct conversation (deep linking).
 */

/* eslint-disable no-restricted-globals */

// Import Firebase scripts for service worker context
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Initialize Firebase in service worker context
// Config values are baked in at build time or fetched via query params
firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY || '',
  authDomain: self.__FIREBASE_AUTH_DOMAIN || '',
  projectId: self.__FIREBASE_PROJECT_ID || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.__FIREBASE_APP_ID || '',
})

const messaging = firebase.messaging()

// ---------------------------------------------------------------------------
// Background Message Handler
// ---------------------------------------------------------------------------

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Remember'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.data?.notification_id || 'default',
    data: payload.data || {},
    // Vibration pattern: short buzz
    vibrate: [100, 50, 100],
    // Actions for quick interactions
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    // Renotify if same tag (updated notification)
    renotify: true,
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// ---------------------------------------------------------------------------
// Notification Click Handler — Deep Linking
// ---------------------------------------------------------------------------

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  notification.close()

  // Handle action buttons
  if (event.action === 'dismiss') return

  // Build deep link URL from notification data
  const data = notification.data || {}
  let targetUrl = '/'

  if (data.conversation_id) {
    targetUrl = `/chat/${data.conversation_id}`
  } else if (data.url) {
    targetUrl = data.url
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window and navigate it
        for (const client of clientList) {
          if ('focus' in client && 'navigate' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      }),
  )
})

// ---------------------------------------------------------------------------
// Service Worker Lifecycle
// ---------------------------------------------------------------------------

self.addEventListener('install', () => {
  // Activate immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim())
})
