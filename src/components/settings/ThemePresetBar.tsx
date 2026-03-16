import { useTheme } from '@/lib/theming'
import { PRESET_THEME_NAMES } from '@/lib/theme-presets'

interface ThemePresetBarProps {
  activePreset: string | null
  onSelect: (presetName: string) => void
}

export function ThemePresetBar({ activePreset, onSelect }: ThemePresetBarProps) {
  const t = useTheme()

  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_THEME_NAMES.map((name) => {
        const isActive = activePreset === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? `${t.active} border-2 border-brand-primary text-brand-primary`
                : `${t.buttonGhost} border-2 border-transparent`
            }`}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        )
      })}
    </div>
  )
}
