import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Note, SortBy } from '../db/types'

/** All non-deleted notes, sorted */
export function useAllNotes(sortBy: SortBy = 'updatedAt', search = '') {
  return useLiveQuery(async () => {
    let notes = await db.notes
      .filter((n) => n.deletedAt == null)
      .toArray()

    if (search.trim()) {
      const q = search.toLowerCase()
      notes = notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      )
    }

    return sortNotes(notes, sortBy)
  }, [sortBy, search])
}

/** Pinned notes only (not deleted) */
export function usePinnedNotes() {
  return useLiveQuery(() =>
    db.notes
      .filter((n) => n.isPinned && n.deletedAt == null)
      .toArray()
      .then((notes) => notes.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)))
  )
}

/** Notes that have a date set (for calendar view) */
export function useNotesByDate(dateMs: number | null) {
  return useLiveQuery(async (): Promise<Note[]> => {
    if (dateMs == null) return []
    // Compare by day (strip time)
    const day = new Date(dateMs)
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day.getTime() + 86_400_000)
    return db.notes
      .filter(
        (n) =>
          n.deletedAt == null &&
          n.date != null &&
          n.date >= day.getTime() &&
          n.date < nextDay.getTime()
      )
      .toArray()
  }, [dateMs])
}

/** All dates that have notes (for calendar dots) */
export function useDatesWithNotes(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const notes = await db.notes
      .filter((n) => n.deletedAt == null && n.date != null)
      .toArray()
    const set = new Set<string>()
    for (const n of notes) {
      if (n.date) {
        const d = new Date(n.date)
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      }
    }
    return set
  })
}

/** Single note by id */
export function useNote(id: number | undefined): Note | undefined {
  return useLiveQuery(() => {
    if (id == null) return undefined
    return db.notes.get(id)
  }, [id])
}

function sortNotes(notes: Note[], sortBy: SortBy): Note[] {
  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'date': {
        // Notes with an assigned date: newest first. Notes without a date sort
        // after dated ones, ordered by updatedAt as a tiebreaker.
        const ad = typeof a.date === 'number' ? a.date : null
        const bd = typeof b.date === 'number' ? b.date : null
        if (ad != null && bd != null) return bd - ad
        if (ad != null) return -1
        if (bd != null) return 1
        return b.updatedAt - a.updatedAt
      }
      case 'updatedAt':
        return b.updatedAt - a.updatedAt
      case 'createdAt':
        return b.createdAt - a.createdAt
      case 'color':
        return a.color.localeCompare(b.color)
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return b.updatedAt - a.updatedAt
    }
  })
}
