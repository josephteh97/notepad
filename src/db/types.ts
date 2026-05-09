export type NoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'

export type NoteType = 'text' | 'checklist'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Note {
  id?: number
  title: string
  body: string        // plain text, or JSON.stringify(ChecklistItem[]) for checklist type
  type: NoteType
  color: NoteColor
  createdAt: number   // epoch ms
  updatedAt: number
  date: number | null // user-assigned calendar date (epoch ms, midnight)

  // Phase 1 — pinned notes
  isPinned: boolean
  pinnedAt: number | null

  // Phase 2 — reminders
  remindAt: number | null
  reminderCompletedAt: number | null
  notificationId: number | null

  // Phase 3 — cloud sync tombstone
  deletedAt: number | null
}

export type SortBy = 'updatedAt' | 'createdAt' | 'color' | 'title'
export type ViewMode = 'list' | 'grid'
export type Theme = 'light' | 'dark' | 'system'

export interface AppSetting {
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}
