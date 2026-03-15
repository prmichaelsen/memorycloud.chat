import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'

export const Route = createFileRoute(
  '/api/ghosts/conversations/$conversationId/messages/stream',
)({
  server: {
    handlers: {
      POST: async ({
        request,
        params,
      }: {
        request: Request
        params: { conversationId: string }
      }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { conversationId } = params
        if (!conversationId) {
          return Response.json(
            { error: 'conversationId is required' },
            { status: 400 },
          )
        }

        let body: { content?: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { content } = body
        if (!content || typeof content !== 'string') {
          return Response.json(
            { error: 'content is required' },
            { status: 400 },
          )
        }

        // Stub SSE response — will be wired to ghost AI service in a future task
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            // Send a placeholder assistant response as SSE events
            const chunks = [
              `data: ${JSON.stringify({ type: 'start', conversationId })}\n\n`,
              `data: ${JSON.stringify({ type: 'chunk', content: 'Ghost streaming is not yet implemented.' })}\n\n`,
              `data: ${JSON.stringify({ type: 'done' })}\n\n`,
            ]

            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
