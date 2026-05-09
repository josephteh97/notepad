import { Pin, PinOff, Trash2, Share2 } from 'lucide-react'

interface ContextMenuProps {
  isPinned: boolean
  onPin: () => void
  onDelete: () => void
  onShare: () => void
  onClose: () => void
  x: number
  y: number
}

export function ContextMenu({ isPinned, onPin, onDelete, onShare, onClose, x, y }: ContextMenuProps) {
  // Clamp to viewport
  const safeX = Math.min(x, window.innerWidth - 160)
  const safeY = Math.min(y, window.innerHeight - 160)

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed z-40 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 py-1 min-w-36"
        style={{ left: safeX, top: safeY }}
      >
        <MenuItem icon={isPinned ? <PinOff size={16} /> : <Pin size={16} />} label={isPinned ? '取消置顶' : '置顶'} onClick={onPin} />
        <MenuItem icon={<Share2 size={16} />} label="分享" onClick={onShare} />
        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
        <MenuItem icon={<Trash2 size={16} />} label="删除" onClick={onDelete} danger />
      </div>
    </>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-sm
        ${danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}
        hover:bg-slate-50 dark:hover:bg-slate-700
      `}
    >
      {icon}
      {label}
    </button>
  )
}
