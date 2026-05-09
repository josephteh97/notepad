import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Note } from '../db/types'

export interface ReminderSections {
  overdue: Note[]
  today: Note[]
  upcoming: Note[]   // next 7 days (excluding today)
  later: Note[]      // beyond 7 days
}

export function useReminders(): ReminderSections | undefined {
  return useLiveQuery(async () => {
    const now = Date.now()
    const todayStart = startOfDay(now)
    const todayEnd = todayStart + 86_400_000
    const sevenDaysEnd = todayStart + 7 * 86_400_000

    const notes = await db.notes
      .filter((n) => n.deletedAt == null && n.remindAt != null)
      .toArray()

    // Sort completed to bottom within each section — do that at render time
    const active = notes.filter((n) => n.reminderCompletedAt == null)
    const completed = notes.filter((n) => n.reminderCompletedAt != null)

    const overdue = active.filter((n) => n.remindAt! < todayStart)
    const today = active.filter((n) => n.remindAt! >= todayStart && n.remindAt! < todayEnd)
    const upcoming = active.filter((n) => n.remindAt! >= todayEnd && n.remindAt! < sevenDaysEnd)
    const later = active.filter((n) => n.remindAt! >= sevenDaysEnd)

    // Append completed notes to the section they belong to (dimmed at bottom)
    const sortAsc = (arr: Note[]) => arr.sort((a, b) => a.remindAt! - b.remindAt!)

    return {
      overdue: [...sortAsc(overdue), ...completed.filter((n) => n.remindAt! < todayStart)],
      today: [...sortAsc(today), ...completed.filter((n) => n.remindAt! >= todayStart && n.remindAt! < todayEnd)],
      upcoming: [...sortAsc(upcoming), ...completed.filter((n) => n.remindAt! >= todayEnd && n.remindAt! < sevenDaysEnd)],
      later: [...sortAsc(later), ...completed.filter((n) => n.remindAt! >= sevenDaysEnd)],
    }
  })
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
