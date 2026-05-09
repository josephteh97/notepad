import type { Note } from '../db/types'

export interface MergeResult {
  merged: Note[]
  conflictCount: number
}

/**
 * Last-write-wins merge strategy.
 * For each note that exists in both local and cloud: keep the one with newer updatedAt.
 * If "keepBoth" is enabled, the loser is kept as a conflict copy.
 */
export function mergeNotes(
  local: Note[],
  cloud: Note[],
  options: { keepBoth: boolean } = { keepBoth: false }
): MergeResult {
  const localMap = new Map(local.map((n) => [n.id!, n]))
  const cloudMap = new Map(cloud.map((n) => [n.id!, n]))
  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()])

  const merged: Note[] = []
  let conflictCount = 0

  for (const id of allIds) {
    const lNote = localMap.get(id)
    const cNote = cloudMap.get(id)

    if (!cNote) {
      // Only in local → keep
      merged.push(lNote!)
    } else if (!lNote) {
      // Only in cloud → take cloud
      merged.push(cNote)
    } else {
      // Both exist — conflict if content differs
      const isDifferent = lNote.updatedAt !== cNote.updatedAt
      if (!isDifferent) {
        merged.push(lNote)
      } else {
        conflictCount++
        const winner = lNote.updatedAt >= cNote.updatedAt ? lNote : cNote
        const loser = winner === lNote ? cNote : lNote

        merged.push(winner)

        if (options.keepBoth && loser.deletedAt == null) {
          // Save conflict copy without an id (let Dexie auto-assign)
          const copy: Note = {
            ...loser,
            id: undefined,
            title: `${loser.title || '(无标题)'} (冲突副本)`,
            isPinned: false,
            pinnedAt: null,
          }
          merged.push(copy)
        }
      }
    }
  }

  return { merged, conflictCount }
}

/**
 * Apply tombstones: remove notes that were deleted on either side
 * (tombstone wins over any local version to ensure deletions propagate).
 * Tombstones older than 30 days are pruned.
 */
export function applyTombstones(
  notes: Note[],
  tombstones: Array<{ id: number; deletedAt: number }>
): Note[] {
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const activeTombstones = tombstones.filter((t) => t.deletedAt > thirtyDaysAgo)
  const deletedIds = new Set(activeTombstones.map((t) => t.id))
  return notes.filter((n) => !deletedIds.has(n.id!))
}
