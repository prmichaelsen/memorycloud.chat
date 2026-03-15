/**
 * ThemeToggle — dark/light mode toggle button.
 * Persists selection to localStorage.
 * Updates ThemingProvider via callback.
 */

import { Sun, Moon } from 'lucide-react'
import { useTheme, type ThemeName } from '@/lib/theming'

const THEME_STORAGE_KEY = 'remember_theme'

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // System preference fallback
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function storeTheme(theme: ThemeName): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

interface ThemeToggleProps {
  currentTheme: ThemeName
  onToggle: (theme: ThemeName) => void
}

export function ThemeToggle({ currentTheme, onToggle }: ThemeToggleProps) {
  const t = useTheme()
  const isDark = currentTheme === 'dark'

  const handleToggle = () => {
    const next: ThemeName = isDark ? 'light' : 'dark'
    storeTheme(next)
    onToggle(next)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-md ${t.buttonGhost} transition-colors`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
