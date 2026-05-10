import { useState } from 'react'
import { Calendar, X } from 'lucide-react'

interface DatePickerProps {
  value: number | null
  onChange: (ms: number | null) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
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
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${value ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-400'}`}
      >
        <Calendar size={13} />
        {value ? formatDisplay(value) : '日期'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        defaultValue={value ? formatForInput(value) : formatForInput(Date.now())}
        onChange={handleChange}
        className="text-xs bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 text-slate-800 dark:text-slate-100"
      />
      {value != null && (
        <button onClick={() => { onChange(null); setOpen(false) }} className="text-slate-400 hover:text-red-400 text-[11px]">
          清除
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
