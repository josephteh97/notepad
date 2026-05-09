import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = '搜索笔记…' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-8 py-2 rounded-full text-sm
          bg-slate-100 dark:bg-slate-700
          text-slate-800 dark:text-slate-100
          placeholder:text-slate-400
          border-none outline-none
          focus:ring-2 focus:ring-amber-400
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 p-1"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
