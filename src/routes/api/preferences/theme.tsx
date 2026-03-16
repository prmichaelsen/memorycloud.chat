/**
 * API route: /api/preferences/theme
 *
 * GET  — returns user's ThemePreferences from Firestore
 * PATCH — merges theme preferences into the user's preferences doc
 */

import { createFileRoute } from '@tanstack/react-router'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getServerSession } from '@/lib/auth/session'
import { getDocument, setDocument } from '@prmichaelsen/firebase-admin-sdk-v8'

function preferencesPath(userId: string): string {
  return `agentbase.users/${userId}/preferences`
}

const PREFERENCES_DOC_ID = 'default'

export const Route = createFileRoute('/api/preferences/theme')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const doc = await getDocument(preferencesPath(session.uid), PREFERENCES_DOC_ID)
          if (!doc || !doc.theme) {
            return Response.json({ theme: null })
          }
          return Response.json({ theme: doc.theme })
        } catch (error) {
          console.error('[api/preferences/theme] GET error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      PATCH: async ({ request }: { request: Request }) => {
        initFirebaseAdmin()

        const session = await getServerSession(request)
        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: any
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        try {
          await setDocument(
            preferencesPath(session.uid),
            PREFERENCES_DOC_ID,
            { theme: body },
            { merge: true },
          )
          return Response.json({ success: true })
        } catch (error) {
          console.error('[api/preferences/theme] PATCH error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
