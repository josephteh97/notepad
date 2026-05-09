import { NOTE_COLORS } from '../utils/colors'
import type { NoteColor } from '../db/types'
import { Check } from 'lucide-react'

interface ColorPickerProps {
  value: NoteColor
  onChange: (c: NoteColor) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap px-2">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          aria-label={c.label}
          className={`
            w-8 h-8 rounded-full border-2 flex items-center justify-center
            ${c.dot}
            ${value === c.id ? 'border-slate-600 dark:border-white scale-110' : 'border-transparent'}
            transition-transform
          `}
        >
          {value === c.id && <Check size={14} className="text-white drop-shadow" />}
        </button>
      ))}
    </div>
  )
}
