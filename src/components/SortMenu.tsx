import { useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import type { SortBy } from '../db/types'

const OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'date', label: '日期' },
  { id: 'updatedAt', label: '修改时间' },
  { id: 'createdAt', label: '创建时间' },
  { id: 'title', label: '标题' },
  { id: 'color', label: '颜色' },
]

interface SortMenuProps {
  value: SortBy
  onChange: (v: SortBy) => void
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((o) => o.id === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 px-2 py-1 rounded"
      >
        <ArrowDownUp size={14} />
        {current?.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 min-w-28">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false) }}
                className={`
                  w-full text-left px-4 py-2 text-sm
                  ${o.id === value ? 'text-amber-500 font-medium' : 'text-slate-700 dark:text-slate-300'}
                  hover:bg-slate-50 dark:hover:bg-slate-700
                `}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
