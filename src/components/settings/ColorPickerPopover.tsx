import type { RefObject } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { useTheme } from '@/lib/theming'
import { Popover } from '@/components/action-bar/Popover'

interface ColorPickerPopoverProps {
  color: string
  onChange: (color: string) => void
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
}

export function ColorPickerPopover({ color, onChange, anchorRef, onClose }: ColorPickerPopoverProps) {
  const t = useTheme()

  return (
    <Popover anchorRef={anchorRef} onClose={onClose}>
      <div className="flex flex-col gap-3 p-2">
        <HexColorPicker color={color} onChange={onChange} />
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full border border-border-default shrink-0"
            style={{ backgroundColor: color }}
          />
          <HexColorInput
            color={color}
            onChange={onChange}
            prefixed
            className={`font-mono text-sm px-2 py-1 rounded w-full ${t.input} ${t.inputFocus}`}
          />
        </div>
      </div>
    </Popover>
  )
}
