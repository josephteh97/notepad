import { Capacitor } from '@capacitor/core'
import { db } from '../db'

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
          date: v2.date ?? null,
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
  date?: number
  color?: string
  sort?: number
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
