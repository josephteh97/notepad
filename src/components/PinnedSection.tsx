import type { Note, ViewMode } from '../db/types'
import { NoteCard } from './NoteCard'

interface PinnedSectionProps {
  notes: Note[]
  viewMode: ViewMode
  onOpen: (id: number) => void
  onPin: (note: Note) => void
  onDelete: (note: Note) => void
  onShare: (note: Note) => void
}

export function PinnedSection({ notes, viewMode, onOpen, onPin, onDelete, onShare }: PinnedSectionProps) {
  if (!notes.length) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          📌 已置顶 ({notes.length})
        </span>
      </div>
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2 px-4' : 'flex flex-col gap-2 px-4'}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            viewMode={viewMode}
            onOpen={() => onOpen(note.id!)}
            onPin={() => onPin(note)}
            onDelete={() => onDelete(note)}
            onShare={() => onShare(note)}
          />
        ))}
      </div>
      <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4 mt-3" />
    </div>
  )
}
