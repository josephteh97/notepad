import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, AlignLeft, CheckSquare } from 'lucide-react'
import { useNote } from '../hooks/useNotes'
import { db, createNote, updateNote, pushWidgetUpdate } from '../db'
import { ColorPicker } from '../components/ColorPicker'
import { ChecklistEditor } from '../components/ChecklistEditor'
import { ReminderPicker } from '../components/ReminderPicker'
import { DatePicker } from '../components/DatePicker'
import { scheduleNotification, cancelNotification } from '../utils/notifications'
import { getColorClasses } from '../utils/colors'
import { showToast } from '../utils/toast'
import type { NoteColor, NoteType, ChecklistItem } from '../db/types'

const AUTOSAVE_DEBOUNCE = 500

export function EditorScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const noteId = id ? Number(id) : undefined
  const existingNote = useNote(noteId)
  const isNew = !noteId

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [type, setType] = useState<NoteType>('text')
  const [color, setColor] = useState<NoteColor>('default')
  const [remindAt, setRemindAt] = useState<number | null>(null)
  const [date, setDate] = useState<number | null>(null)
  const [savedId, setSavedId] = useState<number | undefined>(noteId)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  // Seed state from existing note on mount
  useEffect(() => {
    if (initialized.current) return
    if (noteId && !existingNote) return // waiting for Dexie
    initialized.current = true

    if (existingNote) {
      setTitle(existingNote.title)
      setType(existingNote.type)
      setColor(existingNote.color)
      setRemindAt(existingNote.remindAt)
      setDate(typeof existingNote.date === 'number' ? existingNote.date : null)
      if (existingNote.type === 'checklist') {
        try {
          setItems(JSON.parse(existingNote.body))
        } catch {
          setItems([])
        }
      } else {
        setBody(existingNote.body)
      }
    } else if (isNew) {
      // Pre-set type from query param (e.g., ?type=reminder)
      const preType = searchParams.get('type')
      if (preType === 'reminder') setRemindAt(Date.now() + 3_600_000)
    }
  }, [existingNote, noteId, isNew, searchParams])

  // Auto-save debounce
  const save = useCallback(async (
    _title: string,
    _body: string,
    _items: ChecklistItem[],
    _type: NoteType,
    _color: NoteColor,
    _remindAt: number | null,
    _date: number | null,
    currentSavedId: number | undefined,
  ) => {
    const bodyStr = _type === 'checklist' ? JSON.stringify(_items) : _body
    const isEmpty = !_title.trim() && !bodyStr.trim() && !(_type === 'checklist' && _items.length)
    if (isEmpty) return currentSavedId

    if (currentSavedId == null) {
      // Create new note
      const newId = await createNote({
        title: _title,
        body: bodyStr,
        type: _type,
        color: _color,
        date: _date,
        isPinned: false,
        pinnedAt: null,
        remindAt: _remindAt,
        reminderCompletedAt: null,
        notificationId: null,
        deletedAt: null,
      })
      if (_remindAt) await scheduleNotification(newId, _title, bodyStr, _remindAt)
      void pushWidgetUpdate()
      return newId
    } else {
      const old = await db.notes.get(currentSavedId)
      // Cancel old notification if reminder changed
      if (old?.notificationId && old.remindAt !== _remindAt) {
        await cancelNotification(old.notificationId)
      }
      let notificationId = old?.notificationId ?? null
      if (_remindAt && _remindAt !== old?.remindAt) {
        notificationId = await scheduleNotification(currentSavedId, _title, bodyStr, _remindAt)
      } else if (!_remindAt && old?.notificationId) {
        notificationId = null
      }
      await updateNote(currentSavedId, {
        title: _title,
        body: bodyStr,
        type: _type,
        color: _color,
        remindAt: _remindAt,
        date: _date,
        notificationId,
      })
      void pushWidgetUpdate()
      return currentSavedId
    }
  }, [])

  function scheduleAutoSave(
    newTitle = title,
    newBody = body,
    newItems = items,
    newType = type,
    newColor = color,
    newRemindAt = remindAt,
    newDate = date,
  ) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const id = await save(newTitle, newBody, newItems, newType, newColor, newRemindAt, newDate, savedId)
      if (id != null) setSavedId(id)
    }, AUTOSAVE_DEBOUNCE)
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    scheduleAutoSave(v)
  }

  function handleBodyChange(v: string) {
    setBody(v)
    scheduleAutoSave(title, v)
  }

  function handleItemsChange(newItems: ChecklistItem[]) {
    setItems(newItems)
    scheduleAutoSave(title, body, newItems)
  }

  function handleTypeChange(newType: NoteType) {
    setType(newType)
    scheduleAutoSave(title, body, items, newType)
  }

  function handleColorChange(newColor: NoteColor) {
    setColor(newColor)
    scheduleAutoSave(title, body, items, type, newColor)
  }

  function handleReminderChange(newRemindAt: number | null) {
    setRemindAt(newRemindAt)
    scheduleAutoSave(title, body, items, type, color, newRemindAt)
  }

  function handleDateChange(newDate: number | null) {
    setDate(newDate)
    scheduleAutoSave(title, body, items, type, color, remindAt, newDate)
  }

  async function handleBack() {
    // Flush any pending save
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      await save(title, body, items, type, color, remindAt, date, savedId)
    }
    navigate('/', { replace: true })
  }

  // Delete note
  async function handleDelete() {
    if (savedId) {
      const note = await db.notes.get(savedId)
      if (note?.notificationId) await cancelNotification(note.notificationId)
      await db.notes.delete(savedId)
      showToast('笔记已删除')
    }
    navigate('/', { replace: true })
  }

  const bgClass = getColorClasses(color)

  return (
    <div className={`flex flex-col min-h-screen ${bgClass} transition-colors`}>
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-2 safe-top pb-2 border-b border-slate-100 dark:border-slate-700">
        <button onClick={handleBack} className="p-2">
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex-1" />
        {/* Type toggle */}
        <button
          onClick={() => handleTypeChange(type === 'text' ? 'checklist' : 'text')}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${type === 'checklist' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {type === 'checklist' ? <CheckSquare size={14} /> : <AlignLeft size={14} />}
          {type === 'checklist' ? '清单' : '文本'}
        </button>
        <DatePicker value={date} onChange={handleDateChange} />
        <ReminderPicker value={remindAt} onChange={handleReminderChange} />
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 px-2 py-1"
        >
          删除
        </button>
      </div>

      {/* Editor content */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="标题"
          autoFocus={isNew}
          className="w-full bg-transparent text-xl font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-3"
        />
        {type === 'text' ? (
          <textarea
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="开始输入…"
            className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none min-h-[calc(100vh-200px)]"
          />
        ) : (
          <ChecklistEditor items={items} onChange={handleItemsChange} />
        )}
      </div>

      {/* Bottom color bar */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <ColorPicker value={color} onChange={handleColorChange} />
      </div>
    </div>
  )
}
