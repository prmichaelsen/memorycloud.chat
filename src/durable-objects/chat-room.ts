import { DurableObject } from 'cloudflare:workers'
import type { WebSocketMessage, WebSocketMessageType } from '@/types/websocket'

/**
 * ChatRoom Durable Object — manages WebSocket connections for a conversation.
 * Each conversation gets its own ChatRoom instance.
 *
 * Handles the typed message protocol: message:new, typing:start, typing:stop,
 * presence updates, and agent responses. Attaches user metadata to each
 * WebSocket via tags so messages can be filtered per-user when needed.
 */

interface WebSocketAttachment {
  user_id: string
  user_name: string
  joined_at: string
}

/** Message types that should be broadcast to all OTHER clients (exclude sender). */
const BROADCAST_TYPES: Set<WebSocketMessageType> = new Set([
  'message_new',
  'message_update',
  'message_delete',
  'typing_start',
  'typing_stop',
  'agent_response',
  'agent_response_chunk',
])

/** Message types that should be broadcast to ALL clients including sender. */
const BROADCAST_ALL_TYPES: Set<WebSocketMessageType> = new Set([
  'presence_update',
  'notification',
])

export class ChatRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 })
      }

      const userId = url.searchParams.get('userId')
      const userName = url.searchParams.get('userName')

      if (!userId) {
        return new Response('Missing userId parameter', { status: 400 })
      }

      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      // Accept with hibernation API — attach user metadata
      this.ctx.acceptWebSocket(server, [userId])

      // Store user info as serializable attachment
      const attachment: WebSocketAttachment = {
        user_id: userId,
        user_name: userName ?? 'Unknown',
        joined_at: new Date().toISOString(),
      }
      server.serializeAttachment(attachment)

      // Notify other clients about presence
      this.broadcastToOthers(server, {
        type: 'presence_update',
        user_id: userId,
        status: 'online',
      })

      return new Response(null, { status: 101, webSocket: client })
    }

    // HTTP endpoint for server-initiated broadcasts (e.g., from API routes)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      try {
        const message = (await request.json()) as WebSocketMessage
        this.broadcastToAll(message)
        return new Response('OK', { status: 200 })
      } catch {
        return new Response('Invalid JSON', { status: 400 })
      }
    }

    // Get connected users count
    if (url.pathname === '/status') {
      const sockets = this.ctx.getWebSockets()
      const users = sockets
        .map((ws) => {
          try {
            return (ws.deserializeAttachment() as WebSocketAttachment)?.user_id
          } catch {
            return null
          }
        })
        .filter(Boolean)

      return Response.json({
        connected: sockets.length,
        users: [...new Set(users)],
      })
    }

    return new Response('Not found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message)

    let parsed: WebSocketMessage
    try {
      parsed = JSON.parse(data) as WebSocketMessage
    } catch {
      // Invalid JSON — send error back to sender
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    // Route based on message type
    if (BROADCAST_ALL_TYPES.has(parsed.type)) {
      this.broadcastToAll(parsed)
    } else if (BROADCAST_TYPES.has(parsed.type)) {
      this.broadcastToOthers(ws, parsed)
    } else {
      // Unknown type — still broadcast to others for forward compatibility
      this.broadcastToOthers(ws, parsed)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Notify others about disconnect
    try {
      const attachment = ws.deserializeAttachment() as WebSocketAttachment | null
      if (attachment?.user_id) {
        // Check if user has other connections still open
        const otherConnections = this.ctx
          .getWebSockets(attachment.user_id)
          .filter((s) => s !== ws && s.readyState === WebSocket.OPEN)

        if (otherConnections.length === 0) {
          this.broadcastToOthers(ws, {
            type: 'presence_update',
            user_id: attachment.user_id,
            status: 'offline',
          })
        }
      }
    } catch {
      // Attachment may not be available
    }

    ws.close(code, reason)
  }

  async webSocketError(ws: WebSocket) {
    try {
      const attachment = ws.deserializeAttachment() as WebSocketAttachment | null
      if (attachment?.user_id) {
        const otherConnections = this.ctx
          .getWebSockets(attachment.user_id)
          .filter((s) => s !== ws && s.readyState === WebSocket.OPEN)

        if (otherConnections.length === 0) {
          this.broadcastToOthers(ws, {
            type: 'presence_update',
            user_id: attachment.user_id,
            status: 'offline',
          })
        }
      }
    } catch {
      // Attachment may not be available
    }

    ws.close()
  }

  /**
   * Broadcast a message to all connected clients except the sender.
   */
  private broadcastToOthers(sender: WebSocket, message: WebSocketMessage) {
    const payload = JSON.stringify(message)
    for (const client of this.ctx.getWebSockets()) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload)
        } catch {
          // Client may have disconnected
        }
      }
    }
  }

  /**
   * Broadcast a message to ALL connected clients (including sender).
   */
  private broadcastToAll(message: WebSocketMessage) {
    const payload = JSON.stringify(message)
    for (const client of this.ctx.getWebSockets()) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload)
        } catch {
          // Client may have disconnected
        }
      }
    }
  }
}
