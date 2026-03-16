import { useState } from 'react'
import { useTheme } from '@/lib/theming'
import { parseThemeYaml } from '@/lib/theme-yaml'

interface ThemeImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (name: string, base: 'dark' | 'light', variables: Record<string, string>) => void
}

export function ThemeImportModal({ isOpen, onClose, onImport }: ThemeImportModalProps) {
  const t = useTheme()
  const [yamlText, setYamlText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleImport() {
    const result = parseThemeYaml(yamlText)
    if ('error' in result) {
      setError(result.error)
      return
    }
    const { theme } = result
    onImport(theme.name, theme.base, theme.variables)
    setYamlText('')
    setError(null)
    onClose()
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div className={`${t.card} rounded-xl p-6 w-full max-w-lg mx-4 space-y-4`}>
        <h2 className={`text-lg font-bold ${t.textPrimary}`}>Import Theme</h2>

        <textarea
          value={yamlText}
          onChange={(e) => {
            setYamlText(e.target.value)
            setError(null)
          }}
          rows={10}
          placeholder="Paste theme YAML here..."
          className={`w-full px-3 py-2 rounded-lg font-mono text-sm ${t.input} ${t.inputFocus}`}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <p className={`text-xs ${t.textSecondary}`}>
          This will replace your current editor state.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${t.buttonGhost}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${t.buttonPrimary}`}
          >
            Import &amp; Apply
          </button>
        </div>
      </div>
    </div>
  )
}
