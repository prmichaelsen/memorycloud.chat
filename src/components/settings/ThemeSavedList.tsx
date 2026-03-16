import { useTheme } from '@/lib/theming'
import type { CustomTheme } from '@/types/theme-editor'

interface ThemeSavedListProps {
  themes: Record<string, CustomTheme>
  activeId: string | null
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export function ThemeSavedList({ themes, activeId, onLoad, onDelete }: ThemeSavedListProps) {
  const t = useTheme()
  const entries = Object.entries(themes)

  return (
    <div className={`${t.card} p-4`}>
      <h3 className={`text-sm font-semibold ${t.textPrimary} mb-3`}>
        Saved Themes
      </h3>
      {entries.length === 0 ? (
        <p className={`text-sm ${t.textMuted}`}>No saved themes yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([id, theme]) => {
            const isActive = activeId === id
            return (
              <div
                key={id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  isActive ? t.active : t.hover
                }`}
              >
                <span className={`text-sm ${isActive ? 'text-brand-primary font-medium' : t.textPrimary}`}>
                  {theme.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLoad(id)}
                    className={`text-xs px-2 py-1 rounded ${t.buttonGhost} transition-colors`}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(id)}
                    className={`text-xs px-2 py-1 rounded ${t.buttonDanger} transition-colors`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
