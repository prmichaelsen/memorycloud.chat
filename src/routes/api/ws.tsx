/**
 * WebSocket upgrade endpoint — routes to ChatRoom Durable Object by conversation ID.
 *
 * Usage: GET /api/ws?conversationId=<id>
 * The request must include the Upgrade: websocket header.
 * Requires an authenticated session.
 */

import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { env } from 'cloudflare:workers'

export const Route = createFileRoute('/api/ws')({
  server: {
    handlers: {
      GET: async ({ request }) => {
    // Must be a WebSocket upgrade request
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const url = new URL(request.url)
    const conversationId = url.searchParams.get('conversationId')

    if (!conversationId) {
      return new Response('Missing conversationId query parameter', { status: 400 })
    }

    try {
      // Auth check — reject unauthenticated WebSocket upgrades
      initFirebaseAdmin()
      const session = await getServerSession(request)
      if (!session) {
        return new Response('Unauthorized', { status: 401 })
      }
      const userId = session.uid
      const userName = session.displayName ?? 'Unknown'

      // Get the ChatRoom Durable Object for this conversation
      const chatRoomBinding = (env as any).CHAT_ROOM as DurableObjectNamespace
      const id = chatRoomBinding.idFromName(conversationId)
      const stub = chatRoomBinding.get(id)

      // Pass user info via headers, forward original request to preserve WS upgrade
      const doHeaders = new Headers(request.headers)
      doHeaders.set('X-User-Id', userId)
      doHeaders.set('X-User-Name', userName)

      return stub.fetch(new Request(request.url, { headers: doHeaders }))
    } catch {
      return new Response('Internal Server Error', { status: 500 })
    }
      },
    },
  },
})
