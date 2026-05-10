import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
  label?: string
}

export function FAB({ onClick, label }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label ?? '新建笔记'}
      className="
        fixed safe-fab right-6 z-40
        w-14 h-14 rounded-full
        bg-amber-400 dark:bg-amber-500
        text-white shadow-lg
        flex items-center justify-center
        active:scale-95 transition-transform
      "
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  )
}
