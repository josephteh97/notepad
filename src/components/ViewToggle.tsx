import { LayoutGrid, List } from 'lucide-react'
import type { ViewMode } from '../db/types'

interface ViewToggleProps {
  value: ViewMode
  onChange: (v: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded ${value === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
        aria-label="列表视图"
      >
        <List size={16} className="text-slate-600 dark:text-slate-300" />
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded ${value === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
        aria-label="网格视图"
      >
        <LayoutGrid size={16} className="text-slate-600 dark:text-slate-300" />
      </button>
    </div>
  )
}
