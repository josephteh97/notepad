import { Capacitor } from '@capacitor/core'
import { db, pushWidgetUpdate } from '../db'

/**
 * Reads v2 native app notes from SharedPreferences via MigrationPlugin (Kotlin)
 * and bulk-inserts them into Dexie. Runs once; subsequent launches are no-ops.
 */
export async function runV2Migration(): Promise<void> {
  // Only runs on Android (SharedPreferences is a native concept)
  if (!Capacitor.isNativePlatform()) return

  try {
    // Dynamically import the plugin — avoids import errors on web
    const { MigrationPlugin } = await import('./MigrationPlugin')

    const { value: done } = await MigrationPlugin.isDone()
    if (done) return

    const { value: json } = await MigrationPlugin.readV2Notes()
    if (!json) {
      await MigrationPlugin.markDone()
      return
    }

    const v2Notes: V2Note[] = JSON.parse(json)
    if (!v2Notes.length) {
      await MigrationPlugin.markDone()
      return
    }

    const now = Date.now()
    await db.transaction('rw', db.notes, async () => {
      for (const v2 of v2Notes) {
        await db.notes.add({
          // Preserve original id if possible, otherwise let Dexie auto-assign
          id: typeof v2.id === 'number' ? v2.id : undefined,
          title: v2.title ?? '',
          body: v2.body ?? '',
          type: 'text',
          color: mapV2Color(v2.color),
          createdAt: v2.createdAt ?? now,
          updatedAt: v2.updatedAt ?? now,
          date: parseV2Date(v2.date),
          isPinned: false,
          pinnedAt: null,
          remindAt: null,
          reminderCompletedAt: null,
          notificationId: null,
          deletedAt: null,
        })
      }
    })

    await MigrationPlugin.markDone()
    void pushWidgetUpdate()
    console.log(`[Migration] Imported ${v2Notes.length} notes from v2`)
  } catch (err) {
    // Migration failure is non-fatal — user keeps existing Dexie data
    console.warn('[Migration] Failed:', err)
  }
}

interface V2Note {
  id?: number
  title?: string
  body?: string
  createdAt?: number
  updatedAt?: number
  date?: number | string
  color?: string
  sort?: number
}

/**
 * v2 stores date as either "YYYY-MM-DD" string or timestamp number. Convert to
 * a midnight-local timestamp so calendar queries match. Non-parseable → null.
 */
function parseV2Date(d: number | string | undefined | null): number | null {
  if (d == null) return null
  if (typeof d === 'number') return d
  if (typeof d !== 'string' || !d.trim()) return null
  const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) {
    const t = Date.parse(d)
    return isNaN(t) ? null : t
  }
  const [, y, mo, day] = m
  return new Date(Number(y), Number(mo) - 1, Number(day)).getTime()
}

/**
 * One-time fix for users who migrated under the old code path that stored v2
 * date strings unmodified. Converts any string/non-number `date` field on
 * existing notes into a midnight-local timestamp. Idempotent — guarded by a
 * Dexie settings flag.
 */
export async function runDateBackfill(): Promise<void> {
  const FLAG = 'dateBackfillV1Done'
  const done = await db.settings.get(FLAG)
  if (done?.value) return

  let fixed = 0
  await db.transaction('rw', db.notes, async () => {
    const all = await db.notes.toArray()
    for (const n of all) {
      if (n.date == null) continue
      if (typeof n.date === 'number') continue
      const parsed = parseV2Date(n.date as unknown as string)
      await db.notes.update(n.id!, { date: parsed })
      fixed++
    }
  })
  await db.settings.put({ key: FLAG, value: true })
  if (fixed) console.log(`[DateBackfill] Converted ${fixed} string dates to timestamps`)
  void pushWidgetUpdate()
}

function mapV2Color(color: string | undefined): import('../db/types').NoteColor {
  if (!color) return 'default'
  const lower = color.toLowerCase()
  if (lower.includes('red')) return 'red'
  if (lower.includes('orange')) return 'orange'
  if (lower.includes('yellow') || lower.includes('ffff')) return 'yellow'
  if (lower.includes('green')) return 'green'
  if (lower.includes('blue')) return 'blue'
  if (lower.includes('purple')) return 'purple'
  if (lower.includes('pink')) return 'pink'
  return 'default'
}
