import { db, getSetting } from '../db'
import type { CloudProvider, CloudSnapshot, Tombstone } from './types'
import { mergeNotes, applyTombstones } from './conflict'
import type { AppSetting } from '../db/types'

const SNAPSHOT_FILE = 'notepad-snapshot.json'
const SCHEMA_VERSION = 1

let syncMutex = false

export interface SyncResult {
  success: boolean
  conflictCount: number
  error: string | null
}

/** Main sync function — pull, merge, push */
export async function runSync(provider: CloudProvider): Promise<SyncResult> {
  if (syncMutex) {
    console.log('[Sync] Already running, skipping')
    return { success: false, conflictCount: 0, error: 'Already syncing' }
  }
  syncMutex = true

  try {
    // 1. Build local snapshot
    const local = await buildLocalSnapshot()

    // 2. Download cloud snapshot
    const downloaded = await provider.download(SNAPSHOT_FILE)

    if (!downloaded) {
      // No cloud data → upload local
      await provider.upload(SNAPSHOT_FILE, JSON.stringify(local))
      return { success: true, conflictCount: 0, error: null }
    }

    const cloud: CloudSnapshot = JSON.parse(downloaded.content)

    // 3. If hashes match → no-op
    if (cloud.contentHash === local.contentHash) {
      return { success: true, conflictCount: 0, error: null }
    }

    // 4. Merge
    const keepBoth = (await getSetting<boolean>('conflictKeepBoth')) ?? false

    // Apply tombstones from both sides
    const allTombstones = mergeTombstones(local.tombstones, cloud.tombstones)
    const localNotes = applyTombstones(local.notes, allTombstones)
    const cloudNotes = applyTombstones(cloud.notes, allTombstones)

    const { merged: mergedNotes, conflictCount } = mergeNotes(localNotes, cloudNotes, { keepBoth })

    // Merge settings (last-write-wins at key level)
    const mergedSettings = mergeSettings(local.settings, cloud.settings)

    // 5. Apply merged result to local DB
    await db.transaction('rw', db.notes, db.settings, async () => {
      // Replace all notes
      await db.notes.clear()
      await db.notes.bulkAdd(mergedNotes)

      // Update settings
      for (const s of mergedSettings) {
        await db.settings.put(s)
      }
    })

    // 6. Build fresh snapshot and upload
    const fresh = await buildLocalSnapshot()
    await provider.upload(SNAPSHOT_FILE, JSON.stringify(fresh))

    return { success: true, conflictCount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Sync] Failed:', err)
    return { success: false, conflictCount: 0, error: message }
  } finally {
    syncMutex = false
  }
}

async function buildLocalSnapshot(): Promise<CloudSnapshot> {
  const [allNotes, allSettings] = await Promise.all([
    db.notes.toArray(),
    db.settings.toArray(),
  ])

  // Collect tombstones from soft-deleted notes
  const tombstones: Tombstone[] = allNotes
    .filter((n) => n.deletedAt != null)
    .map((n) => ({ id: n.id!, deletedAt: n.deletedAt! }))

  // Active notes only for the main array
  const activeNotes = allNotes.filter((n) => n.deletedAt == null)

  const content = JSON.stringify({ notes: activeNotes, settings: allSettings, tombstones })
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  const contentHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return {
    schemaVersion: SCHEMA_VERSION,
    contentHash,
    exportedAt: Date.now(),
    notes: activeNotes,
    settings: allSettings,
    tombstones,
  }
}

function mergeTombstones(a: Tombstone[], b: Tombstone[]): Tombstone[] {
  const map = new Map<number, Tombstone>()
  for (const t of [...a, ...b]) {
    const existing = map.get(t.id)
    // Keep earliest deletedAt (first deletion wins for sync correctness)
    if (!existing || t.deletedAt < existing.deletedAt) {
      map.set(t.id, t)
    }
  }
  return Array.from(map.values())
}

function mergeSettings(local: AppSetting[], cloud: AppSetting[]): AppSetting[] {
  const map = new Map<string, AppSetting>()
  // Cloud settings override local (object-level last-write-wins)
  for (const s of [...local, ...cloud]) {
    map.set(s.key, s)
  }
  return Array.from(map.values())
}

/** Export snapshot as JSON string (for manual backup) */
export async function exportSnapshot(provider: CloudProvider): Promise<void> {
  const snapshot = await buildLocalSnapshot()
  const filename = `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`
  await provider.upload(filename, JSON.stringify(snapshot, null, 2))
}

/** Restore from cloud — replaces all local data */
export async function restoreFromCloud(provider: CloudProvider): Promise<void> {
  const downloaded = await provider.download(SNAPSHOT_FILE)
  if (!downloaded) throw new Error('云端没有找到备份数据')

  const snapshot: CloudSnapshot = JSON.parse(downloaded.content)

  await db.transaction('rw', db.notes, db.settings, async () => {
    await db.notes.clear()
    await db.settings.clear()
    if (snapshot.notes.length) await db.notes.bulkAdd(snapshot.notes)
    if (snapshot.settings.length) await db.settings.bulkPut(snapshot.settings)
  })
}

/** Get last 5 cloud backup files (for backup history) */
export async function listBackups(provider: CloudProvider): Promise<Array<{ name: string; id: string; modifiedAt: number }>> {
  const files = await provider.list()
  return files
    .filter((f) => f.name.startsWith('notepad-'))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, 5)
}
