/**
 * WebSocket upgrade endpoint — routes to ChatRoom Durable Object by conversation ID.
 *
 * Usage: GET /api/ws?conversationId=<id>
 * The request must include the Upgrade: websocket header.
 */

import { createAPIFileRoute } from '@tanstack/start/api'
import { env } from 'cloudflare:workers'

export const APIRoute = createAPIFileRoute('/api/ws')({
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
      // TODO: Replace with auth session check
      // const session = await getServerSession(request)
      // if (!session?.user) {
      //   return new Response('Unauthorized', { status: 401 })
      // }
      // const userId = session.user.id
      // const userName = session.user.displayName ?? 'Unknown'

      // Placeholder until auth is wired up
      const userId = url.searchParams.get('userId') ?? 'anonymous'
      const userName = url.searchParams.get('userName') ?? 'Anonymous'

      // Get the ChatRoom Durable Object for this conversation
      const chatRoomBinding = (env as any).CHAT_ROOM as DurableObjectNamespace
      const id = chatRoomBinding.idFromName(conversationId)
      const stub = chatRoomBinding.get(id)

      // Forward the WebSocket upgrade to the Durable Object
      // Pass user info as query params so the DO can attach metadata
      const doUrl = new URL(request.url)
      doUrl.pathname = '/websocket'
      doUrl.searchParams.set('userId', userId)
      doUrl.searchParams.set('userName', userName)

      return stub.fetch(
        new Request(doUrl.toString(), {
          headers: request.headers,
        }),
      )
    } catch {
      return new Response('Internal Server Error', { status: 500 })
    }
  },
})
