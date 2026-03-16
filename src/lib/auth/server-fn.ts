import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getServerSession } from '@/lib/auth/session'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { parseThemeCookieFromHeader } from '@/lib/theme-persistence'

export const getAuthSession = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    initFirebaseAdmin()
    const session = await getServerSession(getRequest())
    return session ?? null
  } catch {
    return null
  }
})

export const getThemeOverrides = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const request = getRequest()
    const cookieHeader = request.headers.get('cookie')
    return parseThemeCookieFromHeader(cookieHeader)
  } catch {
    return null
  }
})
