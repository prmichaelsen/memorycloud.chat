import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getServerSession } from '@/lib/auth/session'
import { initFirebaseAdmin } from '@/lib/firebase-admin'
import { getDocument } from '@prmichaelsen/firebase-admin-sdk-v8'
import { PRESET_THEMES } from '@/lib/theme-presets'

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
    initFirebaseAdmin()
    const session = await getServerSession(getRequest())
    if (!session) return null

    const doc = await getDocument(`agentbase.users/${session.uid}/preferences`, 'default')
    if (!doc) return null

    const theme = (doc as any).theme
    if (!theme?.active_theme) return null

    // If active theme is a preset, return its variables directly
    const preset = PRESET_THEMES[theme.active_theme]
    if (preset) return preset

    // If active theme is a custom theme, merge base defaults + overrides
    const custom = theme.custom_themes?.[theme.active_theme]
    if (custom) {
      const base = PRESET_THEMES[custom.base] ?? PRESET_THEMES['dark']
      return { ...base, ...custom.variables }
    }

    return null
  } catch {
    return null
  }
})
