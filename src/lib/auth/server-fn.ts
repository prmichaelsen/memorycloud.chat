import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getServerSession } from '@/lib/auth/session'
import { initFirebaseAdmin } from '@/lib/firebase-admin'

export const getAuthSession = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    initFirebaseAdmin()
    const session = await getServerSession(getRequest())
    return session ?? null
  } catch {
    return null
  }
})
