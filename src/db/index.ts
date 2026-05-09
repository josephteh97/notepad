import Dexie, { type Table } from 'dexie'
import type { Note, AppSetting } from './types'
import { Capacitor } from '@capacitor/core'

class NotepadDB extends Dexie {
  notes!: Table<Note, number>
  settings!: Table<AppSetting, string>

  constructor() {
    super('NotepadDB')

    // Version 1 — full v3 schema (includes all v2 fields + v3 additions)
    // No migration from v2 native app needed here — that is handled by MigrationPlugin (Kotlin)
    // which runs on first launch and bulk-inserts into this table.
    this.version(1).stores({
      notes: '++id, updatedAt, createdAt, isPinned, pinnedAt, remindAt, deletedAt, date, color',
      settings: 'key',
    })
  }
}

export const db = new NotepadDB()

// --- Note helpers ---

export async function createNote(partial: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = Date.now()
  return db.notes.add({
    ...partial,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateNote(id: number, changes: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...changes, updatedAt: Date.now() })
}

export async function deleteNote(id: number): Promise<void> {
  // Soft delete (tombstone) for cloud sync; hard delete if cloud not connected
  const cloudProvider = await getSetting<string>('cloudProvider')
  if (cloudProvider) {
    await db.notes.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })
  } else {
    await db.notes.delete(id)
  }
}

export async function hardDeleteNote(id: number): Promise<void> {
  await db.notes.delete(id)
}

/** Push top 3 notes (pinned first, then by updatedAt) to widget SharedPreferences */
export async function pushWidgetUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { WidgetPlugin } = await import('../utils/WidgetPlugin')
    const pinned = await db.notes
      .filter((n) => n.isPinned && n.deletedAt == null)
      .toArray()
      .then((notes) => notes.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)))
    const recent = await db.notes
      .filter((n) => !n.isPinned && n.deletedAt == null)
      .toArray()
      .then((notes) => notes.sort((a, b) => b.updatedAt - a.updatedAt))
    const top = [...pinned, ...recent].slice(0, 3).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.type === 'checklist'
        ? (() => { try { return JSON.parse(n.body).map((i: { text: string }) => i.text).join(', ') } catch { return n.body } })()
        : n.body,
      color: n.color,
    }))
    await WidgetPlugin.updateWidget({ notesJson: JSON.stringify(top) })
  } catch (err) {
    console.warn('[Widget] update failed:', err)
  }
}

// --- Settings helpers ---

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.settings.toArray()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}
