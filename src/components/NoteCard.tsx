import { useState, useRef } from 'react'
import { Star, Bell } from 'lucide-react'
import type { Note, ViewMode } from '../db/types'
import { getColorClasses } from '../utils/colors'
import { formatDate, reminderCountdown } from '../utils/date'
import { ContextMenu } from './ContextMenu'

interface NoteCardProps {
  note: Note
  viewMode?: ViewMode
  onOpen: () => void
  onPin: () => void
  onDelete: () => void
  onShare: () => void
}

export function NoteCard({ note, viewMode = 'list', onOpen, onPin, onDelete, onShare }: NoteCardProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const colorClass = getColorClasses(note.color)
  const preview = getPreview(note)

  function handlePointerDown(e: React.PointerEvent) {
    pressTimer.current = setTimeout(() => {
      setMenu({ x: e.clientX, y: e.clientY })
    }, 500)
  }

  function handlePointerUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handlePointerCancel() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handleStarClick(e: React.MouseEvent) {
    e.stopPropagation()
    onPin()
  }

  return (
    <>
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => !menu && onOpen()}
        className={`
          relative rounded-2xl p-3 cursor-pointer select-none
          ${colorClass}
          border border-slate-100 dark:border-slate-700
          shadow-sm active:scale-[0.98] transition-transform
          ${viewMode === 'grid' ? 'min-h-28' : ''}
        `}
      >
        {/* Star pin button */}
        <button
          onClick={handleStarClick}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={note.isPinned ? '取消置顶' : '置顶'}
          className="absolute top-2 right-2 p-1 rounded-full"
        >
          <Star
            size={16}
            className={note.isPinned ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
          />
        </button>

        {/* Title */}
        {note.title ? (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 pr-6 line-clamp-1">
            {note.title}
          </p>
        ) : null}

        {/* Body preview */}
        {preview ? (
          <p className={`text-xs text-slate-500 dark:text-slate-400 mt-0.5 ${viewMode === 'grid' ? 'line-clamp-4' : 'line-clamp-2'}`}>
            {preview}
          </p>
        ) : null}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-slate-400">
            {formatDate(typeof note.date === 'number' ? note.date : note.updatedAt)}
          </span>
          {note.remindAt && (() => {
            const completed = !!note.reminderCompletedAt
            const cd = !completed ? reminderCountdown(note.remindAt) : null
            return (
              <span className={`flex items-center gap-0.5 text-[10px] ${completed ? 'text-slate-300' : cd ? 'text-amber-500' : 'text-red-400'}`}>
                <Bell size={10} fill={completed || !cd ? 'none' : 'currentColor'} />
                {cd ?? (completed ? '' : '已过期')}
              </span>
            )
          })()}
          {note.type === 'checklist' && (
            <span className="text-[10px] text-slate-400">☑</span>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu
          isPinned={note.isPinned}
          x={menu.x}
          y={menu.y}
          onPin={() => { onPin(); setMenu(null) }}
          onDelete={() => { onDelete(); setMenu(null) }}
          onShare={() => { onShare(); setMenu(null) }}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}

function getPreview(note: Note): string {
  if (note.type === 'checklist') {
    try {
      const items = JSON.parse(note.body)
      return items.map((i: { text: string; checked: boolean }) => `${i.checked ? '✓' : '○'} ${i.text}`).join('  ')
    } catch {
      return note.body
    }
  }
  return note.body
}
