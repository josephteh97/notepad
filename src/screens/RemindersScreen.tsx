import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Check } from 'lucide-react'
import { useReminders } from '../hooks/useReminders'
import { FAB } from '../components/FAB'
import { updateNote } from '../db'
import { cancelNotification } from '../utils/notifications'
import { formatReminderDate } from '../utils/date'
import { showToast } from '../utils/toast'
import type { Note } from '../db/types'

export function RemindersScreen() {
  const navigate = useNavigate()
  const sections = useReminders()

  async function handleComplete(note: Note) {
    if (note.notificationId) await cancelNotification(note.notificationId)
    await updateNote(note.id!, { reminderCompletedAt: Date.now(), notificationId: null })
    showToast('已完成')
  }

  async function handleSnooze(note: Note, addMs: number) {
    const newTime = (note.remindAt ?? Date.now()) + addMs
    await updateNote(note.id!, { remindAt: newTime, reminderCompletedAt: null })
    showToast('已延迟提醒')
  }

  if (!sections) return <LoadingScreen />

  const { overdue, today, upcoming, later } = sections
  const isEmpty = !overdue.length && !today.length && !upcoming.length && !later.length

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex-1">提醒</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {isEmpty && (
          <p className="text-center text-slate-400 text-sm mt-20">还没有提醒，点击 + 新建带提醒的笔记</p>
        )}

        {overdue.length > 0 && (
          <Section title="已过期" titleClass="text-red-500" notes={overdue}
            onOpen={(n) => navigate(`/editor/${n.id}`)}
            onComplete={handleComplete}
            onSnooze={handleSnooze} />
        )}
        {today.length > 0 && (
          <Section title="今天" notes={today}
            onOpen={(n) => navigate(`/editor/${n.id}`)}
            onComplete={handleComplete}
            onSnooze={handleSnooze} />
        )}
        {upcoming.length > 0 && (
          <Section title="即将到来" notes={upcoming}
            onOpen={(n) => navigate(`/editor/${n.id}`)}
            onComplete={handleComplete}
            onSnooze={handleSnooze} />
        )}
        {later.length > 0 && (
          <Section title="更晚" notes={later}
            onOpen={(n) => navigate(`/editor/${n.id}`)}
            onComplete={handleComplete}
            onSnooze={handleSnooze} />
        )}
      </div>

      <FAB onClick={() => navigate('/editor?type=reminder')} label="新建提醒" />
    </div>
  )
}

function Section({
  title,
  titleClass = 'text-slate-500 dark:text-slate-400',
  notes,
  onOpen,
  onComplete,
  onSnooze,
}: {
  title: string
  titleClass?: string
  notes: Note[]
  onOpen: (n: Note) => void
  onComplete: (n: Note) => void
  onSnooze: (n: Note, ms: number) => void
}) {
  return (
    <div className="mb-2">
      <div className={`px-4 py-1 text-xs font-semibold uppercase tracking-wide ${titleClass}`}>{title}</div>
      {notes.map((note) => (
        <ReminderRow
          key={note.id}
          note={note}
          onOpen={() => onOpen(note)}
          onComplete={() => onComplete(note)}
          onSnooze={(ms) => onSnooze(note, ms)}
        />
      ))}
    </div>
  )
}

function ReminderRow({
  note,
  onOpen,
  onComplete,
  onSnooze,
}: {
  note: Note
  onOpen: () => void
  onComplete: () => void
  onSnooze: (ms: number) => void
}) {
  const done = !!note.reminderCompletedAt
  const preview = note.type === 'checklist'
    ? (() => { try { return JSON.parse(note.body).map((i: { text: string }) => i.text).join(', ') } catch { return note.body } })()
    : note.body

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 ${done ? 'opacity-50' : ''}`}
    >
      <Bell
        size={18}
        className={`flex-shrink-0 mt-0.5 ${done ? 'text-slate-300' : 'text-amber-400'}`}
        fill={done ? 'none' : 'currentColor'}
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <p className={`text-sm font-medium text-slate-800 dark:text-slate-100 truncate ${done ? 'line-through' : ''}`}>
          {note.title || '(无标题)'}
        </p>
        {preview && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{preview}</p>
        )}
        <span className="text-[11px] text-slate-400 mt-1 block">
          {note.remindAt ? formatReminderDate(note.remindAt) : ''}
        </span>
      </div>
      {!done && (
        <div className="flex flex-col gap-1 items-end flex-shrink-0">
          <button
            onClick={onComplete}
            className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center"
          >
            <Check size={12} className="text-amber-500" />
          </button>
          <SnoozeMenu onSnooze={onSnooze} />
        </div>
      )}
    </div>
  )
}

function SnoozeMenu({ onSnooze }: { onSnooze: (ms: number) => void }) {
  return (
    <select
      onChange={(e) => { if (e.target.value) { onSnooze(Number(e.target.value)); e.target.value = '' } }}
      className="text-[10px] text-slate-400 bg-transparent border-none outline-none cursor-pointer"
      defaultValue=""
    >
      <option value="" disabled>延迟</option>
      <option value={3_600_000}>+1小时</option>
      <option value={86_400_000}>+1天</option>
      <option value={7 * 86_400_000}>+1周</option>
    </select>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
      <span className="text-slate-400 text-sm">加载中…</span>
    </div>
  )
}
