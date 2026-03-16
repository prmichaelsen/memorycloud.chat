import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTheme } from '@/lib/theming'
import { HexColorPicker, HexColorInput } from 'react-colorful'

export const Route = createFileRoute('/demo/color-pickers')({
  component: ColorPickersDemo,
})

function ColorPickersDemo() {
  const t = useTheme()
  const [color, setColor] = useState('#7C3AED')

  return (
    <div className={`min-h-screen p-8 ${t.page}`}>
      <div className="max-w-xl mx-auto">
        <Link to="/demo" className={`text-sm ${t.textMuted} hover:underline`}>
          &larr; Back to Demo
        </Link>
        <h1 className={`text-2xl font-bold mt-2 mb-6 ${t.textPrimary}`}>react-colorful</h1>

        <div className={`${t.card} p-6`}>
          <HexColorPicker color={color} onChange={setColor} style={{ width: '100%' }} />
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-lg border border-border-default shrink-0" style={{ backgroundColor: color }} />
            <HexColorInput
              color={color}
              onChange={setColor}
              prefixed
              className={`${t.input} ${t.inputFocus} rounded px-3 py-1.5 text-sm font-mono flex-1`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
