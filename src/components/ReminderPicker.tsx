import { useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

interface ReminderPickerProps {
  value: number | null
  onChange: (ms: number | null) => void
}

export function ReminderPicker({ value, onChange }: ReminderPickerProps) {
  const [open, setOpen] = useState(false)

  function formatForInput(ms: number): string {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const ms = new Date(e.target.value).getTime()
    if (!isNaN(ms)) onChange(ms)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${value ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'text-slate-400'}`}
      >
        <Bell size={13} />
        {value ? formatDisplay(value) : '提醒'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        defaultValue={value ? formatForInput(value) : formatForInput(Date.now() + 3_600_000)}
        onChange={handleChange}
        className="text-xs bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400 text-slate-800 dark:text-slate-100"
      />
      {value && (
        <button onClick={() => { onChange(null); setOpen(false) }} className="text-slate-400 hover:text-red-400">
          <BellOff size={14} />
        </button>
      )}
      <button onClick={() => setOpen(false)} className="text-slate-400">
        <X size={14} />
      </button>
    </div>
  )
}

function formatDisplay(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
