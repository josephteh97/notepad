import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDatesWithNotes, useNotesByDate } from '../hooks/useNotes'
import { NoteCard } from '../components/NoteCard'
import { updateNote, deleteNote } from '../db'
import { showToast } from '../utils/toast'
import type { Note } from '../db/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarScreenProps {
  onOpenDrawer: () => void
}

export function CalendarScreen({ onOpenDrawer: _unused }: CalendarScreenProps) {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const datesWithNotes = useDatesWithNotes()
  const dayNotes = useNotesByDate(selectedDay) as import('../db/types').Note[] | undefined

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function hasNote(day: number): boolean {
    if (!datesWithNotes) return false
    return datesWithNotes.has(`${year}-${month}-${day}`)
  }

  function selectDay(day: number) {
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    setSelectedDay(d.getTime())
  }

  async function handlePin(note: Note) {
    await updateNote(note.id!, { isPinned: !note.isPinned, pinnedAt: note.isPinned ? null : Date.now() })
  }
  async function handleDelete(note: Note) {
    await deleteNote(note.id!)
    showToast('笔记已删除')
  }
  function handleShare(note: Note) {
    const text = note.title ? `${note.title}\n\n${note.body}` : note.body
    navigator.share?.({ text }).catch(() => {})
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex-1">日历</span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={prevMonth} className="p-2">
          <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {year}年 {month + 1}月
        </span>
        <button onClick={nextMonth} className="p-2">
          <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-4">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-4 gap-y-1">
        {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
          const selected = selectedDay != null && new Date(selectedDay).getDate() === day && new Date(selectedDay).getMonth() === month
          return (
            <button
              key={day}
              onClick={() => selectDay(day)}
              className={`
                relative flex flex-col items-center py-1.5 rounded-lg
                ${selected ? 'bg-amber-400 text-white' : isToday ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300'}
                ${!selected && 'hover:bg-slate-50 dark:hover:bg-slate-800'}
              `}
            >
              <span className="text-sm leading-none">{day}</span>
              {hasNote(day) && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${selected ? 'bg-white' : 'bg-amber-400'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Day notes */}
      {selectedDay != null && (
        <div className="flex-1 px-4 mt-4 overflow-y-auto pb-6">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            {new Date(selectedDay).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}的笔记
          </h3>
          {dayNotes?.length === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-8">当天没有笔记</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dayNotes?.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onOpen={() => navigate(`/editor/${note.id}`)}
                  onPin={() => handlePin(note)}
                  onDelete={() => handleDelete(note)}
                  onShare={() => handleShare(note)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
