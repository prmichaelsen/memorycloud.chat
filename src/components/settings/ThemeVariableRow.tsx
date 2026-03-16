import { useState, useRef } from 'react'
import { Palette } from 'lucide-react'
import { useTheme } from '@/lib/theming'
import type { ThemeVariable } from '@/types/theme-editor'

interface ThemeVariableRowProps {
  variable: ThemeVariable
  value: string
  onChange: (shortKey: string, value: string) => void
  onPickerOpen: (shortKey: string, anchorEl: HTMLElement) => void
}

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

export function ThemeVariableRow({ variable, value, onChange, onPickerOpen }: ThemeVariableRowProps) {
  const t = useTheme()
  const [inputValue, setInputValue] = useState(value)
  const pickerBtnRef = useRef<HTMLButtonElement>(null)

  const handleBlur = () => {
    if (HEX_REGEX.test(inputValue)) {
      onChange(variable.shortKey, inputValue)
    } else {
      setInputValue(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur()
    }
  }

  // Sync input when value changes externally (e.g. preset load)
  if (value !== inputValue && HEX_REGEX.test(value) && !document.activeElement?.closest(`[data-var="${variable.shortKey}"]`)) {
    setInputValue(value)
  }

  return (
    <div
      data-var={variable.shortKey}
      className="flex items-center gap-3 py-1.5"
    >
      <span className={`text-sm w-28 shrink-0 ${t.textSecondary}`}>
        {variable.label}
      </span>
      <div
        className="w-6 h-6 rounded border border-border-default shrink-0"
        style={{ backgroundColor: value }}
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`font-mono text-sm px-2 py-1 rounded w-24 ${t.input} ${t.inputFocus}`}
      />
      <button
        ref={pickerBtnRef}
        type="button"
        onClick={() => {
          if (pickerBtnRef.current) {
            onPickerOpen(variable.shortKey, pickerBtnRef.current)
          }
        }}
        className={`p-1 rounded ${t.buttonGhost} transition-colors`}
        aria-label={`Pick color for ${variable.label}`}
      >
        <Palette className="w-4 h-4" />
      </button>
    </div>
  )
}
