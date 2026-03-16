/**
 * Theme persistence helpers — cookie + API for theme variables.
 *
 * Cookie stores CSS variable overrides for SSR no-flash.
 * API routes persist full ThemePreferences to Firestore.
 */

import type { ThemePreferences } from '@/types/theme-editor'

const COOKIE_NAME = 'remember_theme_vars'
const ONE_YEAR = 365 * 24 * 60 * 60

// ---------------------------------------------------------------------------
// Cookie helpers (client-side only)
// ---------------------------------------------------------------------------

export function setThemeCookie(variables: Record<string, string>): void {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(JSON.stringify(variables))
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${ONE_YEAR}; path=/; SameSite=Lax`
}

export function getThemeCookie(): Record<string, string> | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)))
  } catch {
    return null
  }
}

export function clearThemeCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`
}

// ---------------------------------------------------------------------------
// Server-side cookie parser (Cloudflare Workers compatible)
// ---------------------------------------------------------------------------

export function parseThemeCookieFromHeader(
  cookieHeader: string | null,
): Record<string, string> | null {
  if (!cookieHeader) return null
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// API helpers (client-side, call API routes)
// ---------------------------------------------------------------------------

export async function saveThemeToApi(prefs: ThemePreferences): Promise<void> {
  const res = await fetch('/api/preferences/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  if (!res.ok) {
    throw new Error(`Failed to save theme preferences: ${res.status}`)
  }
}

export async function loadThemeFromApi(): Promise<ThemePreferences | null> {
  const res = await fetch('/api/preferences/theme')
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load theme preferences: ${res.status}`)
  }
  const data = (await res.json()) as { theme?: ThemePreferences | null }
  return data.theme ?? null
}
