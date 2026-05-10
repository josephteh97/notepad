import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAllNotes, usePinnedNotes } from '../hooks/useNotes'
import { useSetting, saveSetting } from '../hooks/useSettings'
import { NoteCard } from '../components/NoteCard'
import { PinnedSection } from '../components/PinnedSection'
import { LatestSection } from '../components/LatestSection'
import { SearchBar } from '../components/SearchBar'
import { SortMenu } from '../components/SortMenu'
import { ViewToggle } from '../components/ViewToggle'
import { FAB } from '../components/FAB'
import { updateNote, deleteNote } from '../db'
import { showToast } from '../utils/toast'
import type { Note, SortBy, ViewMode } from '../db/types'

const MAX_PINS = 10

interface HomeScreenProps {
  onOpenDrawer: () => void
}

export function HomeScreen({ onOpenDrawer }: HomeScreenProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const sortBy = useSetting<SortBy>('sortBy', 'date')
  const viewMode = useSetting<ViewMode>('viewMode', 'list')

  const pinnedNotes = usePinnedNotes() ?? []
  const allNotes = useAllNotes(sortBy, search) ?? []
  const nonPinned = allNotes.filter((n) => !n.isPinned)
  // Top 3 most-recently updated (always sorted by updatedAt regardless of sortBy)
  const latestNotes = !search
    ? [...nonPinned].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
    : []
  const latestIds = new Set(latestNotes.map((n) => n.id))
  const regularNotes = nonPinned.filter((n) => !latestIds.has(n.id))

  async function handlePin(note: Note) {
    if (!note.isPinned && pinnedNotes.length >= MAX_PINS) {
      showToast('最多可置顶 10 条')
      return
    }
    await updateNote(note.id!, {
      isPinned: !note.isPinned,
      pinnedAt: note.isPinned ? null : Date.now(),
    })
  }

  async function handleDelete(note: Note) {
    await deleteNote(note.id!)
    showToast('笔记已删除')
  }

  function handleShare(note: Note) {
    const text = note.title ? `${note.title}\n\n${note.body}` : note.body
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      showToast('已复制到剪贴板')
    }
  }

  const emptyMessage = search
    ? `没有找到 "${search}" 相关的笔记`
    : '还没有笔记，点击 + 开始记录'

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 min-h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 safe-top pb-2">
        <button onClick={onOpenDrawer} className="p-1 -ml-1">
          <Menu size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex-1">我的笔记</h1>
        <ViewToggle value={viewMode} onChange={(v) => saveSetting('viewMode', v)} />
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <SortMenu value={sortBy} onChange={(v) => saveSetting('sortBy', v)} />
      </div>

      {/* Pinned section */}
      {!search && (
        <PinnedSection
          notes={pinnedNotes}
          viewMode={viewMode}
          onOpen={(id) => navigate(`/editor/${id}`)}
          onPin={handlePin}
          onDelete={handleDelete}
          onShare={handleShare}
        />
      )}

      {/* Latest 3 section */}
      {!search && (
        <LatestSection
          notes={latestNotes}
          viewMode={viewMode}
          onOpen={(id) => navigate(`/editor/${id}`)}
          onPin={handlePin}
          onDelete={handleDelete}
          onShare={handleShare}
        />
      )}

      {/* Regular notes */}
      <div className="flex-1 overflow-y-auto pb-fab">
        {regularNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-16 px-8">{emptyMessage}</div>
        ) : regularNotes.length === 0 && search === '' ? null : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2 px-4 pt-3' : 'flex flex-col gap-2 px-4 pt-3'}>
            {regularNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode={viewMode}
                onOpen={() => navigate(`/editor/${note.id}`)}
                onPin={() => handlePin(note)}
                onDelete={() => handleDelete(note)}
                onShare={() => handleShare(note)}
              />
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => navigate('/editor')} />
    </div>
  )
}
