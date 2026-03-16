import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '@/lib/theming'
import { THEME_VARIABLE_GROUPS } from '@/lib/theme-variables'
import { ThemeVariableRow } from './ThemeVariableRow'
import type { ThemeVariable, ThemeVariableGroup as ThemeVariableGroupType } from '@/types/theme-editor'

interface ThemeVariableGroupProps {
  group: ThemeVariableGroupType
  variables: ThemeVariable[]
  values: Record<string, string>
  onChange: (shortKey: string, value: string) => void
  onPickerOpen: (shortKey: string, anchorEl: HTMLElement) => void
}

export function ThemeVariableGroup({ group, variables, values, onChange, onPickerOpen }: ThemeVariableGroupProps) {
  const t = useTheme()
  const [expanded, setExpanded] = useState(true)
  const groupMeta = THEME_VARIABLE_GROUPS[group]

  return (
    <div className={`${t.card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${t.hover} transition-colors`}
      >
        <div className="text-left">
          <h3 className={`text-sm font-semibold ${t.textPrimary}`}>
            {groupMeta.label}
          </h3>
          <p className={`text-xs ${t.textMuted}`}>
            {groupMeta.description}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 ${t.textMuted} transition-transform ${expanded ? '' : '-rotate-90'}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-0.5">
          {variables.map((variable) => (
            <ThemeVariableRow
              key={variable.shortKey}
              variable={variable}
              value={values[variable.shortKey] ?? ''}
              onChange={onChange}
              onPickerOpen={onPickerOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
